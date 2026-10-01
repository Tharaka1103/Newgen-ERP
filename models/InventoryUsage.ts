import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInventoryUsage extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  item: mongoose.Types.ObjectId;
  quantityUsed: number;
  previousQuantity: number;
  remainingQuantity: number;
  purpose: string;
  recordedBy?: mongoose.Types.ObjectId | null;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryUsageSchema = new Schema<IInventoryUsage>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    item: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    quantityUsed: {
      type: Number,
      required: [true, "Quantity used is required"],
      min: [1, "Quantity used must be at least 1"],
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    remainingQuantity: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      required: [true, "Purpose or department is required"],
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const InventoryUsage: Model<IInventoryUsage> =
  mongoose.models.InventoryUsage ||
  mongoose.model<IInventoryUsage>("InventoryUsage", InventoryUsageSchema);
