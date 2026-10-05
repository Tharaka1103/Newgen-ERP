import connectDB from "./mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import mongoose from "mongoose";

import { getRecordExactDate, getRecordExactTimestamp } from "./dateUtils";
export { getRecordExactDate, getRecordExactTimestamp };

/**
 * Resolves whether a record is an INCOME or EXPENSE from the viewpoint of a specific shop.
 */
export function resolveShopEffectiveType(
  record: {
    type: "INCOME" | "EXPENSE" | string;
    isCommunicationItem?: boolean;
    isCrossBranchPayment?: boolean;
    beneficiaryShop?: any;
    shop?: any;
    collectingShop?: any;
  },
  targetShopId: string | mongoose.Types.ObjectId
): "INCOME" | "EXPENSE" {
  const targetIdStr = targetShopId.toString();
  const bShopId = record.beneficiaryShop?._id?.toString() || record.beneficiaryShop?.toString();
  const directShopId = record.shop?._id?.toString() || record.shop?.toString();

  // If this record was collected / executed by another branch (e.g. Communication) for the target shop
  if (bShopId === targetIdStr && directShopId !== targetIdStr) {
    // Communication sales/printing done for this branch is an EXPENSE for this branch
    if (record.isCommunicationItem) {
      return "EXPENSE";
    }
    // Class fees or payments collected at communication for this branch is an INCOME for this branch
    return "INCOME";
  }

  // Communication retail sales are always retail INCOME for the communication shop that performed them
  if (directShopId === targetIdStr && record.isCommunicationItem) {
    return "INCOME";
  }

  // Cross-branch cash collections physically received at this shop are cash INCOME for this shop's drawer
  if (directShopId === targetIdStr && record.isCrossBranchPayment) {
    return "INCOME";
  }

  return record.type === "EXPENSE" ? "EXPENSE" : "INCOME";
}

/**
 * Recalculates the cumulative running balance for a shop in chronological order.
 * Triggers upon create/update/delete/approval of records.
 * Running balance tracks the physical cash drawer of this specific shop.
 */
