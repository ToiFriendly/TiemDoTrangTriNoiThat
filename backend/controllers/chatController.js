const mongoose = require("mongoose");
const ChatMessage = require("../schemas/chatMessage");
const User = require("../schemas/user");
const { emitToAdmins, emitToUser } = require("../utils/socket");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit, 10);

  if (Number.isNaN(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function normalizeText(rawValue) {
  return typeof rawValue === "string" ? rawValue.trim() : "";
}

function mapUserPreview(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id,
    fullName: user.fullName || "",
    username: user.username || "",
    role: user.role || "",
  };
}

function toObjectIdString(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return "";
}

function mapMessage(message) {
  const customerValue =
    message.customer && typeof message.customer === "object" && message.customer._id
      ? message.customer._id
      : message.customer;

  return {
    _id: message._id,
    customerId: toObjectIdString(customerValue),
    sender: mapUserPreview(message.sender),
    senderRole: message.senderRole,
    content: message.content,
    isReadByAdmin: Boolean(message.isReadByAdmin),
    isReadByCustomer: Boolean(message.isReadByCustomer),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function ensureActiveAdminExists() {
  return User.exists({
    role: "admin",
    isDeleted: false,
    status: "active",
  });
}

async function listCustomerMessages(req, res, next) {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Chi nguoi dung moi co the truy cap cuoc tro chuyen nay.",
      });
    }

    const limit = parseLimit(req.query.limit);
    const customerId = req.user._id;
    const unreadCount = await ChatMessage.countDocuments({
      customer: customerId,
      senderRole: "admin",
      isReadByCustomer: false,
    });
    const messages = await ChatMessage.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "_id fullName username role");

    await ChatMessage.updateMany(
      {
        customer: customerId,
        senderRole: "admin",
        isReadByCustomer: false,
      },
      {
        $set: {
          isReadByCustomer: true,
          readByCustomerAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      unreadCount,
      messages: messages.reverse().map(mapMessage),
    });
  } catch (error) {
    return next(error);
  }
}

async function createCustomerMessage(req, res, next) {
  try {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Chi nguoi dung moi co the gui tin nhan o day.",
      });
    }

    const content = normalizeText(req.body?.content);

    if (!content) {
      return res.status(400).json({
        message: "Noi dung tin nhan khong duoc de trong.",
      });
    }

    const hasAdmin = await ensureActiveAdminExists();

    if (!hasAdmin) {
      return res.status(503).json({
        message: "He thong chua co admin dang hoat dong de tiep nhan tin nhan.",
      });
    }

    const message = await ChatMessage.create({
      customer: req.user._id,
      sender: req.user._id,
      senderRole: "customer",
      content,
      isReadByAdmin: false,
      isReadByCustomer: true,
      readByCustomerAt: new Date(),
    });
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      "sender",
      "_id fullName username role",
    );
    const payload = mapMessage(populatedMessage);

    emitToUser(req.user._id, "chat:message:new", payload);
    emitToAdmins("chat:message:new", payload);

    return res.status(201).json({
      message: payload,
    });
  } catch (error) {
    return next(error);
  }
}

async function listAdminConversations(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Chi admin moi co quyen truy cap danh sach hoi thoai.",
      });
    }

    const conversationStats = await ChatMessage.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$customer",
          lastMessageId: { $first: "$_id" },
          lastMessageContent: { $first: "$content" },
          lastMessageAt: { $first: "$createdAt" },
          lastSenderRole: { $first: "$senderRole" },
          unreadCountForAdmin: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$senderRole", "customer"] },
                    { $eq: ["$isReadByAdmin", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
    const customerIds = conversationStats.map((item) => item._id);
    const customers = await User.find({
      _id: { $in: customerIds },
      role: "customer",
      isDeleted: false,
    })
      .select("_id fullName username email createdAt status")
      .lean();
    const statsMap = new Map(
      conversationStats.map((item) => [String(item._id), item]),
    );
    const conversations = customers.map((customer) => {
      const stats = statsMap.get(String(customer._id));

      return {
        customer: {
          _id: customer._id,
          fullName: customer.fullName || "",
          username: customer.username || "",
          email: customer.email || "",
          status: customer.status || "",
          createdAt: customer.createdAt,
        },
        lastMessage: stats
          ? {
              _id: stats.lastMessageId,
              content: stats.lastMessageContent,
              senderRole: stats.lastSenderRole,
              createdAt: stats.lastMessageAt,
            }
          : null,
        unreadCountForAdmin: stats?.unreadCountForAdmin || 0,
      };
    }).filter((conversation) => Boolean(conversation.lastMessage));

    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (
        new Date(b.customer.createdAt).getTime() -
        new Date(a.customer.createdAt).getTime()
      );
    });

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    return next(error);
  }
}

