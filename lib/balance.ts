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
 * Correctly accounts for:
 * 1. Standard shop physical cash transactions.
 * 2. Cross-branch cash physically collected AT this shop (holding cash until settled).
 * 3. Cross-branch cash physically HANDED OVER to this shop from other collecting branches.
 */
export async function getShopCashBalance(
  shopId: string | mongoose.Types.ObjectId
): Promise<number> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  // 1. Standard non-cross-branch cash transactions at this shop
  const standardCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isCrossBranchPayment: { $ne: true },
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

  // 2. Cross-branch cash physically collected AT this shop (as collectingShop)
  // While UNSETTLED: cash physically sits in this shop's drawer (+effectiveAmount).
  // Once SETTLED: cash was handed over to beneficiary branch or deposited into bank (removed from drawer).
  const collectingCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        collectingShop: shopObjId,
        isCrossBranchPayment: true,
        isDeleted: { $ne: true },
        status: "APPROVED",
        paymentMethod: { $ne: "CREDIT" },
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
        interBranchSettlementStatus: 1,
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$interBranchSettlementStatus", "UNSETTLED"] },
              "$effectiveAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  // 3. Cross-branch cash where this shop is the beneficiaryShop AND cash was physically HANDED OVER to this shop
  const beneficiaryHandoverAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isDeleted: { $ne: true },
        status: "APPROVED",
        paymentMethod: { $ne: "CREDIT" },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  const standardBalance = standardCashAgg.length > 0 ? standardCashAgg[0].balance : 0;
  const collectingBalance = collectingCashAgg.length > 0 ? collectingCashAgg[0].balance : 0;
  const beneficiaryBalance = beneficiaryHandoverAgg.length > 0 ? beneficiaryHandoverAgg[0].balance : 0;

  return standardBalance + collectingBalance + beneficiaryBalance;
}

/**
 * Returns inter-branch balances:
 * - holdingForOthers: cash this shop physically holds that belongs to other shops (UNSETTLED).
 * - owedFromOthers: cash other shops collected for this shop that haven't been handed over yet.
 */
export async function getShopInterBranchDues(
  shopId: string | mongoose.Types.ObjectId
): Promise<{
  holdingForOthers: Array<{
    shopId: string;
    shopName: string;
    shopCode: string;
    totalAmount: number;
    count: number;
    recordIds: string[];
  }>;
  owedFromOthers: Array<{
    shopId: string;
    shopName: string;
    shopCode: string;
    totalAmount: number;
    count: number;
    recordIds: string[];
  }>;
  totalHolding: number;
  totalOwed: number;
}> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  // 1. Records where this shop collected cash on behalf of another shop (UNSETTLED)
  const holdingAgg = await FinanceRecord.aggregate([
    {
      $match: {
        collectingShop: shopObjId,
        beneficiaryShop: { $ne: null },
        isCrossBranchPayment: true,
        interBranchSettlementStatus: "UNSETTLED",
        status: "APPROVED",
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        beneficiaryShop: 1,
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: "$beneficiaryShop",
        totalAmount: { $sum: "$effectiveAmount" },
        count: { $sum: 1 },
        recordIds: { $push: { $toString: "$_id" } },
      },
    },
    {
      $lookup: {
        from: "shops",
        localField: "_id",
        foreignField: "_id",
        as: "shopDoc",
      },
    },
    {
      $unwind: { path: "$shopDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        shopId: { $toString: "$_id" },
        shopName: { $ifNull: ["$shopDoc.name", "Unknown Branch"] },
        shopCode: { $ifNull: ["$shopDoc.code", "SHOP"] },
        totalAmount: 1,
        count: 1,
        recordIds: 1,
      },
    },
  ]);

  // 2. Records where another shop collected cash for THIS shop (UNSETTLED)
  const owedAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        collectingShop: { $ne: null },
        isCrossBranchPayment: true,
        interBranchSettlementStatus: "UNSETTLED",
        status: "APPROVED",
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        collectingShop: 1,
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: "$collectingShop",
        totalAmount: { $sum: "$effectiveAmount" },
        count: { $sum: 1 },
        recordIds: { $push: { $toString: "$_id" } },
      },
    },
    {
      $lookup: {
        from: "shops",
        localField: "_id",
        foreignField: "_id",
        as: "shopDoc",
      },
    },
    {
      $unwind: { path: "$shopDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        shopId: { $toString: "$_id" },
        shopName: { $ifNull: ["$shopDoc.name", "Unknown Branch"] },
        shopCode: { $ifNull: ["$shopDoc.code", "SHOP"] },
        totalAmount: 1,
        count: 1,
        recordIds: 1,
      },
    },
  ]);

  const holdingForOthers = holdingAgg || [];
  const owedFromOthers = owedAgg || [];
  const totalHolding = holdingForOthers.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  const totalOwed = owedFromOthers.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return {
    holdingForOthers,
    owedFromOthers,
    totalHolding,
    totalOwed,
  };
}

