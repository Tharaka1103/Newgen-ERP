"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import { Category } from "@/models/Category";
import { BankAccount } from "@/models/BankAccount";
import { PettyCashAccount } from "@/models/PettyCashAccount";
import { sanitizeInput } from "@/lib/sanitize";
import {
  adminEditFinanceRecordSchema,
  adminDeleteFinanceRecordSchema,
} from "@/schemas/finance";
import { isAdmin } from "@/lib/rbac";
import { recalculateShopRunningBalance } from "@/lib/balance";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";

interface AdminTransactionsFilterParams {
  shopId?: string;
  type?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  categoryId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getAllTransactionsAdminAction(params: AdminTransactionsFilterParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    if (params.shopId && params.shopId !== "ALL") {
      query.shop = new mongoose.Types.ObjectId(params.shopId);
    }

    if (params.type && params.type !== "ALL") {
      query.type = params.type;
    }

    if (params.paymentMethod && params.paymentMethod !== "ALL") {
      query.paymentMethod = params.paymentMethod;
    }

    if (params.bankAccountId && params.bankAccountId !== "ALL") {
      query.bankAccount = new mongoose.Types.ObjectId(params.bankAccountId);
    }

    if (params.categoryId && params.categoryId !== "ALL") {
      query.category = new mongoose.Types.ObjectId(params.categoryId);
    }

    if (params.status && params.status !== "ALL") {
      query.status = params.status;
    }

    if (params.startDate || params.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (params.startDate) {
        dateFilter.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      query.date = dateFilter;
    }

    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = sanitizeInput(params.search.trim());
      query.$or = [
        { billNumber: { $regex: cleanSearch, $options: "i" } },
        { reason: { $regex: cleanSearch, $options: "i" } },
        { itemCode: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      FinanceRecord.find(query)
        .populate("shop", "name code shopType")
        .populate("category", "name type colorToken")
        .populate("bankAccount", "bankName accountName accountNumber")
        .populate("relatedBranch", "name code")
        .populate("createdBy", "name email")
        .populate("reviewedBy", "name email")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FinanceRecord.countDocuments(query),
    ]);

    return {
      success: true,
      records: JSON.parse(JSON.stringify(records)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Get all transactions admin error:", error);
    return { success: false, error: "Failed to fetch transactions." };
  }
}

export async function getFilteredTransactionsForPdfAction(params: AdminTransactionsFilterParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    let shopName = "All Branches";
    let typeLabel = "All Types";
    let paymentMethodLabel = "All Methods";
    let bankAccountLabel = "All Accounts";
    let categoryLabel = "All Categories";
    let statusLabel = "All Statuses";

    if (params.shopId && params.shopId !== "ALL") {
      query.shop = new mongoose.Types.ObjectId(params.shopId);
      const sh = await Shop.findById(params.shopId).select("name code").lean();
      if (sh) shopName = `${sh.name} (${sh.code})`;
    }

    if (params.type && params.type !== "ALL") {
      query.type = params.type;
      typeLabel = params.type;
    }

    if (params.paymentMethod && params.paymentMethod !== "ALL") {
      query.paymentMethod = params.paymentMethod;
      paymentMethodLabel = params.paymentMethod.replace(/_/g, " ");
    }

    if (params.bankAccountId && params.bankAccountId !== "ALL") {
      query.bankAccount = new mongoose.Types.ObjectId(params.bankAccountId);
      const bk = await BankAccount.findById(params.bankAccountId).select("bankName accountNumber").lean();
      if (bk) bankAccountLabel = `${bk.bankName} - ${bk.accountNumber}`;
    }

    if (params.categoryId && params.categoryId !== "ALL") {
      query.category = new mongoose.Types.ObjectId(params.categoryId);
      const cat = await Category.findById(params.categoryId).select("name").lean();
      if (cat) categoryLabel = cat.name;
    }

    if (params.status && params.status !== "ALL") {
      query.status = params.status;
      statusLabel = params.status;
    }

    let dateRangeLabel = "All Time";
    if (params.startDate || params.endDate) {
      const dateFilter: Record<string, unknown> = {};
      if (params.startDate) {
        dateFilter.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      query.date = dateFilter;
      if (params.startDate && params.endDate) {
        dateRangeLabel = `${params.startDate} to ${params.endDate}`;
      } else if (params.startDate) {
        dateRangeLabel = `From ${params.startDate}`;
      } else if (params.endDate) {
        dateRangeLabel = `Until ${params.endDate}`;
      }
    }

    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = sanitizeInput(params.search.trim());
      query.$or = [
        { billNumber: { $regex: cleanSearch, $options: "i" } },
        { reason: { $regex: cleanSearch, $options: "i" } },
        { itemCode: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    // Sort chronologically for statement ledger (oldest to newest)
    const records = await FinanceRecord.find(query)
      .populate("shop", "name code shopType")
      .populate("category", "name type colorToken")
      .populate("bankAccount", "bankName accountName accountNumber")
      .populate("relatedBranch", "name code")
      .populate("createdBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ date: 1, createdAt: 1 })
      .limit(3000)
      .lean();

    let totalIncome = 0;
    let totalExpense = 0;
    let approvedIncome = 0;
    let approvedExpense = 0;
    let runningBalance = 0;

    const enrichedRecords = records.map((r: any) => {
      const amt = r.amount || 0;
      const appAmt = typeof r.approvedAmount === "number" ? r.approvedAmount : amt;
      const effectiveAmount = r.status === "APPROVED" ? appAmt : amt;

      if (r.type === "INCOME") {
        totalIncome += amt;
        if (r.status === "APPROVED") approvedIncome += appAmt;
      } else {
        totalExpense += amt;
        if (r.status === "APPROVED") approvedExpense += appAmt;
      }

      if (r.status !== "REJECTED") {
        if (r.type === "INCOME") {
          runningBalance += effectiveAmount;
        } else {
          runningBalance -= effectiveAmount;
        }
      }

      return {
        ...r,
        currentBalance: runningBalance,
      };
    });

    const netBalance = approvedIncome - approvedExpense;

    return {
      success: true,
      records: JSON.parse(JSON.stringify(enrichedRecords)),
      totalCount: enrichedRecords.length,
      summary: {
        totalIncome,
        totalExpense,
        approvedIncome,
        approvedExpense,
        netBalance,
      },
      appliedFilters: {
        shopName,
        typeLabel,
        paymentMethodLabel,
        bankAccountLabel,
        categoryLabel,
        statusLabel,
        dateRangeLabel,
        searchQuery: params.search?.trim() || "None",
      },
    };
  } catch (error) {
    console.error("Get filtered transactions for PDF error:", error);
    return { success: false, error: "Failed to fetch statement records for PDF." };
  }
}

export async function adminEditTransactionAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = adminEditFinanceRecordSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const record = await FinanceRecord.findById(result.data.recordId);
    if (!record || record.isDeleted) {
      return { success: false, error: "Transaction record not found." };
    }

    const previousState = {
      shop: record.shop?.toString() || null,
      category: record.category?.toString() || null,
      date: record.date.toISOString().split("T")[0],
      amount: record.amount,
      type: record.type,
      paymentMethod: record.paymentMethod,
      bankAccount: record.bankAccount?.toString() || null,
      billNumber: record.billNumber,
      reason: record.reason,
      status: record.status,
      approvedAmount: record.approvedAmount,
    };

    const oldShopId = record.shop;
    const oldDate = record.date;
    const oldAmount = record.approvedAmount ?? record.amount;
    const oldStatus = record.status;
    const oldPaymentMethod = record.paymentMethod;
    const oldBankAccount = record.bankAccount;
    const oldType = record.type;

    // Apply updates
    record.shop = new mongoose.Types.ObjectId(result.data.shop);
    record.category = new mongoose.Types.ObjectId(result.data.category);
    record.date = new Date(result.data.date);
    record.amount = Number(result.data.amount);
    record.type = result.data.type;
    record.paymentMethod = result.data.paymentMethod;
    record.bankAccount = result.data.bankAccount ? new mongoose.Types.ObjectId(result.data.bankAccount) : null;
    record.billNumber = result.data.billNumber.trim();
    record.reason = result.data.reason.trim();
    record.status = result.data.status;
    record.approvedAmount = result.data.status === "APPROVED"
      ? (result.data.approvedAmount !== undefined && result.data.approvedAmount !== null ? Number(result.data.approvedAmount) : Number(result.data.amount))
      : null;

    await record.save();

    // Rebalance affected shops
    if (oldShopId) {
      await recalculateShopRunningBalance(oldShopId, oldDate < record.date ? oldDate : record.date);
    }
    if (record.shop && (!oldShopId || oldShopId.toString() !== record.shop.toString())) {
      await recalculateShopRunningBalance(record.shop, record.date);
    }

    // Rebalance Petty cash if involved
    const newAmount = record.approvedAmount ?? record.amount;
    const pettyCashAccount = await PettyCashAccount.findOne();
    if (pettyCashAccount) {
      // Reverse old if was approved petty cash
      if (oldStatus === "APPROVED" && oldPaymentMethod === "PETTY_CASH") {
        if (oldType === "EXPENSE") pettyCashAccount.currentBalance += oldAmount;
        else pettyCashAccount.currentBalance -= oldAmount;
      }
      // Apply new if approved petty cash
      if (record.status === "APPROVED" && record.paymentMethod === "PETTY_CASH") {
        if (record.type === "EXPENSE") pettyCashAccount.currentBalance -= newAmount;
        else pettyCashAccount.currentBalance += newAmount;
      }
      await pettyCashAccount.save();
    }

    // Rebalance Bank if involved
    if (oldStatus === "APPROVED" && oldBankAccount) {
      const oldBank = await BankAccount.findById(oldBankAccount);
      if (oldBank) {
        if (oldType === "INCOME") oldBank.currentBalance -= oldAmount;
        else oldBank.currentBalance += oldAmount;
        await oldBank.save();
      }
    }
    if (record.status === "APPROVED" && record.bankAccount) {
      const newBank = await BankAccount.findById(record.bankAccount);
      if (newBank) {
        if (record.type === "INCOME") newBank.currentBalance += newAmount;
        else newBank.currentBalance -= newAmount;
        await newBank.save();
      }
    }

    // Write audit log
    await logAuditEvent({
      actorId: session.user.id,
      action: "ADMIN_EDIT_TRANSACTION",
      targetType: "FinanceRecord",
      targetId: record._id,
      metadata: {
        billNumber: record.billNumber,
        editReason: result.data.editReason,
        previousState,
        newState: result.data,
      },
    });

    return { success: true, message: `Transaction ${record.billNumber} updated successfully.` };
  } catch (error) {
    console.error("Admin edit transaction error:", error);
    return { success: false, error: "Failed to update transaction." };
  }
}

export async function adminDeleteTransactionAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = adminDeleteFinanceRecordSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const record = await FinanceRecord.findById(result.data.recordId);
    if (!record || record.isDeleted) {
      return { success: false, error: "Transaction record not found or already deleted." };
    }

    const previousState = {
      billNumber: record.billNumber,
      amount: record.amount,
      approvedAmount: record.approvedAmount,
      status: record.status,
      type: record.type,
      paymentMethod: record.paymentMethod,
      bankAccount: record.bankAccount?.toString() || null,
      shop: record.shop?.toString() || null,
      date: record.date,
      reason: record.reason,
    };

    const effectiveAmount = record.approvedAmount ?? record.amount;

    // Soft delete
    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = new mongoose.Types.ObjectId(session.user.id);
    record.deletionReason = result.data.deletionReason.trim();
    await record.save();

    // Recalculate shop running balance
    if (record.shop) {
      await recalculateShopRunningBalance(record.shop, record.date);
    }

    // Rebalance Petty cash if was approved
    if (record.status === "APPROVED" && record.paymentMethod === "PETTY_CASH") {
      const pettyCash = await PettyCashAccount.findOne();
      if (pettyCash) {
        if (record.type === "EXPENSE") pettyCash.currentBalance += effectiveAmount;
        else pettyCash.currentBalance -= effectiveAmount;
        await pettyCash.save();
      }
    }

    // Rebalance Bank if was approved
    if (record.status === "APPROVED" && record.bankAccount) {
      const bank = await BankAccount.findById(record.bankAccount);
      if (bank) {
        if (record.type === "INCOME") bank.currentBalance -= effectiveAmount;
        else bank.currentBalance += effectiveAmount;
        await bank.save();
      }
    }

    // Write audit log
    await logAuditEvent({
      actorId: session.user.id,
      action: "ADMIN_DELETE_TRANSACTION",
      targetType: "FinanceRecord",
      targetId: record._id,
      metadata: {
        billNumber: record.billNumber,
        deletionReason: result.data.deletionReason,
        previousState,
      },
    });

    return { success: true, message: `Transaction ${record.billNumber} has been safely deleted and balances updated.` };
  } catch (error) {
    console.error("Admin delete transaction error:", error);
    return { success: false, error: "Failed to delete transaction." };
  }
}

export async function adminGetBulkDeleteEligibleCountAction(params: AdminTransactionsFilterParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();

    const OCT_01_2026 = new Date("2026-10-01T00:00:00.000Z");

    const query: Record<string, unknown> = {};

    const dateFilter: Record<string, unknown> = {
      $lt: OCT_01_2026,
    };

    if (params.startDate) {
      dateFilter.$gte = new Date(params.startDate);
    }

    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      if (end < OCT_01_2026) {
        dateFilter.$lte = end;
      }
    }

    query.date = dateFilter;

    if (params.shopId && params.shopId !== "ALL") {
      query.shop = new mongoose.Types.ObjectId(params.shopId);
    }
    if (params.type && params.type !== "ALL") {
      query.type = params.type;
    }
    if (params.paymentMethod && params.paymentMethod !== "ALL") {
      query.paymentMethod = params.paymentMethod;
    }
    if (params.bankAccountId && params.bankAccountId !== "ALL") {
      query.bankAccount = new mongoose.Types.ObjectId(params.bankAccountId);
    }
    if (params.categoryId && params.categoryId !== "ALL") {
      query.category = new mongoose.Types.ObjectId(params.categoryId);
    }
    if (params.status && params.status !== "ALL") {
      query.status = params.status;
    }
    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = sanitizeInput(params.search.trim());
      query.$or = [
        { billNumber: { $regex: cleanSearch, $options: "i" } },
        { reason: { $regex: cleanSearch, $options: "i" } },
        { itemCode: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const count = await FinanceRecord.countDocuments(query);
    return { success: true, count };
  } catch (error) {
    console.error("Get bulk delete eligible count error:", error);
    return { success: false, error: "Failed to count eligible records." };
  }
}

export async function adminBulkPermanentDeleteTransactionsAction(params: {
  shopId?: string;
  type?: string;
  paymentMethod?: string;
  bankAccountId?: string;
  categoryId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  confirmationPhrase: string;
}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (params.confirmationPhrase !== "PERMANENT DELETE") {
    return { success: false, error: 'Confirmation phrase mismatch. Please enter "PERMANENT DELETE".' };
  }

  try {
    await connectDB();

    // STRICT SAFETY RULE:
    // Only records strictly prior to October 01, 2026 can be deleted.
    // Records on or after October 01, 2026 are protected and cannot be deleted.
    const OCT_01_2026 = new Date("2026-10-01T00:00:00.000Z");

    const query: Record<string, unknown> = {};

    const dateFilter: Record<string, unknown> = {
      $lt: OCT_01_2026,
    };

    if (params.startDate) {
      dateFilter.$gte = new Date(params.startDate);
    }

    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      if (end < OCT_01_2026) {
        dateFilter.$lte = end;
      }
    }

    query.date = dateFilter;

    if (params.shopId && params.shopId !== "ALL") {
      query.shop = new mongoose.Types.ObjectId(params.shopId);
    }
    if (params.type && params.type !== "ALL") {
      query.type = params.type;
    }
    if (params.paymentMethod && params.paymentMethod !== "ALL") {
      query.paymentMethod = params.paymentMethod;
    }
    if (params.bankAccountId && params.bankAccountId !== "ALL") {
      query.bankAccount = new mongoose.Types.ObjectId(params.bankAccountId);
    }
    if (params.categoryId && params.categoryId !== "ALL") {
      query.category = new mongoose.Types.ObjectId(params.categoryId);
    }
    if (params.status && params.status !== "ALL") {
      query.status = params.status;
    }
    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = sanitizeInput(params.search.trim());
      query.$or = [
        { billNumber: { $regex: cleanSearch, $options: "i" } },
        { reason: { $regex: cleanSearch, $options: "i" } },
        { itemCode: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    // Find affected records first to capture affected shops and earliest date
    const recordsToDelete = await FinanceRecord.find(query)
      .select("_id shop date billNumber")
      .lean();

    if (recordsToDelete.length === 0) {
      return {
        success: false,
        error: "No eligible records found matching the filter (dated prior to October 01, 2026).",
      };
    }

    const shopEarliestDates = new Map<string, Date>();
    for (const r of recordsToDelete) {
      if (r.shop) {
        const sId = r.shop.toString();
        const existing = shopEarliestDates.get(sId);
        const rDate = new Date(r.date);
        if (!existing || rDate < existing) {
          shopEarliestDates.set(sId, rDate);
        }
      }
    }

    // Execute HARD permanent delete
    const deleteResult = await FinanceRecord.deleteMany(query);

    // Reconcile and recalculate shop running balances
    for (const [sId, earliestDate] of shopEarliestDates.entries()) {
      try {
        await recalculateShopRunningBalance(new mongoose.Types.ObjectId(sId), earliestDate);
      } catch (balErr) {
        console.error(`Failed to recalculate balance for shop ${sId}:`, balErr);
      }
    }

    // Write audit event
    await logAuditEvent({
      actorId: session.user.id,
      action: "ADMIN_BULK_PERMANENT_DELETE",
      targetType: "FinanceRecord",
      targetId: new mongoose.Types.ObjectId(),
      metadata: {
        deletedCount: deleteResult.deletedCount,
        queryDateFilter: dateFilter,
        affectedShopsCount: shopEarliestDates.size,
      },
    });

    return {
      success: true,
      deletedCount: deleteResult.deletedCount,
      message: `Successfully permanently deleted ${deleteResult.deletedCount} transaction records prior to October 01, 2026. Shop running balances recalculated.`,
    };
  } catch (error) {
    console.error("Bulk permanent delete error:", error);
    return { success: false, error: "Failed to permanently delete records." };
  }
}

