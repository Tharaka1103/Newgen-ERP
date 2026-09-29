import mongoose, { Schema, Document, Model } from "mongoose";

export interface IItemWastage extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  communicationItem: mongoose.Types.ObjectId;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitBasePrice: number;
  totalLoss: number;
  reason?: string;
  reportedBy: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ItemWastageSchema = new Schema<IItemWastage>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },
    communicationItem: {
      type: Schema.Types.ObjectId,
      ref: "CommunicationItem",
      required: [true, "Communication item is required"],
      index: true,
    },
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitBasePrice: {
      type: Number,
      required: [true, "Unit base price is required"],
      min: [0, "Base price must be non-negative"],
    },
    totalLoss: {
      type: Number,
      required: [true, "Total loss is required"],
      min: [0, "Total loss must be non-negative"],
    },
    reason: {
      type: String,
      default: "Damaged / Misprinted during operations",
      trim: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter user ID is required"],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ItemWastageSchema.index({ shop: 1, date: -1 });

export const ItemWastage: Model<IItemWastage> =
  mongoose.models.ItemWastage ||
  mongoose.model<IItemWastage>("ItemWastage", ItemWastageSchema);
export default ItemWastage;
