"use server";

import connectDB from "@/lib/mongodb";
import { CustomerCredit } from "@/models/CustomerCredit";
import { CreditTransaction } from "@/models/CreditTransaction";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Category } from "@/models/Category";
import { BankAccount } from "@/models/BankAccount";
import { Shop } from "@/models/Shop";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/rbac";
import { recalculateShopRunningBalance } from "@/lib/balance";
import { logAuditEvent } from "@/lib/audit";
import { repayCustomerDebtSchema, RepayCustomerDebtInput } from "@/schemas/finance";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

/**
 * Quick search for a credit customer by phone number.
 */
export async function searchCreditCustomerAction(phone: string, shopId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!phone || phone.trim().length < 3) {
    return { success: true, customer: null };
  }

  try {
    await connectDB();
    const cleanPhone = phone.trim();

    const query: Record<string, unknown> = {
      phone: { $regex: cleanPhone, $options: "i" },
    };
    if (shopId) {
      query.shop = new mongoose.Types.ObjectId(shopId);
    }

    const customer = await CustomerCredit.findOne(query).lean();
    if (!customer) {
      return { success: true, customer: null };
    }

    const result = {
      success: true,
      customer: {
        _id: customer._id.toString(),
        name: customer.name,
        phone: customer.phone,
        totalCredit: customer.totalCredit,
        totalPaid: customer.totalPaid,
        currentBalance: customer.currentBalance,
        lastActivityDate: customer.lastActivityDate?.toISOString(),
      },
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Search credit customer error:", error);
    return { success: false, error: "Failed to search customer." };
  }
}

/**
 * Records a debt repayment from a customer.
 * Deducts the amount from customer debt, records an income finance entry,
 * and updates shop cash balance or bank account.
 */
export async function repayCustomerDebtAction(payload: RepayCustomerDebtInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "STAFF" && !isAdmin(session.user as any)) {
    return { success: false, error: "Only assigned staff can record debt repayments." };
  }

  const parsed = repayCustomerDebtSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { shopId, customerCreditId, amount, paymentMethod, bankAccountId, note } = parsed.data;

  try {
    await connectDB();

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) {
      return { success: false, error: "Invalid or inactive branch." };
    }

    const customer = await CustomerCredit.findById(customerCreditId);
    if (!customer) {
      return { success: false, error: "Customer credit account not found." };
    }

    if (customer.currentBalance <= 0) {
      return { success: false, error: "This customer has zero outstanding debt." };
    }

    if (amount > customer.currentBalance) {
      return {
        success: false,
        error: `Repayment amount (LKR ${amount.toLocaleString()}) cannot exceed outstanding debt (LKR ${customer.currentBalance.toLocaleString()}).`,
      };
    }

    // Find or create "Customer Debt Repayment" category
    let category = await Category.findOne({
      name: { $regex: /^customer debt repayment$/i },
      type: "INCOME",
      isActive: true,
    });
    if (!category) {
      category = await Category.findOne({
        name: { $regex: /^debt repayment|^credit settlement/i },
        type: "INCOME",
        isActive: true,
      });
    }
    if (!category) {
      category = await Category.create({
        name: "Customer Debt Repayment",
        description: "Repayment of customer credit debt from communication sales",
        type: "INCOME",
        colorToken: "chart-2",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      });
    }

    // Generate Bill Number
    const count = await FinanceRecord.countDocuments({
      shop: shop._id,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const billNumber = `REC-${shop.code}-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    // Create Finance Record for the repayment
    const record = await FinanceRecord.create({
      shop: shop._id,
      category: category._id,
      date: new Date(),
      billNumber,
      amount,
      type: "INCOME",
      paymentMethod,
      bankAccount: paymentMethod === "BANK_TRANSFER" && bankAccountId ? new mongoose.Types.ObjectId(bankAccountId) : null,
      reason: `Debt Repayment from ${customer.name} (${customer.phone})${note ? ` - ${note.trim()}` : ""}`,
      status: "APPROVED",
      approvedAmount: amount,
      isLocked: true,
      runningBalance: 0,
      customerCredit: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      isDebtRepayment: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedAt: new Date(),
      reviewRemarks: "Auto-approved customer debt repayment",
    });

    // Update Customer Credit Account
    customer.totalPaid += amount;
    customer.currentBalance = Math.max(0, customer.currentBalance - amount);
    customer.lastActivityDate = new Date();
    await customer.save();

    // Create Credit Transaction
    await CreditTransaction.create({
      customerCredit: customer._id,
      shop: shop._id,
      type: "REPAYMENT",
      amount,
      paymentMethod,
      bankAccount: paymentMethod === "BANK_TRANSFER" && bankAccountId ? new mongoose.Types.ObjectId(bankAccountId) : null,
      financeRecord: record._id,
      billNumber,
      note: note ? note.trim() : "Debt repayment",
      recordedBy: new mongoose.Types.ObjectId(session.user.id),
      date: new Date(),
    });

    // Update balances
    if (paymentMethod === "CASH") {
      await recalculateShopRunningBalance(shop._id, new Date());
    } else if (paymentMethod === "BANK_TRANSFER" && bankAccountId) {
      const bank = await BankAccount.findById(bankAccountId);
      if (bank) {
        bank.currentBalance += amount;
        await bank.save();
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: "REPAY_CUSTOMER_DEBT",
      targetType: "CustomerCredit",
      targetId: customer._id,
      metadata: {
        shopId: shop._id.toString(),
        customerName: customer.name,
        customerPhone: customer.phone,
        repaymentAmount: amount,
        remainingDebt: customer.currentBalance,
        billNumber,
        paymentMethod,
      },
    });

    revalidatePath("/dashboard/staff/finances");
    revalidatePath(`/dashboard/admin/shops/${shopId}`);
    revalidatePath("/dashboard/admin/shops");

    return {
      success: true,
      message: `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} received from ${customer.name}. Remaining balance: LKR ${customer.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      currentBalance: customer.currentBalance,
    };
  } catch (error) {
    console.error("Repay customer debt error:", error);
    return { success: false, error: "Failed to record debt repayment." };
  }
}

