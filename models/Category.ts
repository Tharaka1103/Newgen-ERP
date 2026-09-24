import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  type: "EXPENSE" | "INCOME";
  colorToken: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["EXPENSE", "INCOME"],
      default: "EXPENSE",
      required: true,
    },
    colorToken: {
      type: String,
      enum: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
      default: "chart-1",
      required: true,
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

export const Category: Model<ICategory> =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
export default Category;
