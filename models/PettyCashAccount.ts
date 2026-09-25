import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPettyCashAccount extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  currentBalance: number;
  initialFloat: number;
  description?: string;
  lastTopUpAt?: Date | null;
  lastTopUpAmount?: number;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PettyCashAccountSchema = new Schema<IPettyCashAccount>(
  {
    name: {
      type: String,
      default: "Central Petty Cash Fund",
      required: true,
      trim: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    initialFloat: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "Organization-wide Central Petty Cash Account",
    },
    lastTopUpAt: {
      type: Date,
      default: null,
    },
    lastTopUpAmount: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PettyCashAccount: Model<IPettyCashAccount> =
  mongoose.models.PettyCashAccount ||
  mongoose.model<IPettyCashAccount>("PettyCashAccount", PettyCashAccountSchema);
export default PettyCashAccount;
