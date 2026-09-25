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
