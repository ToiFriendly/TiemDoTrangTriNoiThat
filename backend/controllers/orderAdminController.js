const mongoose = require("mongoose");
const Order = require("../schemas/order");
const {
  createAndEmitUserNotification,
} = require("../utils/notificationService");

function mapOrderItem(item) {
  return {
    _id: item._id,
    product: item.product
      ? {
          _id: item.product._id,
          name: item.product.name,
          slug: item.product.slug,
          images: item.product.images,
        }
      : {
          _id: item.product,
          name: item.productName,
          slug: item.productSlug,
          images: item.productImage ? [item.productImage] : [],
        },
    productName: item.productName,
    productSlug: item.productSlug,
    productImage: item.productImage,
    sku: item.sku,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    note: item.note,
  };
}

function mapAdminOrder(order) {
  return {
    _id: order._id,
    orderCode: order.orderCode,
    user: order.user
      ? {
          _id: order.user._id,
          fullName: order.user.fullName,
          username: order.user.username,
          email: order.user.email,
          phone: order.user.phone,
        }
      : null,
    paymentMethod: order.paymentMethod,
    paymentProvider: order.paymentProvider,
    paymentStatus: order.paymentStatus,
    paymentTransactionId: order.paymentTransactionId,
    paymentResponseCode: order.paymentResponseCode,
    paymentMessage: order.paymentMessage,
    orderStatus: order.orderStatus,
    shippingAddress: order.shippingAddress,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    note: order.note,
    placedAt: order.placedAt,
    paidAt: order.paidAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    items: Array.isArray(order.items) ? order.items.map(mapOrderItem) : [],
  };
}

function canApproveOrder(order) {
  if (!order) {
    return false;
  }

  if (order.orderStatus === "cancelled" || order.orderStatus === "completed") {
    return false;
  }

  return true;
}

async function listAdminOrders(_req, res, next) {
  try {
    const orders = await Order.find({ isDeleted: false })
      .populate("user", "fullName username email phone")
      .populate({
        path: "items",
        populate: {
          path: "product",
          select: "name slug images",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      orders: orders.map(mapAdminOrder),
    });
  } catch (error) {
    return next(error);
  }
}

async function approveOrder(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Don hang khong hop le.",
      });
    }

    const order = await Order.findOne({ _id: id, isDeleted: false })
      .populate("user", "fullName username email phone")
      .populate({
        path: "items",
        populate: {
          path: "product",
          select: "name slug images",
        },
      });

    if (!order) {
      return res.status(404).json({
        message: "Khong tim thay don hang.",
      });
    }

    if (!canApproveOrder(order)) {
      return res.status(409).json({
        message: "Don hang nay khong the duyet.",
        order: mapAdminOrder(order),
      });
    }

    if (order.orderStatus === "shipping") {
      return res.status(200).json({
        message: "Don hang da duoc duyet truoc do.",
        order: mapAdminOrder(order),
      });
    }

    if (order.paymentMethod === "momo" && order.paymentStatus !== "paid") {
      return res.status(409).json({
        message: "Chua the duyet don MoMo khi thanh toan chua thanh cong.",
        order: mapAdminOrder(order),
      });
    }

    order.orderStatus = "shipping";
    await order.save();

    let notification = null;

    if (order.user?._id) {
      notification = await createAndEmitUserNotification({
        recipientId: order.user._id,
        title: "Don hang da duoc duyet",
        message: `Don hang ${order.orderCode} cua ban da duoc duyet va dang giao.`,
        type: "order",
        data: {
          orderId: order._id.toString(),
          orderCode: order.orderCode,
          orderStatus: order.orderStatus,
        },
      });
    }

    return res.status(200).json({
      message: "Duyet don hang thanh cong.",
      order: mapAdminOrder(order),
      notification,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  approveOrder,
  listAdminOrders,
};
