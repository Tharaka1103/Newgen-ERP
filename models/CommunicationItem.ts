import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunicationItem extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  itemCode: string;
  name: string;
  actualPrice: number;
  sellingPrice?: number;
  description?: string;
  isTelecomReload?: boolean;
  telecomOperator?: "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" | null;
  commissionRate?: number; // e.g. 4.5 for 4.5%
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationItemSchema = new Schema<ICommunicationItem>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    actualPrice: {
      type: Number,
      required: [true, "Actual cost price is required"],
      min: [0, "Actual price must be non-negative"],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, "Selling price must be non-negative"],
    },
    description: {
      type: String,
      default: "",
    },
    isTelecomReload: {
      type: Boolean,
      default: false,
      index: true,
    },
    telecomOperator: {
      type: String,
      enum: ["DIALOG", "MOBITEL", "AIRTEL", "HUTCH", "OTHER", null],
      default: null,
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: [0, "Commission rate cannot be negative"],
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

CommunicationItemSchema.index({ shop: 1, itemCode: 1 }, { unique: true });

export const CommunicationItem: Model<ICommunicationItem> =
  mongoose.models.CommunicationItem ||
  mongoose.model<ICommunicationItem>("CommunicationItem", CommunicationItemSchema);
export default CommunicationItem;
