const mongoose = require("mongoose");
const Notification = require("../schemas/notification");
const { mapNotification } = require("../utils/notificationService");

async function listMyNotifications(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      100,
    );
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(limit);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      notifications: notifications.map(mapNotification),
      unreadCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Thong bao khong hop le.",
      });
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Khong tim thay thong bao.",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      message: "Da danh dau thong bao da doc.",
      notification: mapNotification(notification),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMyNotifications,
  markNotificationAsRead,
};
