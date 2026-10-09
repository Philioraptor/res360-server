import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      required: false,
    },

    menuItemId: {
      type: String,
      default: null,
    },

    name: {
      type: String,
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      default: "Veg",
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    customerName: {
      type: String,
      default: "Walk-in Customer",
    },

    orderType: {
      type: String,
      default: "dine-in",
    },

    paymentMethod: {
      type: String,
      default: "Cash",
    },

    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    table: {
      type: String,
      default: "Takeaway",
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Preparing",
        "Served",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    total: {
      type: Number,
      required: true,
      default: 0,
    },

    itemsCount: {
      type: Number,
      default: 0,
    },

    items: [orderItemSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual("id").get(function () {
  return this.orderId;
});

const Order = mongoose.model("Order", orderSchema);

export default Order;