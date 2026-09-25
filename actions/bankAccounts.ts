"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { BankAccount } from "@/models/BankAccount";
import { FinanceRecord } from "@/models/FinanceRecord";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankDepositWithdrawSchema,
} from "@/schemas/bankAccount";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { Category } from "@/models/Category";
import mongoose from "mongoose";

export async function getBankAccountsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const accounts = await BankAccount.find({ isDeleted: { $ne: true } })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      accounts: JSON.parse(JSON.stringify(accounts)),
    };
  } catch (error) {
    console.error("Get bank accounts error:", error);
    return { success: false, error: "Failed to fetch bank accounts." };
  }
}

export async function getActiveBankAccountsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const accounts = await BankAccount.find({ isActive: true, isDeleted: { $ne: true } })
      .select("bankName accountName accountNumber branch currentBalance")
      .sort({ bankName: 1 })
      .lean();

    return {
      success: true,
      accounts: JSON.parse(JSON.stringify(accounts)),
    };
  } catch (error) {
    console.error("Get active bank accounts error:", error);
    return { success: false, error: "Failed to fetch active bank accounts." };
  }
}

export async function createBankAccountAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createBankAccountSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existing = await BankAccount.findOne({
      accountNumber: result.data.accountNumber.trim(),
    });

    if (existing) {
      return { success: false, error: "A bank account with this account number already exists." };
    }

    const newAccount = await BankAccount.create({
      bankName: result.data.bankName.trim(),
      accountName: result.data.accountName.trim(),
      accountNumber: result.data.accountNumber.trim(),
      branch: (result.data.branch || "").trim(),
      currentBalance: Number(result.data.initialBalance || 0),
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_BANK_ACCOUNT",
      targetType: "BankAccount",
      targetId: newAccount._id,
      metadata: {
        bankName: newAccount.bankName,
        accountNumber: newAccount.accountNumber,
        initialBalance: newAccount.currentBalance,
      },
    });

    return {
      success: true,
      account: JSON.parse(JSON.stringify(newAccount)),
      message: "Bank account created successfully",
    };
  } catch (error) {
    console.error("Create bank account error:", error);
    return { success: false, error: "Failed to create bank account." };
  }
}

export async function updateBankAccountAction(id: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateBankAccountSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const account = await BankAccount.findById(id);
    if (!account) {
      return { success: false, error: "Bank account not found." };
    }

    const previousState = {
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      branch: account.branch,
      isActive: account.isActive,
    };

    account.bankName = result.data.bankName.trim();
    account.accountName = result.data.accountName.trim();
    account.accountNumber = result.data.accountNumber.trim();
    account.branch = (result.data.branch || "").trim();
    account.isActive = result.data.isActive;

    await account.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_BANK_ACCOUNT",
      targetType: "BankAccount",
      targetId: account._id,
      metadata: {
        previousState,
        newState: result.data,
      },
    });

    return {
      success: true,
      account: JSON.parse(JSON.stringify(account)),
      message: "Bank account updated successfully",
    };
  } catch (error) {
    console.error("Update bank account error:", error);
    return { success: false, error: "Failed to update bank account." };
  }
}

