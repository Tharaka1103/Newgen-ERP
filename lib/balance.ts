import connectDB from "./mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import mongoose from "mongoose";

/**
 * Recalculates the cumulative running balance for a shop in chronological order.
 * Triggers upon create/update/delete/approval of records.
 *
 * Algorithm:
 * - Filter out soft-deleted records (isDeleted !== true).
 * - Sort records by date ascending, then createdAt ascending.
 * - For REJECTED records: net impact is 0.
 * - For APPROVED records: net impact uses approvedAmount ?? amount.
 * - For PENDING records: net impact uses submitted amount.
 * - INCOME adds to running balance, EXPENSE subtracts.
 */
export async function recalculateShopRunningBalance(
  shopId: string | mongoose.Types.ObjectId,
  _startDate?: Date | null
): Promise<void> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const records = await FinanceRecord.find({
    shop: shopObjId,
    isDeleted: { $ne: true },
  })
    .sort({ date: 1, createdAt: 1 })
    .select("_id type status amount approvedAmount runningBalance paymentMethod");

  if (!records.length) return;

  const bulkOps = [];
  let currentBalance = 0;

  for (const record of records) {
    if (record.status === "REJECTED") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: { $set: { runningBalance: currentBalance } },
        },
      });
      continue;
    }

    // CREDIT sales do not increase shop physical cash balance;
    // only subsequent cash debt repayments enter the shop cash balance.
    if (record.paymentMethod === "CREDIT") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: { $set: { runningBalance: currentBalance } },
        },
      });
      continue;
    }

    const effectiveAmount =
      record.status === "APPROVED" && typeof record.approvedAmount === "number"
        ? record.approvedAmount
        : record.amount;

    if (record.type === "INCOME") {
      currentBalance += effectiveAmount;
    } else {
      currentBalance -= effectiveAmount;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: { runningBalance: currentBalance } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await FinanceRecord.bulkWrite(bulkOps);
  }
}

/**
 * Calculates the exact physical cash balance for a shop.
 * Excludes soft-deleted records, rejected records, and unpaid credit sales.
 * Takes into account approved amount for approved records and submitted amount for pending records.
 */
export async function getShopCashBalance(
  shopId: string | mongoose.Types.ObjectId
): Promise<number> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const balanceAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $ne: "CREDIT" },
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [
            { $and: [{ $eq: ["$status", "APPROVED"] }, { $ne: ["$approvedAmount", null] }] },
            "$approvedAmount",
            "$amount",
          ],
        },
        type: 1,
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$type", "INCOME"] },
              "$effectiveAmount",
              { $multiply: ["$effectiveAmount", -1] },
            ],
          },
        },
      },
    },
  ]);

  return balanceAgg.length > 0 ? balanceAgg[0].balance : 0;
}
