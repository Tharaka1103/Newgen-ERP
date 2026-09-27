import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICreditTransaction extends Document {
  _id: mongoose.Types.ObjectId;
  customerCredit: mongoose.Types.ObjectId;
  shop: mongoose.Types.ObjectId;
  type: "CREDIT_SALE" | "REPAYMENT";
  amount: number;
  paymentMethod: "CASH" | "CREDIT" | "BANK_TRANSFER" | "ONLINE" | "CHEQUE";
  bankAccount?: mongoose.Types.ObjectId | null;
  financeRecord?: mongoose.Types.ObjectId | null;
  billNumber?: string;
  note?: string;
  recordedBy: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    customerCredit: {
      type: Schema.Types.ObjectId,
      ref: "CustomerCredit",
      required: [true, "Customer Credit account is required"],
      index: true,
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: [true, "Shop is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["CREDIT_SALE", "REPAYMENT"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CREDIT", "BANK_TRANSFER", "ONLINE", "CHEQUE"],
      default: "CREDIT",
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
      index: true,
    },
    billNumber: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

export const CreditTransaction: Model<ICreditTransaction> =
  mongoose.models.CreditTransaction ||
  mongoose.model<ICreditTransaction>("CreditTransaction", CreditTransactionSchema);