/**
 * Returns all credit customers and debt statistics for a communication shop.
 */
export async function getShopCreditCustomersAction(shopId: string, search?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    const query: Record<string, unknown> = {
      shop: shopObjId,
    };

    if (search && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { name: { $regex: clean, $options: "i" } },
        { phone: { $regex: clean, $options: "i" } },
      ];
    }

    const customers = await CustomerCredit.find(query)
      .sort({ currentBalance: -1, lastActivityDate: -1 })
      .lean();

    // Summary stats
    const allCustomers = await CustomerCredit.find({ shop: shopObjId }).select("totalCredit totalPaid currentBalance").lean();
    let totalCreditIssued = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let debtorCount = 0;

    for (const c of allCustomers) {
      totalCreditIssued += c.totalCredit || 0;
      totalPaid += c.totalPaid || 0;
      totalOutstanding += c.currentBalance || 0;
      if (c.currentBalance > 0) {
        debtorCount++;
      }
    }

    const result = {
      success: true,
      customers: customers.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        phone: c.phone,
        totalCredit: c.totalCredit,
        totalPaid: c.totalPaid,
        currentBalance: c.currentBalance,
        lastActivityDate: c.lastActivityDate?.toISOString(),
        notes: c.notes || "",
        createdAt: c.createdAt?.toISOString(),
      })),
      stats: {
        totalCreditIssued,
        totalPaid,
        totalOutstanding,
        debtorCount,
      },
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Get shop credit customers error:", error);
    return { success: false, error: "Failed to fetch credit customers." };
  }
}

/**
 * Returns statement details and transaction history for a single credit customer.
 */
export async function getCustomerCreditStatementAction(customerId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const custObjId = new mongoose.Types.ObjectId(customerId);

    const customer = await CustomerCredit.findById(custObjId)
      .populate("shop", "name code")
      .lean();

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const transactions = await CreditTransaction.find({ customerCredit: custObjId })
      .sort({ date: -1, createdAt: -1 })
      .populate("recordedBy", "name")
    const shopData = customer.shop
      ? {
          _id: (customer.shop as any)._id?.toString() || "",
          name: (customer.shop as any).name || "",
          code: (customer.shop as any).code || "",
        }
      : null;

    const result = {
      success: true,
      customer: {
        _id: customer._id.toString(),
        name: customer.name,
        phone: customer.phone,
        totalCredit: customer.totalCredit,
        totalPaid: customer.totalPaid,
        currentBalance: customer.currentBalance,
        lastActivityDate: customer.lastActivityDate ? new Date(customer.lastActivityDate).toISOString() : null,
        notes: customer.notes || "",
        shop: shopData,
      },
      transactions: transactions.map((t: any) => ({
        _id: t._id.toString(),
        type: t.type,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        billNumber: t.billNumber || "",
        note: t.note || "",
        date: t.date ? new Date(t.date).toISOString() : null,
        recordedBy: t.recordedBy?.name || "System",
        bankAccount: t.bankAccount ? `${t.bankAccount.bankName} (${t.bankAccount.accountNumber})` : null,
      })),
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Get customer credit statement error:", error);
    return { success: false, error: "Failed to load customer statement." };
  }
}
