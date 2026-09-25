"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { PettyCashAccount } from "@/models/PettyCashAccount";
import { BankAccount } from "@/models/BankAccount";
import { FinanceRecord } from "@/models/FinanceRecord";
import { sanitizeInput } from "@/lib/sanitize";
import { pettyCashTransactionSchema } from "@/schemas/pettyCash";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { Category } from "@/models/Category";
import mongoose from "mongoose";

async function getOrCreatePettyCashAccount() {
  let account = await PettyCashAccount.findOne();
  if (!account) {
    account = await PettyCashAccount.create({
      name: "Central Petty Cash Fund",
      currentBalance: 0,
      initialFloat: 0,
    });
  }
  return account;
}

interface PettyCashSummaryParams {
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}

export async function getPettyCashSummaryAction(params: PettyCashSummaryParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const account = await getOrCreatePettyCashAccount();

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

    const records = await FinanceRecord.find({
      paymentMethod: "PETTY_CASH",
      isDeleted: { $ne: true },
      date: { $gte: start, $lte: end },
    })
      .populate("shop", "name code")
      .populate("category", "name")
      .populate("createdBy", "name email")
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
      account: JSON.parse(JSON.stringify(account)),
      periodInflow,
      periodOutflow,
      records: JSON.parse(JSON.stringify(records)),
      timelineData,
    };
  } catch (error) {
    console.error("Petty cash summary error:", error);
    return { success: false, error: "Failed to fetch petty cash summary." };
  }
}

export async function topUpWithdrawPettyCashAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = pettyCashTransactionSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const account = await getOrCreatePettyCashAccount();
    const amount = Number(result.data.amount);
    const isTopUp = result.data.type === "TOP_UP";

    if (!isTopUp && account.currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient petty cash balance. Current float is LKR ${account.currentBalance.toLocaleString()}`,
      };
    }
    const defaultCategory = await Category.findOne({
      name: { $regex: "Bank|Deposit|Transfer|Other", $options: "i" },
    }).lean();

    let sourceBankInfo = "";
    let bankDoc: any = null;
    if (result.data.sourceBankAccount) {
      const bank = await BankAccount.findById(result.data.sourceBankAccount);
      if (bank) {
        bankDoc = bank;
        if (isTopUp) {
          if (bank.currentBalance < amount) {
            return {
              success: false,
              error: `Insufficient funds in source bank account (${bank.bankName}). Available: LKR ${bank.currentBalance.toLocaleString()}`,
            };
          }
          bank.currentBalance -= amount;
          await bank.save();
          sourceBankInfo = `Transferred from ${bank.bankName} (${bank.accountNumber})`;
        } else {
          // If withdrawing from petty cash into bank
          bank.currentBalance += amount;
          await bank.save();
          sourceBankInfo = `Deposited into ${bank.bankName} (${bank.accountNumber})`;
        }
      }
    }

    const previousBalance = account.currentBalance;
    account.currentBalance = isTopUp
      ? account.currentBalance + amount
      : account.currentBalance - amount;

    if (isTopUp) {
      account.lastTopUpAt = new Date(result.data.date);
      account.lastTopUpAmount = amount;
    }
    account.updatedBy = new mongoose.Types.ObjectId(session.user.id);
    await account.save();

    // 1. Create FinanceRecord for Petty Cash Account
    const datePrefix = new Date(result.data.date).toISOString().slice(2, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const pcBillNumber = isTopUp ? `PC-TOP-${datePrefix}-${randomSuffix}` : `PC-WD-${datePrefix}-${randomSuffix}`;
    const pcReason = sourceBankInfo
      ? `${result.data.reason.trim()} (${sourceBankInfo})`
      : result.data.reason.trim();

    await FinanceRecord.create({
      date: new Date(result.data.date),
      paymentMethod: "PETTY_CASH",
      billNumber: pcBillNumber,
      category: defaultCategory?._id || null,
      reason: pcReason,
      amount,
      type: isTopUp ? "INCOME" : "EXPENSE",
      status: "APPROVED",
      approvedAmount: amount,
      reviewedBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedAt: new Date(),
      reviewRemarks: isTopUp ? "System approved petty cash top-up" : "System approved petty cash withdrawal",
      isLocked: false,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    // 2. If a bank account is involved, create the corresponding FinanceRecord for the Bank Account
    if (bankDoc) {
      const bankBillNumber = isTopUp
        ? `BNK-TRF-${datePrefix}-${randomSuffix}`
        : `BNK-DEP-${datePrefix}-${randomSuffix}`;
      const bankReason = isTopUp
        ? `Transfer to Central Petty Cash: ${result.data.reason.trim()}`
        : `Deposit from Central Petty Cash: ${result.data.reason.trim()}`;

      await FinanceRecord.create({
        date: new Date(result.data.date),
        paymentMethod: "BANK_TRANSFER",
        bankAccount: bankDoc._id,
        category: defaultCategory?._id || null,
        billNumber: bankBillNumber,
        reason: bankReason,
        amount,
        type: isTopUp ? "EXPENSE" : "INCOME",
        status: "APPROVED",
        approvedAmount: amount,
        reviewedBy: new mongoose.Types.ObjectId(session.user.id),
        reviewedAt: new Date(),
        reviewRemarks: isTopUp
          ? "System approved bank transfer to petty cash"
          : "System approved deposit from petty cash",
        isLocked: false,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      });
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: isTopUp ? "PETTY_CASH_TOPUP" : "PETTY_CASH_WITHDRAWAL",
      targetType: "PettyCashAccount",
      targetId: account._id,
      metadata: {
        type: result.data.type,
        amount,
        previousBalance,
        newBalance: account.currentBalance,
        reason: result.data.reason,
        date: result.data.date,
        sourceBankInfo,
        bankAccountId: bankDoc?._id?.toString(),
      },
    });

    return {
      success: true,
      message: `Petty cash ${isTopUp ? "top-up" : "withdrawal"} of LKR ${amount.toLocaleString()} completed successfully.`,
      newBalance: account.currentBalance,
    };
  } catch (error) {
    console.error("Petty cash top-up/withdrawal error:", error);
    return { success: false, error: "Failed to process petty cash transaction." };
  }
}
