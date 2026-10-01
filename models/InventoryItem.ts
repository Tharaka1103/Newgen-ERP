import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInventoryItem extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  name: string;
  itemCode: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  minStockThreshold: number;
  description?: string;
  location?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    itemCode: {
      type: String,
      required: [true, "Item code / SKU is required"],
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock quantity cannot be negative"],
    },
    unit: {
      type: String,
      default: "pcs",
      trim: true,
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on shop and itemCode
InventoryItemSchema.index({ shop: 1, itemCode: 1 }, { unique: true });

export const InventoryItem: Model<IInventoryItem> =
  mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>("InventoryItem", InventoryItemSchema);