export async function recalculateShopRunningBalance(
  shopId: string | mongoose.Types.ObjectId,
  _startDate?: Date | null
): Promise<void> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  // Running balance represents physical cash movements at this specific shop.
  // Every transaction created at this shop enters/leaves this shop's till.
  // Cross-branch communication printing done FOR this shop also represents physical cash expense paid out of this shop's till.
  const query = {
    $or: [
      { shop: shopObjId },
      { collectingShop: shopObjId, isCrossBranchPayment: true },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    isDeleted: { $ne: true },
  };

  const rawRecords = await FinanceRecord.find(query)
    .select("_id type status amount approvedAmount runningBalance beneficiaryRunningBalance paymentMethod isCrossBranchPayment collectingShop beneficiaryShop shop isCommunicationItem interBranchSettlementStatus settlementType date createdAt")
    .lean();

  if (!rawRecords.length) return;

  // Sort strictly in chronological order by combined date and time
  const records = rawRecords.sort((a, b) => {
    return getRecordExactTimestamp(a) - getRecordExactTimestamp(b);
  });

  const bulkOps = [];
  let currentBalance = 0;

  for (const record of records) {
    const isBeneficiary = record.beneficiaryShop?.toString() === shopObjId.toString() &&
      record.shop?.toString() !== shopObjId.toString();

    // Rejected records do not affect cash drawer
    if (record.status === "REJECTED") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    // Non-cash payment methods (PETTY_CASH, BANK_TRANSFER, ONLINE, CREDIT, CHEQUE)
    // do not affect the shop's physical cash drawer
    if (record.paymentMethod && record.paymentMethod !== "CASH") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    const effectiveAmount =
      record.status === "APPROVED" && typeof record.approvedAmount === "number"
        ? record.approvedAmount
        : record.amount;

    // Cross-branch payment handling:
    if (record.isCrossBranchPayment && !record.isCommunicationItem) {
      const isCollecting =
        record.collectingShop?.toString() === shopObjId.toString() ||
        (record.shop?.toString() === shopObjId.toString() &&
          record.beneficiaryShop?.toString() !== shopObjId.toString());

      if (isCollecting) {
        // While UNSETTLED: cash physically entered the counter drawer (+effectiveAmount)
        // Once SETTLED: cash was handed over or banked, leaving the drawer.
        if (record.interBranchSettlementStatus === "UNSETTLED") {
          currentBalance += effectiveAmount;
        }
      } else if (isBeneficiary) {
        // Beneficiary branch physically receives cash ONLY when settled via handover
        if (
          record.interBranchSettlementStatus === "SETTLED" &&
          record.settlementType === "HANDOVER_TO_BRANCH"
        ) {
          currentBalance += effectiveAmount;
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    // Standard records & Communication records
    const effectiveType = resolveShopEffectiveType(record as any, shopObjId);

    if (effectiveType === "INCOME") {
      currentBalance += effectiveAmount;
    } else {
      currentBalance -= effectiveAmount;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: record._id },
        update: {
          $set: isBeneficiary
            ? { beneficiaryRunningBalance: currentBalance }
            : { runningBalance: currentBalance },
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    await FinanceRecord.bulkWrite(bulkOps);
  }
}

/**
 * Calculates the exact physical cash balance for a shop.
 * Excludes soft-deleted records, rejected records, and non-cash payment methods.
 * Correctly accounts for:
 * 1. Standard shop physical cash transactions.
 * 2. Cross-branch cash physically collected AT this shop (holding cash until settled).
 * 3. Cross-branch cash physically HANDED OVER to this shop from other collecting branches.
 * 4. Cross-branch communication printing expenses paid in cash.
 */
export async function getShopCashBalance(
  shopId: string | mongoose.Types.ObjectId,
  asOfDate?: Date | null
): Promise<number> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());
  const dateFilter = asOfDate ? { date: { $lte: asOfDate } } : {};

  // 1. Standard non-cross-branch cash transactions at this shop + Communication retail sales performed at this shop
  const standardCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        $or: [
          { isCrossBranchPayment: { $ne: true } },
          { isCommunicationItem: true },
        ],
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...dateFilter,
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
  // Includes PENDING because cash entered the till upon customer payment at the counter!
  const collectingCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "UNSETTLED",
        ...dateFilter,
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

  // 3. Cross-branch cash where this shop is the beneficiaryShop AND cash was physically HANDED OVER to this shop
  const settlementDateFilter = asOfDate
    ? {
        $or: [
          { settledAt: { $lte: asOfDate } },
          { settledAt: null, date: { $lte: asOfDate } },
        ],
      }
    : {};

  const beneficiaryHandoverAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
        ...settlementDateFilter,
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

  // 4. Cross-branch communication sales where this shop is the beneficiaryShop
  // Physical cash was paid from this shop's drawer to the communication shop (-effectiveAmount)
  const commExpenseAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        shop: { $ne: shopObjId },
        isCrossBranchPayment: true,
        isCommunicationItem: true,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...dateFilter,
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
  const commExpenseBalance = commExpenseAgg.length > 0 ? commExpenseAgg[0].balance : 0;

  return standardBalance + collectingBalance + beneficiaryBalance - commExpenseBalance;
}

/**
 * Calculates physical cash flow metrics for a specific date range:
 * - cashInflow: Total physical cash received into the drawer during the period.
 * - cashOutflow: Total physical cash disbursed from the drawer during the period.
 * - netCashFlow: Net physical cash movement (Inflow - Outflow).
 * - closingCashBalance: Cumulative drawer cash position as of the end of the period.
 */
export async function getShopPeriodCashFlow(
  shopId: string | mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  closingCashBalance: number;
}> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const periodMatch = { date: { $gte: startDate, $lte: endDate } };

  // 1. Standard cash in period
  const stdAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        $or: [
          { isCrossBranchPayment: { $ne: true } },
          { isCommunicationItem: true },
        ],
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...periodMatch,
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
        inflow: {
          $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] },
        },
        outflow: {
          $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] },
        },
      },
    },
  ]);

  // 2. Cross-branch tuition cash collected at counter in period
  const colAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...periodMatch,
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
        inflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 3. Settled cash handed over from other branches into this shop in period
  const benAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
        $or: [
          { settledAt: { $gte: startDate, $lte: endDate } },
          { settledAt: null, date: { $gte: startDate, $lte: endDate } },
        ],
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
        inflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 4. Comm expenses paid out in cash in period
  const commAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        shop: { $ne: shopObjId },
        isCrossBranchPayment: true,
        isCommunicationItem: true,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...periodMatch,
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
      },
    },
    {
      $group: {
        _id: null,
        outflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 5. Cross-branch cash settled/disbursed out of this shop in period (handed over or banked)
  const settledOutAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        interBranchSettlementStatus: "SETTLED",
        settledAt: { $gte: startDate, $lte: endDate },
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
        outflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  const stdInflow = stdAgg[0]?.inflow || 0;
  const stdOutflow = stdAgg[0]?.outflow || 0;
  const colInflow = colAgg[0]?.inflow || 0;
  const benInflow = benAgg[0]?.inflow || 0;
  const commOutflow = commAgg[0]?.outflow || 0;
  const settledOutflow = settledOutAgg[0]?.outflow || 0;

  const cashInflow = stdInflow + colInflow + benInflow;
  const cashOutflow = stdOutflow + commOutflow + settledOutflow;
  const netCashFlow = cashInflow - cashOutflow;

  const closingCashBalance = await getShopCashBalance(shopObjId, endDate);

  return {
    cashInflow,
    cashOutflow,
    netCashFlow,
    closingCashBalance,
  };
}

/**
 * Returns inter-branch balances:
 * - holdingForOthers: cash this shop physically holds that belongs to other shops (UNSETTLED).
 * - owedFromOthers: cash other shops collected for this shop that haven't been handed over yet.
 * Includes PENDING status records because physical cash is already held in the drawer!
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
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        beneficiaryShop: { $ne: null },
        isCrossBranchPayment: true,
        type: "INCOME",
        interBranchSettlementStatus: "UNSETTLED",
        status: { $ne: "REJECTED" },
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
        $or: [
          { collectingShop: { $nin: [null, shopObjId] } },
          { shop: { $ne: shopObjId }, isCrossBranchPayment: true },
        ],
        isCrossBranchPayment: true,
        type: "INCOME",
        interBranchSettlementStatus: "UNSETTLED",
        status: { $ne: "REJECTED" },
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        sourceShop: { $ifNull: ["$collectingShop", "$shop"] },
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: "$sourceShop",
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

export interface CashAuditDiagnosticResult {
  shopId: string;
  shopName: string;
  shopCode: string;
  currentDrawerBalance: number;
  latestStoredRunningBalance: number | null;
  isOutOfSync: boolean;
  discrepancyAmount: number;
  components: {
    standardCashInflow: number;
    standardCashOutflow: number;
    standardNetCash: number;
    unsettledCollectingCashHeld: number;
    settledBeneficiaryCashReceived: number;
    commCrossBranchExpensePaid: number;
  };
  paymentMethods: Array<{
    method: string;
    label: string;
    inflow: number;
    outflow: number;
    net: number;
    impactsLockerCash: boolean;
    explanation: string;
  }>;
  pendingCashCollections: Array<{
    recordId: string;
    billNumber: string;
    reason: string;
    amount: number;
    date: string;
    beneficiaryName: string;
    status: string;
  }>;
  recentCashRecords: Array<{
    recordId: string;
    date: string;
    billNumber: string;
    reason: string;
    type: string;
    amount: number;
    runningBalance: number;
    paymentMethod: string;
  }>;
}

/**
 * Diagnostic tool: Computes full cash audit information for a shop.
 * Enables admins to inspect from the frontend UI why drawer cash is calculated as such,
 * see payment method breakdowns, inspect pending collections, and detect any out-of-sync balances.
 */
export async function getShopCashAuditData(
  shopId: string | mongoose.Types.ObjectId
): Promise<CashAuditDiagnosticResult> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const shopDoc = await Shop.findById(shopObjId).select("name code").lean();
  const shopName = shopDoc?.name || "Shop";
  const shopCode = shopDoc?.code || "SHOP";

  // 1. Current real-time calculated drawer balance
  const currentDrawerBalance = await getShopCashBalance(shopObjId);

  // 2. Latest stored running balance on the most recent record
  const latestRec = await FinanceRecord.findOne({
    $or: [
      { shop: shopObjId },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    isDeleted: { $ne: true },
  })
    .sort({ date: -1, createdAt: -1 })
    .select("runningBalance beneficiaryRunningBalance beneficiaryShop shop")
    .lean();

  let latestStoredRunningBalance: number | null = null;
  if (latestRec) {
    const isBeneficiary =
      latestRec.beneficiaryShop?.toString() === shopObjId.toString() &&
      latestRec.shop?.toString() !== shopObjId.toString();
    latestStoredRunningBalance = isBeneficiary
      ? (latestRec.beneficiaryRunningBalance ?? latestRec.runningBalance ?? null)
      : (latestRec.runningBalance ?? null);
  }

  const isOutOfSync =
    latestStoredRunningBalance !== null &&
    Math.round(currentDrawerBalance * 100) !== Math.round(latestStoredRunningBalance * 100);

  const discrepancyAmount =
    latestStoredRunningBalance !== null
      ? Number((currentDrawerBalance - latestStoredRunningBalance).toFixed(2))
      : 0;

  // 3. Components breakdown
  const stdAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        $or: [
          { isCrossBranchPayment: { $ne: true } },
          { isCommunicationItem: true },
        ],
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
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
        inflow: { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] } },
        outflow: { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] } },
      },
    },
  ]);

  const colAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "UNSETTLED",
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
      $group: { _id: null, total: { $sum: "$effectiveAmount" } },
    },
  ]);

  const benAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
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
      $group: { _id: null, total: { $sum: "$effectiveAmount" } },
    },
  ]);

  const commExpAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        shop: { $ne: shopObjId },
        isCrossBranchPayment: true,
        isCommunicationItem: true,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
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
      },
    },
    {
      $group: { _id: null, total: { $sum: "$effectiveAmount" } },
    },
  ]);

  const standardCashInflow = stdAgg[0]?.inflow || 0;
  const standardCashOutflow = stdAgg[0]?.outflow || 0;
  const standardNetCash = standardCashInflow - standardCashOutflow;
  const unsettledCollectingCashHeld = colAgg[0]?.total || 0;
  const settledBeneficiaryCashReceived = benAgg[0]?.total || 0;
  const commCrossBranchExpensePaid = commExpAgg[0]?.total || 0;

  // 4. Payment method comparison for all records linked to this shop
  const pmAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
      },
    },
    {
      $project: {
        method: { $ifNull: ["$paymentMethod", "CASH"] },
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
        _id: "$method",
        inflow: { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] } },
        outflow: { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] } },
      },
    },
  ]);

  const methodMeta: Record<string, { label: string; impactsLockerCash: boolean; explanation: string }> = {
    CASH: {
      label: "Physical Cash",
      impactsLockerCash: true,
      explanation: "Physical notes & coins entering or leaving the shop till/drawer.",
    },
    PETTY_CASH: {
      label: "Petty Cash Fund",
      impactsLockerCash: false,
      explanation: "Disbursed from Central Petty Cash float. Does NOT decrease the counter cash drawer.",
    },
    BANK_TRANSFER: {
      label: "Bank Transfer",
      impactsLockerCash: false,
      explanation: "Direct bank deposit / online bank transfer. Does NOT pass through the physical drawer.",
    },
    CREDIT: {
      label: "Credit / Customer Debt",
      impactsLockerCash: false,
      explanation: "Unpaid credit sale. Cash enters the till only when the customer makes a debt repayment.",
    },
    CHEQUE: {
      label: "Bank Cheque",
      impactsLockerCash: false,
      explanation: "Deposited to bank accounts. Not in physical locker cash.",
    },
    ONLINE: {
      label: "Online Gateway",
      impactsLockerCash: false,
      explanation: "Electronic funds settled to bank accounts.",
    },
  };

  const paymentMethods = Object.keys(methodMeta).map((key) => {
    const found = pmAgg.find((p) => p._id === key);
    const inflow = found ? found.inflow : 0;
    const outflow = found ? found.outflow : 0;
    const net = inflow - outflow;
    return {
      method: key,
      label: methodMeta[key].label,
      inflow,
      outflow,
      net,
      impactsLockerCash: methodMeta[key].impactsLockerCash,
      explanation: methodMeta[key].explanation,
    };
  });

  // 5. Pending Cash Collections (Counter collections waiting for admin verification)
  const pendingRecords = await FinanceRecord.find({
    $or: [
      { collectingShop: shopObjId, isCrossBranchPayment: true },
      { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
      { shop: shopObjId, type: "INCOME" },
    ],
    paymentMethod: { $in: ["CASH", null] },
    status: "PENDING",
    isDeleted: { $ne: true },
  })
    .populate("beneficiaryShop", "name code")
    .select("billNumber reason amount date beneficiaryShop status")
    .limit(10)
    .lean();

  const pendingCashCollections = pendingRecords.map((r: any) => ({
    recordId: r._id.toString(),
    billNumber: r.billNumber || "-",
    reason: r.reason || "Tuition / Fee Payment",
    amount: r.amount || 0,
    date: r.date ? new Date(r.date).toISOString().split("T")[0] : "-",
    beneficiaryName: r.beneficiaryShop ? `${r.beneficiaryShop.name} (${r.beneficiaryShop.code})` : "This Branch",
    status: r.status,
  }));

  // 6. Recent 10 Cash records for ledger audit
  const recentRecords = await FinanceRecord.find({
    $or: [
      { shop: shopObjId },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    paymentMethod: { $in: ["CASH", null] },
    isDeleted: { $ne: true },
  })
    .sort({ date: -1, createdAt: -1 })
    .limit(10)
    .select("_id date billNumber reason type amount approvedAmount runningBalance beneficiaryRunningBalance paymentMethod beneficiaryShop shop")
    .lean();

  const recentCashRecords = recentRecords.map((r: any) => {
    const isBeneficiary =
      r.beneficiaryShop?.toString() === shopObjId.toString() &&
      r.shop?.toString() !== shopObjId.toString();
    const rb = isBeneficiary
      ? (r.beneficiaryRunningBalance ?? r.runningBalance ?? 0)
      : (r.runningBalance ?? 0);
    return {
      recordId: r._id.toString(),
      date: r.date ? new Date(r.date).toISOString().split("T")[0] : "-",
      billNumber: r.billNumber || "-",
      reason: r.reason || "-",
      type: r.type,
      amount: r.approvedAmount ?? r.amount,
      runningBalance: rb,
      paymentMethod: r.paymentMethod || "CASH",
    };
  });

  return {
    shopId: shopObjId.toString(),
    shopName,
    shopCode,
    currentDrawerBalance,
    latestStoredRunningBalance,
    isOutOfSync,
    discrepancyAmount,
    components: {
      standardCashInflow,
      standardCashOutflow,
      standardNetCash,
      unsettledCollectingCashHeld,
      settledBeneficiaryCashReceived,
      commCrossBranchExpensePaid,
    },
    paymentMethods,
    pendingCashCollections,
    recentCashRecords,
  };
}

