import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFinanceRecord extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  shop: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";
  billNumber: string;
  reason: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedAmount?: number | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewRemarks?: string | null;
  runningBalance: number;
  isLocked: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FinanceRecordSchema = new Schema<IFinanceRecord>(
  {
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BANK_TRANSFER", "CHEQUE", "ONLINE"],
      default: "CASH",
      required: true,
    },
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      required: [true, "Reason/Description is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount must be positive"],
    },
    type: {
      type: String,
      enum: ["EXPENSE", "INCOME"],
      default: "EXPENSE",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    approvedAmount: {
      type: Number,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewRemarks: {
      type: String,
      default: null,
    },
    runningBalance: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for chronological query & balance calculation per shop
FinanceRecordSchema.index({ shop: 1, date: 1, createdAt: 1 });

export const FinanceRecord: Model<IFinanceRecord> =
  mongoose.models.FinanceRecord ||
  mongoose.model<IFinanceRecord>("FinanceRecord", FinanceRecordSchema);
export default FinanceRecord;
