const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isReadByAdmin: {
      type: Boolean,
      default: false,
    },
    readByAdminAt: Date,
    isReadByCustomer: {
      type: Boolean,
      default: false,
    },
    readByCustomerAt: Date,
  },
  {
    timestamps: true,
  },
);

chatMessageSchema.index({ customer: 1, createdAt: -1 });
chatMessageSchema.index({ customer: 1, senderRole: 1, isReadByAdmin: 1 });
chatMessageSchema.index({ customer: 1, senderRole: 1, isReadByCustomer: 1 });

module.exports = mongoose.model("chat_message", chatMessageSchema);
