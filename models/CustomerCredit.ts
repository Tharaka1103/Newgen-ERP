import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomerCredit extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  totalCredit: number; // Cumulative credit taken over time
  totalPaid: number;   // Cumulative repayments over time
  currentBalance: number; // Outstanding debt (totalCredit - totalPaid)
  lastActivityDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerCreditSchema = new Schema<ICustomerCredit>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true,
      index: true,
    },
    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: unique customer per shop by phone number
CustomerCreditSchema.index({ shop: 1, phone: 1 }, { unique: true });

export const CustomerCredit: Model<ICustomerCredit> =
  mongoose.models.CustomerCredit ||
  mongoose.model<ICustomerCredit>("CustomerCredit", CustomerCreditSchema);
