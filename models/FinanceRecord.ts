import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFinanceRecord extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  shop?: mongoose.Types.ObjectId | null;
  category?: mongoose.Types.ObjectId | null;
  paymentMethod: "CASH" | "CREDIT" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE" | "PETTY_CASH";
  bankAccount?: mongoose.Types.ObjectId | null;
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

  // Customer Credit & Debt Repayment Fields
  customerCredit?: mongoose.Types.ObjectId | null;
  customerName?: string | null;
  customerPhone?: string | null;
  isDebtRepayment?: boolean;

  // Communication Shop Specific Fields
  isCommunicationItem?: boolean;
  communicationItem?: mongoose.Types.ObjectId | null;
  itemCode?: string | null;
  itemName?: string | null;
  quantity?: number;
  actualPrice?: number;
  sellingPrice?: number;
  discountPrice?: number;
  additionalCost?: number;
  isTelecomReload?: boolean;
  telecomOperator?: string | null;
  commissionRate?: number;
  commissionEarned?: number;
  isRelatedToBranch?: boolean;
  relatedBranch?: mongoose.Types.ObjectId | null;
  relatedBranchNote?: string;

  // Cross-Branch Payment & Inter-Branch Settlement Fields
  isCrossBranchPayment?: boolean;
  collectingShop?: mongoose.Types.ObjectId | null;
  beneficiaryShop?: mongoose.Types.ObjectId | null;
  interBranchSettlementStatus?: "UNSETTLED" | "SETTLED";
  settledAt?: Date | null;
  settledBy?: mongoose.Types.ObjectId | null;
  settlementType?: "HANDOVER_TO_BRANCH" | "DEPOSITED_TO_BANK" | "DIRECT_OFFSET" | null;
  settlementReference?: string;
  settlementNote?: string;

  // Soft Deletion & Audit Fields
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  deletionReason?: string;

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
      default: null,
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CREDIT", "BANK_TRANSFER", "CHEQUE", "ONLINE", "PETTY_CASH"],
      default: "CASH",
      required: true,
      index: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: "BankAccount",
      default: null,
      index: true,
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
      index: true,
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

    // Customer Credit & Debt Repayment Fields
    customerCredit: {
      type: Schema.Types.ObjectId,
      ref: "CustomerCredit",
      default: null,
      index: true,
    },
    customerName: {
      type: String,
      default: null,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    isDebtRepayment: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Communication Shop Fields
    isCommunicationItem: {
      type: Boolean,
      default: false,
      index: true,
    },
    communicationItem: {
      type: Schema.Types.ObjectId,
      ref: "CommunicationItem",
      default: null,
    },
    itemCode: {
      type: String,
      default: null,
      index: true,
    },
    itemName: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    actualPrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
    },
    additionalCost: {
      type: Number,
      default: 0,
    },
    isTelecomReload: {
      type: Boolean,
      default: false,
      index: true,
    },
    telecomOperator: {
      type: String,
      default: null,
    },
    commissionRate: {
      type: Number,
      default: 0,
    },
    commissionEarned: {
      type: Number,
      default: 0,
    },
    isRelatedToBranch: {
      type: Boolean,
      default: false,
    },
    relatedBranch: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    relatedBranchNote: {
      type: String,
      default: "",
    },

    // Cross-Branch Payment & Inter-Branch Settlement Fields
    isCrossBranchPayment: {
      type: Boolean,
      default: false,
      index: true,
    },
    collectingShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    beneficiaryShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
    interBranchSettlementStatus: {
      type: String,
      enum: ["UNSETTLED", "SETTLED"],
      default: "UNSETTLED",
      index: true,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    settledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    settlementType: {
      type: String,
      enum: ["HANDOVER_TO_BRANCH", "DEPOSITED_TO_BANK", "DIRECT_OFFSET"],
      default: null,
    },
    settlementReference: {
      type: String,
      default: "",
    },
    settlementNote: {
      type: String,
      default: "",
    },

    // Soft Deletion Fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletionReason: {
      type: String,
      default: "",
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
FinanceRecordSchema.index({ isDeleted: 1, date: 1 });

// Ensure schema updates (such as newly added enum values) are re-compiled
if (mongoose.models && mongoose.models.FinanceRecord) {
  delete (mongoose.models as any).FinanceRecord;
}
if ((mongoose as any).connection?.models?.FinanceRecord) {
  delete (mongoose as any).connection.models.FinanceRecord;
}

export const FinanceRecord: Model<IFinanceRecord> =
  mongoose.models.FinanceRecord ||
  mongoose.model<IFinanceRecord>("FinanceRecord", FinanceRecordSchema);
export default FinanceRecord;
