const Notification = require("../schemas/notification");
const { emitToUser, getUserRoom } = require("./socket");

function mapNotification(notification) {
  return {
    _id: notification._id,
    recipient: notification.recipient,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: notification.data || {},
    socketRoom: notification.socketRoom || "",
    isRead: notification.isRead,
    readAt: notification.readAt || null,
    sentAt: notification.sentAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

async function createAndEmitUserNotification({
  recipientId,
  title,
  message,
  type = "system",
  data = {},
}) {
  const socketRoom = getUserRoom(recipientId);
  const notification = await Notification.create({
    recipient: recipientId,
    title: title?.trim() || "Thong bao he thong",
    message: message?.trim() || "",
    type,
    data,
    socketRoom,
    sentAt: new Date(),
  });
  const payload = mapNotification(notification);

  emitToUser(recipientId, "notification:new", payload);

  return payload;
}

module.exports = {
  createAndEmitUserNotification,
  mapNotification,
};
