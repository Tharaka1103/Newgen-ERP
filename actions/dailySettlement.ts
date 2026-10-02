"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { isAdmin } from "@/lib/rbac";
import { sanitizeInput } from "@/lib/sanitize";
import { logAuditEvent } from "@/lib/audit";
import { Shop } from "@/models/Shop";
import { BankAccount } from "@/models/BankAccount";
import { PettyCashAccount } from "@/models/PettyCashAccount";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Category } from "@/models/Category";
import { DailySettlement } from "@/models/DailySettlement";
import { getShopCashBalance, recalculateShopRunningBalance } from "@/lib/balance";
import { recordDailySettlementSchema } from "@/schemas/dailySettlement";
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

export async function getDailySettlementHistoryAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return { success: false, error: "Invalid shop ID" };
    }

    const shop = await Shop.findById(shopId).select("name code type").lean();
    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    // 1. Current physical cash in drawer for this shop
    const currentCashBalance = await getShopCashBalance(shopId);

    // 2. Fetch active bank accounts
    const bankAccounts = await BankAccount.find({
      isActive: true,
      isDeleted: { $ne: true },
    })
      .select("_id bankName accountName accountNumber branch currentBalance")
      .sort({ bankName: 1 })
      .lean();

    // 3. Fetch settlement history for this shop
    const settlements = await DailySettlement.find({ shop: shopId })
      .populate("bankAccount", "bankName accountName accountNumber")
      .populate("settledBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    // 4. Summaries
    let totalSettled = 0;
    let totalToPettyCash = 0;
    let totalToBank = 0;

    for (const s of settlements) {
      totalSettled += s.transferAmount || 0;
      if (s.destinationType === "PETTY_CASH") {
        totalToPettyCash += s.transferAmount || 0;
      } else {
        totalToBank += s.transferAmount || 0;
      }
    }

    const defaultRetainedFloat = 4000;
    const suggestedTransferAmount = Math.max(0, currentCashBalance - defaultRetainedFloat);

    return {
      success: true,
      shop: JSON.parse(JSON.stringify(shop)),
      currentCashBalance,
      defaultRetainedFloat,
      suggestedTransferAmount,
      bankAccounts: JSON.parse(JSON.stringify(bankAccounts)),
      settlements: JSON.parse(JSON.stringify(settlements)),
      summary: {
        totalSettled,
        totalToPettyCash,
        totalToBank,
        settlementCount: settlements.length,
        lastSettlementDate: settlements[0]?.date || null,
      },
    };
  } catch (error) {
    console.error("Error in getDailySettlementHistoryAction:", error);
    return { success: false, error: "Failed to load daily settlement history." };
  }
}