export async function bankDepositWithdrawAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = bankDepositWithdrawSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const account = await BankAccount.findById(result.data.accountId);
    if (!account) {
      return { success: false, error: "Bank account not found." };
    }

    const amount = Number(result.data.amount);
    const isDeposit = result.data.type === "DEPOSIT";

    if (!isDeposit && account.currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient balance. Current balance is LKR ${account.currentBalance.toLocaleString()}`,
      };
    }

    const previousBalance = account.currentBalance;
    account.currentBalance = isDeposit
      ? account.currentBalance + amount
      : account.currentBalance - amount;

    await account.save();

    const defaultCategory = await Category.findOne({
      name: { $regex: "Bank|Deposit|Transfer|Other", $options: "i" },
    }).lean();

    const datePrefix = new Date(result.data.date).toISOString().slice(2, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bnkBillNumber = result.data.referenceNumber?.trim() || (isDeposit ? `BNK-DEP-${datePrefix}-${randomSuffix}` : `BNK-WD-${datePrefix}-${randomSuffix}`);

    await FinanceRecord.create({
      date: new Date(result.data.date),
      paymentMethod: "BANK_TRANSFER",
      bankAccount: account._id,
      billNumber: bnkBillNumber,
      category: defaultCategory?._id || null,
      reason: result.data.reason.trim(),
      amount,
      type: isDeposit ? "INCOME" : "EXPENSE",
      status: "APPROVED",
      approvedAmount: amount,
      reviewedBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedAt: new Date(),
      reviewRemarks: isDeposit ? "Direct bank deposit" : "Direct bank withdrawal",
      isLocked: false,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: isDeposit ? "BANK_DIRECT_DEPOSIT" : "BANK_DIRECT_WITHDRAWAL",
      targetType: "BankAccount",
      targetId: account._id,
      metadata: {
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        type: result.data.type,
        amount,
        previousBalance,
        newBalance: account.currentBalance,
        referenceNumber: result.data.referenceNumber || "",
        reason: result.data.reason,
        date: result.data.date,
      },
    });

    return {
      success: true,
      message: `${isDeposit ? "Deposit" : "Withdrawal"} of LKR ${amount.toLocaleString()} recorded successfully.`,
      newBalance: account.currentBalance,
    };
  } catch (error) {
    console.error("Bank deposit/withdrawal error:", error);
    return { success: false, error: "Failed to process bank transaction." };
  }
}

export async function deleteBankAccountAction(id: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const account = await BankAccount.findById(id);
    if (!account || account.isDeleted) {
      return { success: false, error: "Bank account not found or already deleted." };
    }

    const txCount = await FinanceRecord.countDocuments({
      bankAccount: account._id,
      isDeleted: { $ne: true },
    });

    // Mark as deleted (soft delete protects financial ledger history)
    account.isDeleted = true;
    account.isActive = false;
    account.deletedAt = new Date();
    account.deletedBy = new mongoose.Types.ObjectId(session.user.id);
    await account.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "DELETE_BANK_ACCOUNT",
      targetType: "BankAccount",
      targetId: account._id,
      metadata: {
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        finalBalance: account.currentBalance,
        associatedTransactions: txCount,
      },
    });

    return {
      success: true,
      message: `Bank account "${account.bankName} (${account.accountNumber})" deleted successfully.`,
    };
  } catch (error) {
    console.error("Delete bank account error:", error);
    return { success: false, error: "Failed to delete bank account." };
  }
}

interface BankAnalyticsParams {
  accountId?: string;
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}

export async function getBankAccountsSummaryAction(params: BankAnalyticsParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const now = new Date();
    let start: Date;
    let end: Date = new Date();
    end.setHours(23, 59, 59, 999);

    switch (params.period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        start = params.startDate ? new Date(params.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        if (params.endDate) {
          end = new Date(params.endDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
      case "month":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const accounts = await BankAccount.find({ isDeleted: { $ne: true } }).sort({ bankName: 1 }).lean();
    const totalBankCapital = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);

    // Fetch transactions linked to bank accounts (only active, approved ones or all)
    const txQuery: Record<string, unknown> = {
      isDeleted: { $ne: true },
      date: { $gte: start, $lte: end },
      paymentMethod: { $in: ["BANK_TRANSFER", "CHEQUE", "ONLINE"] },
    };

    if (params.accountId && params.accountId !== "ALL") {
      txQuery.bankAccount = new mongoose.Types.ObjectId(params.accountId);
    }

    const records = await FinanceRecord.find(txQuery)
      .populate("shop", "name code")
      .populate("category", "name")
      .populate("bankAccount", "bankName accountName accountNumber")
      .populate("createdBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    let periodInflow = 0;
    let periodOutflow = 0;

    for (const r of records) {
      if (r.status === "APPROVED") {
        const val = r.approvedAmount ?? r.amount;
        if (r.type === "INCOME") periodInflow += val;
        else periodOutflow += val;
      }
    }

    // Timeline data for charts
    const timelineMap: Record<string, { income: number; expense: number }> = {};
    for (const r of records) {
      if (r.status !== "APPROVED") continue;
      const dateKey = params.period === "year"
        ? `${new Date(r.date).getFullYear()}-${String(new Date(r.date).getMonth() + 1).padStart(2, "0")}`
        : new Date(r.date).toISOString().split("T")[0];

      if (!timelineMap[dateKey]) timelineMap[dateKey] = { income: 0, expense: 0 };
      const val = r.approvedAmount ?? r.amount;
      if (r.type === "INCOME") timelineMap[dateKey].income += val;
      else timelineMap[dateKey].expense += val;
    }

    const timelineData = Object.entries(timelineMap).map(([date, d]) => ({
      date,
      income: d.income,
      expense: d.expense,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      totalBankCapital,
      periodInflow,
      periodOutflow,
      accounts: JSON.parse(JSON.stringify(accounts)),
      records: JSON.parse(JSON.stringify(records)),
      timelineData,
    };
  } catch (error) {
    console.error("Bank accounts summary error:", error);
    return { success: false, error: "Failed to fetch bank accounts summary." };
  }
}
