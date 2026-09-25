import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunicationItem extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  itemCode: string;
  name: string;
  actualPrice: number;
  sellingPrice?: number;
  description?: string;
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
