import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDailySettlement extends Document {
  _id: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  date: Date;
  totalCashBefore: number;
  retainedFloat: number;
  transferAmount: number;
  destinationType: "PETTY_CASH" | "BANK_ACCOUNT";
  bankAccount?: mongoose.Types.ObjectId | null;
  financeRecord?: mongoose.Types.ObjectId | null;
  destinationFinanceRecord?: mongoose.Types.ObjectId | null;
  reference?: string;
  note?: string;
  settledBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DailySettlementSchema = new Schema<IDailySettlement>(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    totalCashBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    retainedFloat: {
      type: Number,
      required: true,
      default: 4000,
      min: 0,
    },
    transferAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    destinationType: {
      type: String,
      enum: ["PETTY_CASH", "BANK_ACCOUNT"],
      required: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
    },
    financeRecord: {
      type: Schema.Types.ObjectId,
      ref: "FinanceRecord",
      default: null,
    },
    destinationFinanceRecord: {
      type: Schema.Types.ObjectId,
      ref: "FinanceRecord",
      default: null,
    },
    reference: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying shop settlements by date
DailySettlementSchema.index({ shop: 1, date: -1 });

export const DailySettlement: Model<IDailySettlement> =
  mongoose.models.DailySettlement ||
  mongoose.model<IDailySettlement>("DailySettlement", DailySettlementSchema);

export default DailySettlement;