async function listAdminMessagesByCustomer(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Chi admin moi co quyen truy cap hoi thoai nay.",
      });
    }

    const { customerId } = req.params;

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        message: "Nguoi dung khong hop le.",
      });
    }

    const customer = await User.findOne({
      _id: customerId,
      role: "customer",
      isDeleted: false,
    }).select("_id fullName username email status createdAt");

    if (!customer) {
      return res.status(404).json({
        message: "Khong tim thay nguoi dung.",
      });
    }

    const hasConversation = await ChatMessage.exists({
      customer: customerId,
    });

    if (!hasConversation) {
      return res.status(404).json({
        message: "Nguoi dung nay chua bat dau hoi thoai.",
      });
    }

    const limit = parseLimit(req.query.limit);
    const unreadCountForAdmin = await ChatMessage.countDocuments({
      customer: customerId,
      senderRole: "customer",
      isReadByAdmin: false,
    });
    const messages = await ChatMessage.find({
      customer: customerId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "_id fullName username role");

    await ChatMessage.updateMany(
      {
        customer: customerId,
        senderRole: "customer",
        isReadByAdmin: false,
      },
      {
        $set: {
          isReadByAdmin: true,
          readByAdminAt: new Date(),
        },
      },
    );

    return res.status(200).json({
      customer: {
        _id: customer._id,
        fullName: customer.fullName || "",
        username: customer.username || "",
        email: customer.email || "",
        status: customer.status || "",
        createdAt: customer.createdAt,
      },
      unreadCountForAdmin,
      messages: messages.reverse().map(mapMessage),
    });
  } catch (error) {
    return next(error);
  }
}

async function createAdminMessage(req, res, next) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Chi admin moi co quyen gui tin nhan o day.",
      });
    }

    const customerId = normalizeText(req.body?.customerId);
    const content = normalizeText(req.body?.content);

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        message: "Nguoi dung khong hop le.",
      });
    }

    if (!content) {
      return res.status(400).json({
        message: "Noi dung tin nhan khong duoc de trong.",
      });
    }

    const customer = await User.findOne({
      _id: customerId,
      role: "customer",
      isDeleted: false,
    }).select("_id");

    if (!customer) {
      return res.status(404).json({
        message: "Khong tim thay nguoi dung de gui tin nhan.",
      });
    }

    const hasConversation = await ChatMessage.exists({
      customer: customer._id,
    });

    if (!hasConversation) {
      return res.status(403).json({
        message: "Admin chi co the tra loi sau khi user da chu dong nhan tin.",
      });
    }

    const message = await ChatMessage.create({
      customer: customer._id,
      sender: req.user._id,
      senderRole: "admin",
      content,
      isReadByAdmin: true,
      readByAdminAt: new Date(),
      isReadByCustomer: false,
    });
    const populatedMessage = await ChatMessage.findById(message._id).populate(
      "sender",
      "_id fullName username role",
    );
    const payload = mapMessage(populatedMessage);

    emitToUser(customer._id, "chat:message:new", payload);
    emitToAdmins("chat:message:new", payload);

    return res.status(201).json({
      message: payload,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAdminMessage,
  createCustomerMessage,
  listAdminConversations,
  listAdminMessagesByCustomer,
  listCustomerMessages,
};
