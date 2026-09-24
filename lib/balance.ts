import connectDB from "./mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import mongoose from "mongoose";

/**
 * Recalculates the cumulative running balance for a shop in chronological order.
 * Triggers upon create/update/delete/approval of records.
 *
 * Algorithm:
 * - Sort records by date ascending, then createdAt ascending.
 * - For REJECTED records: net impact is 0.
 * - For APPROVED records: net impact uses approvedAmount ?? amount.
 * - For PENDING records: net impact uses submitted amount.
 * - INCOME adds to running balance, EXPENSE subtracts.
 */
export async function recalculateShopRunningBalance(
  shopId: string | mongoose.Types.ObjectId,
  startDate?: Date | null
): Promise<void> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  let initialBalance = 0;

  // If a startDate is specified, find the running balance of the record immediately preceding startDate
  if (startDate) {
    const previousRecord = await FinanceRecord.findOne({
      shop: shopObjId,
      $or: [
        { date: { $lt: startDate } },
        { date: startDate, createdAt: { $lt: new Date() } },
      ],
    })
      .sort({ date: -1, createdAt: -1 })
      .select("runningBalance")
      .lean();

    if (previousRecord) {
      initialBalance = previousRecord.runningBalance || 0;
    }
  }

  const query: Record<string, unknown> = { shop: shopObjId };
  if (startDate) {
    query.date = { $gte: startDate };
  }

  const records = await FinanceRecord.find(query)
    .sort({ date: 1, createdAt: 1 })
    .select("_id type status amount approvedAmount runningBalance");

  if (!records.length) return;

  const bulkOps = [];
  let currentBalance = initialBalance;

  for (const record of records) {
    if (record.status === "REJECTED") {
      // Rejected transactions have zero impact on the cash ledger balance
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