export async function recordDailyCashSettlementAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = recordDailySettlementSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  const {
    shopId,
    date,
    totalCashBefore,
    retainedFloat,
    transferAmount,
    destinationType,
    bankAccountId,
    reference,
    note,
  } = result.data;

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return { success: false, error: "Invalid shop ID" };
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return { success: false, error: "Shop not found" };
    }

    // Verify current cash balance
    const actualCashBalance = await getShopCashBalance(shopId);
    if (actualCashBalance < transferAmount) {
      return {
        success: false,
        error: `Insufficient cash in drawer. Current balance is LKR ${actualCashBalance.toLocaleString()}, but trying to transfer LKR ${transferAmount.toLocaleString()}.`,
      };
    }

    let bankDoc: any = null;
    if (destinationType === "BANK_ACCOUNT") {
      if (!bankAccountId || !mongoose.Types.ObjectId.isValid(bankAccountId)) {
        return { success: false, error: "Please select a valid destination bank account" };
      }
      bankDoc = await BankAccount.findById(bankAccountId);
      if (!bankDoc || !bankDoc.isActive || bankDoc.isDeleted) {
        return { success: false, error: "Selected bank account is invalid or inactive" };
      }
    }

    const settlementDate = new Date(date);
    const dateFormatted = settlementDate.toISOString().split("T")[0];
    const generatedRef = reference?.trim() || `SETTLE-${Date.now().toString().slice(-6)}`;

    // Optional category lookup
    const transferCat = await Category.findOne({
      name: { $regex: "Transfer|Settlement|Petty Cash|Bank", $options: "i" },
    }).lean();

    // 1. Credit the destination
    let destFinanceRecordId: mongoose.Types.ObjectId | null = null;

    if (destinationType === "PETTY_CASH") {
      const pettyCash = await getOrCreatePettyCashAccount();
      pettyCash.currentBalance += transferAmount;
      await pettyCash.save();

      const pettyRecord = await FinanceRecord.create({
        date: settlementDate,
        shop: shop._id,
        category: transferCat?._id || null,
        paymentMethod: "PETTY_CASH",
        billNumber: `PC-${generatedRef}`,
        reason: `Daily Cash Float Settlement from ${shop.name} (Retained Float: LKR ${retainedFloat.toLocaleString()})`,
        amount: transferAmount,
        approvedAmount: transferAmount,
        type: "INCOME",
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewRemarks: `Auto-recorded daily settlement float sweep from ${shop.name}`,
        createdBy: session.user.id,
      });
      destFinanceRecordId = pettyRecord._id;
    } else if (destinationType === "BANK_ACCOUNT" && bankDoc) {
      bankDoc.currentBalance += transferAmount;
      await bankDoc.save();

      const bankRecord = await FinanceRecord.create({
        date: settlementDate,
        shop: shop._id,
        bankAccount: bankDoc._id,
        category: transferCat?._id || null,
        paymentMethod: "BANK_TRANSFER",
        billNumber: `DEP-${generatedRef}`,
        reason: `Daily Cash Float Settlement from ${shop.name} to ${bankDoc.bankName} (${bankDoc.accountNumber})`,
        amount: transferAmount,
        approvedAmount: transferAmount,
        type: "INCOME",
        status: "APPROVED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewRemarks: `Auto-recorded daily settlement deposit from ${shop.name}`,
        createdBy: session.user.id,
      });
      destFinanceRecordId = bankRecord._id;
    }

    // 2. Debit the shop's physical cash drawer
    const destName = destinationType === "PETTY_CASH"
      ? "Central Petty Cash"
      : `${bankDoc.bankName} (${bankDoc.accountNumber})`;

    const shopExpenseRecord = await FinanceRecord.create({
      date: settlementDate,
      shop: shop._id,
      category: transferCat?._id || null,
      paymentMethod: "CASH",
      billNumber: generatedRef,
      reason: `Daily Cash Float Settlement - Retained Float: LKR ${retainedFloat.toLocaleString()} | Swept to ${destName}${note ? ` | Note: ${note}` : ""}`,
      amount: transferAmount,
      approvedAmount: transferAmount,
      type: "EXPENSE",
      status: "APPROVED",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewRemarks: `Auto-recorded daily settlement sweep to ${destName}`,
      createdBy: session.user.id,
    });

    // 3. Create DailySettlement record
    const dailySettlement = await DailySettlement.create({
      shop: shop._id,
      date: settlementDate,
      totalCashBefore: actualCashBalance,
      retainedFloat,
      transferAmount,
      destinationType,
      bankAccount: bankDoc ? bankDoc._id : null,
      financeRecord: shopExpenseRecord._id,
      destinationFinanceRecord: destFinanceRecordId,
      reference: generatedRef,
      note: note || "",
      settledBy: session.user.id,
    });

    // 4. Recalculate shop running balance
    await recalculateShopRunningBalance(shop._id);

    // 5. Audit Log
    await logAuditEvent({
      action: "DAILY_CASH_SETTLEMENT",
      actorId: session.user.id,
      targetType: "DailySettlement",
      targetId: dailySettlement._id,
      metadata: {
        shopId: shop._id.toString(),
        shopName: shop.name,
        totalCashBefore: actualCashBalance,
        retainedFloat,
        transferAmount,
        destinationType,
        destinationName: destName,
        reference: generatedRef,
      },
    });

    return {
      success: true,
      message: `Successfully settled LKR ${transferAmount.toLocaleString()} to ${destName}. Retained float in drawer is LKR ${retainedFloat.toLocaleString()}.`,
    };
  } catch (error) {
    console.error("Error recording daily settlement:", error);
    return { success: false, error: "Failed to record daily cash settlement." };
  }
}
