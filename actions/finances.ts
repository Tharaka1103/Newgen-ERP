"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import { BankAccount } from "@/models/BankAccount";
import { PettyCashAccount } from "@/models/PettyCashAccount";
import { CustomerCredit } from "@/models/CustomerCredit";
import { CreditTransaction } from "@/models/CreditTransaction";
import { CommunicationItem } from "@/models/CommunicationItem";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createFinanceRecordSchema,
  updateFinanceRecordSchema,
  reviewFinanceRecordSchema,
  settleInterBranchCashSchema,
} from "@/schemas/finance";
import { canCreateFinanceRecord, canReviewFinanceRecord, isAdmin } from "@/lib/rbac";
import { recalculateShopRunningBalance, getShopInterBranchDues } from "@/lib/balance";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

interface GetFinanceRecordsParams {
  shopId?: string;
  categoryId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getFinanceRecordsAction(params: GetFinanceRecordsParams = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  const userShop = (session.user as { shop?: string }).shop;

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    // RBAC: Staff can strictly ONLY view their assigned shop's records
    if (role === "STAFF") {
      const dbUser = await User.findById(session.user.id).select("shop shops").lean();
      const activeShopId = dbUser?.shop ? dbUser.shop.toString() : userShop;

      if (!activeShopId) {
        return {
          success: true,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          unassignedStaff: true,
        };
      }
      query.shop = new mongoose.Types.ObjectId(activeShopId);
    } else {
      // Verifier and Admin can filter by any shop
      if (params.shopId && params.shopId !== "ALL") {
        query.shop = new mongoose.Types.ObjectId(params.shopId);
      }
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
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      FinanceRecord.find(query)
        .populate("shop", "name code shopType")
        .populate("category", "name type colorToken")
        .populate("bankAccount", "bankName accountName accountNumber")
        .populate("relatedBranch", "name code")
        .populate("collectingShop", "name code shopType")
        .populate("beneficiaryShop", "name code shopType")
        .populate("createdBy", "name email")
        .populate("reviewedBy", "name email")
        .populate("settledBy", "name email")
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
      unassignedStaff: false,
    };
  } catch (error) {
    console.error("Get finance records error:", error);
    return { success: false, error: "Failed to fetch finance records." };
  }
}

export async function getSuggestedBillNumberAction(shopId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  const targetShopId = role === "STAFF" ? (session.user as { shop?: string }).shop : shopId;

  if (!targetShopId) {
    return { success: false, error: "Shop is required to generate bill number" };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(targetShopId).select("code").lean();
    if (!shop) return { success: false, error: "Shop not found" };

    const count = await FinanceRecord.countDocuments({ shop: shop._id });
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sequence = String(count + 1).padStart(4, "0");

    const billNumber = `${shop.code}-${yearMonth}-${sequence}`;

    return { success: true, billNumber };
  } catch (error) {
    console.error("Bill number suggestion error:", error);
    return { success: false, error: "Failed to suggest bill number" };
  }
}

export async function createFinanceRecordAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  const userShop = (session.user as { shop?: string }).shop;

  if (!canCreateFinanceRecord(session.user as any)) {
    return {
      success: false,
      error: "You are not authorized to create records or have no assigned branch.",
    };
  }

  const cleanData = sanitizeInput(formData);
  const result = createFinanceRecordSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    // If STAFF, strictly resolve active or assigned shop
    let shopId: string | undefined = result.data.shop;
    if (role === "STAFF") {
      const dbUser = await User.findById(session.user.id).select("shop shops").lean();
      const currentActiveShop = dbUser?.shop ? dbUser.shop.toString() : userShop;
      const assignedIds = (dbUser?.shops || []).map((s: any) => s.toString());
      if (currentActiveShop) assignedIds.push(currentActiveShop);

      if (result.data.shop && assignedIds.includes(result.data.shop)) {
        shopId = result.data.shop;
      } else {
        shopId = currentActiveShop;
      }
    }

    if (!shopId) {
      return { success: false, error: "Please select or switch to an assigned branch." };
    }

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) {
      return { success: false, error: "Invalid or inactive shop." };
    }

    const category = await Category.findById(result.data.category);
    if (!category || !category.isActive) {
      return { success: false, error: "Invalid or inactive category." };
    }

    const recordDate = new Date(result.data.date);
    const isCommShop = shop.shopType === "COMMUNICATION";
    const isCrossBranch = Boolean(result.data.isCrossBranchPayment);
    const isBranchRelated = Boolean(result.data.isRelatedToBranch) || isCrossBranch;

    const beneficiaryShopId = isCrossBranch && result.data.beneficiaryShop
      ? new mongoose.Types.ObjectId(result.data.beneficiaryShop)
      : (result.data.relatedBranch ? new mongoose.Types.ObjectId(result.data.relatedBranch) : null);

    // Business Rule:
    // Transactions related to another branch or cross-branch payments ALWAYS require Verifier/Admin approval.
    // Non-branch related communication retail sales are auto-approved immediately.
    let recordStatus: "PENDING" | "APPROVED" = "PENDING";
    let approvedAmount: number | null = null;
    let isLocked = false;

    if (isCommShop && !isBranchRelated && !isCrossBranch && result.data.isCommunicationItem && result.data.type !== "EXPENSE") {
      recordStatus = "APPROVED";
      approvedAmount = result.data.amount;
      isLocked = true;
    }

    const bankAccountId = result.data.bankAccount
      ? new mongoose.Types.ObjectId(result.data.bankAccount)
      : null;

    const relatedBranchId = result.data.relatedBranch
      ? new mongoose.Types.ObjectId(result.data.relatedBranch)
      : (beneficiaryShopId || null);

    const newRecord = await FinanceRecord.create({
      date: recordDate,
      shop: shop._id,
      category: category._id,
      paymentMethod: result.data.paymentMethod,
      bankAccount: bankAccountId,
      billNumber: result.data.billNumber.trim(),
      reason: result.data.reason.trim(),
      amount: result.data.amount,
      type: result.data.type || category.type,
      status: recordStatus,
      approvedAmount,
      runningBalance: 0,
      isLocked,

      // Cross-Branch Payment & Inter-Branch Settlement Fields
      isCrossBranchPayment: isCrossBranch,
      collectingShop: isCrossBranch ? shop._id : null,
      beneficiaryShop: isCrossBranch ? beneficiaryShopId : null,
      interBranchSettlementStatus: isCrossBranch ? "UNSETTLED" : undefined,

      // Communication fields
      isCommunicationItem: Boolean(result.data.isCommunicationItem),
      communicationItem: result.data.communicationItem ? new mongoose.Types.ObjectId(result.data.communicationItem) : null,
      itemCode: result.data.itemCode ? result.data.itemCode.trim().toUpperCase() : null,
      itemName: result.data.itemName ? result.data.itemName.trim() : null,
      quantity: Number(result.data.quantity || 1),
      actualPrice: Number(result.data.actualPrice || 0),
      sellingPrice: Number(result.data.sellingPrice || 0),
      discountPrice: Number(result.data.discountPrice || 0),
      isRelatedToBranch: isBranchRelated,
      relatedBranch: relatedBranchId,
      relatedBranchNote: result.data.relatedBranchNote || "",

      isDeleted: false,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    // If auto-approved, update Petty Cash or Bank Account immediately
    if (recordStatus === "APPROVED") {
      if (result.data.paymentMethod === "PETTY_CASH") {
        const pettyCash = await PettyCashAccount.findOne();
        if (pettyCash) {
          if (newRecord.type === "EXPENSE") pettyCash.currentBalance -= result.data.amount;
          else pettyCash.currentBalance += result.data.amount;
          await pettyCash.save();
        }
      } else if (bankAccountId) {
        const bank = await BankAccount.findById(bankAccountId);
        if (bank) {
          if (newRecord.type === "INCOME") bank.currentBalance += result.data.amount;
          else bank.currentBalance -= result.data.amount;
          await bank.save();
        }
      }
    }

    // Recalculate shop sequential running balance
    await recalculateShopRunningBalance(shop._id, recordDate);

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_RECORD",
      targetType: "FinanceRecord",
      targetId: newRecord._id,
      metadata: {
        billNumber: newRecord.billNumber,
        amount: newRecord.amount,
        shop: shop.name,
        paymentMethod: newRecord.paymentMethod,
        autoApproved: recordStatus === "APPROVED",
      },
    });

    return {
      success: true,
      message: recordStatus === "APPROVED"
        ? "Transaction finalized successfully"
        : "Finance record submitted successfully for verification",
      recordId: newRecord._id.toString(),
    };
  } catch (error) {
    console.error("Create finance record error:", error);
    return { success: false, error: "Failed to create finance record." };
  }
}

export async function updateFinanceRecordAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  const cleanData = sanitizeInput(formData);
  const result = updateFinanceRecordSchema.safeParse(cleanData);

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
      return { success: false, error: "Record not found." };
    }

    // Staff can only edit PENDING records they created OR communication records not yet reviewed by a verifier
    if (role === "STAFF") {
      if (record.createdBy.toString() !== session.user.id) {
        return { success: false, error: "You can only edit records you created." };
      }
      const isCommEditable = record.isCommunicationItem && !record.reviewedBy;
      if (!isCommEditable && (record.status !== "PENDING" || record.isLocked)) {
        return {
          success: false,
          error: "This record has already been reviewed and locked. Editing is restricted.",
        };
      }
    } else if (role !== "ADMIN") {
      return { success: false, error: "Finance Verifiers cannot edit records directly." };
    }

    const previousAmount = record.amount;
    const previousDate = record.date;

    record.date = new Date(result.data.date);
    record.category = new mongoose.Types.ObjectId(result.data.category);
    record.paymentMethod = result.data.paymentMethod;
    if (result.data.bankAccount) {
      record.bankAccount = new mongoose.Types.ObjectId(result.data.bankAccount);
    } else {
      record.bankAccount = null;
    }
    record.billNumber = result.data.billNumber.trim();
    record.reason = result.data.reason.trim();
    record.amount = result.data.amount;
    record.type = result.data.type;

    // Update Communication fields
    if (result.data.isCommunicationItem !== undefined) {
      record.isCommunicationItem = Boolean(result.data.isCommunicationItem);
    }
    if (result.data.itemName !== undefined) {
      record.itemName = result.data.itemName ? result.data.itemName.trim() : null;
    }
    if (result.data.itemCode !== undefined) {
      record.itemCode = result.data.itemCode ? result.data.itemCode.trim().toUpperCase() : null;
    }
    if (result.data.quantity !== undefined) {
      record.quantity = Number(result.data.quantity || 1);
    }
    if (result.data.actualPrice !== undefined) {
      record.actualPrice = Number(result.data.actualPrice || 0);
    }
    if (result.data.sellingPrice !== undefined) {
      record.sellingPrice = Number(result.data.sellingPrice || 0);
    }
    if (result.data.discountPrice !== undefined) {
      record.discountPrice = Number(result.data.discountPrice || 0);
    }
    if (result.data.additionalCost !== undefined) {
      record.additionalCost = Number(result.data.additionalCost || 0);
    }
    if (result.data.isRelatedToBranch !== undefined) {
      record.isRelatedToBranch = Boolean(result.data.isRelatedToBranch);
      record.relatedBranch = result.data.isRelatedToBranch && result.data.relatedBranch
        ? new mongoose.Types.ObjectId(result.data.relatedBranch)
        : null;
      record.relatedBranchNote = result.data.isRelatedToBranch
        ? (result.data.relatedBranchNote || "").trim()
        : "";

      // If marked related to another branch, set status to PENDING for verifier review
      if (record.isRelatedToBranch && record.status === "APPROVED") {
        record.status = "PENDING";
        record.approvedAmount = null;
        record.isLocked = false;
      }
    }

    if (result.data.isCrossBranchPayment !== undefined) {
      record.isCrossBranchPayment = Boolean(result.data.isCrossBranchPayment);
      record.collectingShop = record.isCrossBranchPayment ? (record.shop || null) : null;
      record.beneficiaryShop = record.isCrossBranchPayment && result.data.beneficiaryShop
        ? new mongoose.Types.ObjectId(result.data.beneficiaryShop)
        : null;

      if (record.isCrossBranchPayment && !record.interBranchSettlementStatus) {
        record.interBranchSettlementStatus = "UNSETTLED";
      }

      if (record.isCrossBranchPayment && record.status === "APPROVED") {
        record.status = "PENDING";
        record.approvedAmount = null;
        record.isLocked = false;
      }
    }

    await record.save();

    // Recalculate running balance
    const earliestDate = previousDate < record.date ? previousDate : record.date;
    if (record.shop) {
      await recalculateShopRunningBalance(record.shop, earliestDate);
    }
    if (record.isCrossBranchPayment) {
      if (record.collectingShop && record.collectingShop.toString() !== record.shop?.toString()) {
        await recalculateShopRunningBalance(record.collectingShop, earliestDate);
      }
      if (record.beneficiaryShop) {
        await recalculateShopRunningBalance(record.beneficiaryShop, earliestDate);
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: role === "ADMIN" && record.status !== "PENDING" ? "OVERRIDE_UPDATE_RECORD" : "UPDATE_RECORD",
      targetType: "FinanceRecord",
      targetId: record._id,
      metadata: {
        billNumber: record.billNumber,
        oldAmount: previousAmount,
        newAmount: record.amount,
      },
    });

    return { success: true, message: "Record updated successfully" };
  } catch (error) {
    console.error("Update finance record error:", error);
    return { success: false, error: "Failed to update finance record." };
  }
}

export async function deleteFinanceRecordAction(recordId: string, overrideReason?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;

  try {
    await connectDB();
    const record = await FinanceRecord.findById(recordId);
    if (!record || record.isDeleted) {
      return { success: false, error: "Finance record not found." };
    }

    // Role check
    if (role === "STAFF") {
      if (record.createdBy.toString() !== session.user.id) {
        return { success: false, error: "You can only delete records you created." };
      }
      if (record.status !== "PENDING" || record.isLocked) {
        return {
          success: false,
          error: "This record has already been reviewed and locked. Deletion is restricted.",
        };
      }
    } else if (role !== "ADMIN") {
      return { success: false, error: "Finance Verifiers cannot delete records." };
    }

    const shopId = record.shop;
    const recordDate = record.date;
    const effectiveAmount = record.approvedAmount ?? record.amount;

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = new mongoose.Types.ObjectId(session.user.id);
    record.deletionReason = overrideReason || "Deleted by user";
    await record.save();

    // Recalculate running balance after soft deletion
    if (shopId) {
      await recalculateShopRunningBalance(shopId, recordDate);
    }

    // If approved and was Petty cash or Bank, reverse impact
    if (record.status === "APPROVED") {
      if (record.paymentMethod === "PETTY_CASH") {
        const pettyCash = await PettyCashAccount.findOne();
        if (pettyCash) {
          if (record.type === "EXPENSE") pettyCash.currentBalance += effectiveAmount;
          else pettyCash.currentBalance -= effectiveAmount;
          await pettyCash.save();
        }
      } else if (record.bankAccount) {
        const bank = await BankAccount.findById(record.bankAccount);
        if (bank) {
          if (record.type === "INCOME") bank.currentBalance -= effectiveAmount;
          else bank.currentBalance += effectiveAmount;
          await bank.save();
        }
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: "DELETE_RECORD",
      targetType: "FinanceRecord",
      targetId: record._id,
      metadata: {
        billNumber: record.billNumber,
        amount: record.amount,
        overrideReason: overrideReason || null,
      },
    });

    return { success: true, message: "Record deleted successfully" };
  } catch (error) {
    console.error("Delete finance record error:", error);
    return { success: false, error: "Failed to delete finance record." };
  }
}

export async function reviewFinanceRecordAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!canReviewFinanceRecord(session.user as any)) {
    return {
      success: false,
      error: "Unauthorized. Verifier or Admin privileges required.",
    };
  }

  const cleanData = sanitizeInput(formData);
  const result = reviewFinanceRecordSchema.safeParse(cleanData);

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
      return { success: false, error: "Record not found." };
    }

    if (record.status !== "PENDING" || record.isLocked) {
      return {
        success: false,
        error: `This transaction has already been ${record.status.toLowerCase()} and cannot be re-evaluated.`,
      };
    }

    const isApprove = result.data.status === "APPROVED";
    const approvedAmount = isApprove
      ? result.data.approvedAmount !== undefined && result.data.approvedAmount !== null
        ? Number(result.data.approvedAmount)
        : record.amount
      : null;

    record.status = result.data.status;
    record.approvedAmount = approvedAmount;
    record.reviewedBy = new mongoose.Types.ObjectId(session.user.id);
    record.reviewedAt = new Date();
    record.reviewRemarks = result.data.reviewRemarks ? result.data.reviewRemarks.trim() : null;
    record.isLocked = true; // Auto-lock once approved or rejected

    await record.save();

    // If Approved, update Petty Cash or Bank Account balances
    if (isApprove && approvedAmount) {
      if (record.paymentMethod === "PETTY_CASH") {
        const pettyCash = await PettyCashAccount.findOne();
        if (pettyCash) {
          if (record.type === "EXPENSE") pettyCash.currentBalance -= approvedAmount;
          else pettyCash.currentBalance += approvedAmount;
          await pettyCash.save();
        }
      } else if (record.bankAccount) {
        const bank = await BankAccount.findById(record.bankAccount);
        if (bank) {
          if (record.type === "INCOME") bank.currentBalance += approvedAmount;
          else bank.currentBalance -= approvedAmount;
          await bank.save();
        }
      }
    }

    // If Rejected and was a customer debt repayment, restore customer credit balance
    if (!isApprove && record.isDebtRepayment && record.customerCredit) {
      const cust = await CustomerCredit.findById(record.customerCredit);
      if (cust) {
        cust.totalPaid = Math.max(0, cust.totalPaid - record.amount);
        cust.currentBalance += record.amount;
        await cust.save();
      }
    }

    // Recalculate running balance from this record's date
    if (record.shop) {
      await recalculateShopRunningBalance(record.shop, record.date);
    }
    if (record.isCrossBranchPayment) {
      if (record.collectingShop && record.collectingShop.toString() !== record.shop?.toString()) {
        await recalculateShopRunningBalance(record.collectingShop, record.date);
      }
      if (record.beneficiaryShop) {
        await recalculateShopRunningBalance(record.beneficiaryShop, record.date);
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: isApprove ? "APPROVE_RECORD" : "REJECT_RECORD",
      targetType: "FinanceRecord",
      targetId: record._id,
      metadata: {
        billNumber: record.billNumber,
        status: record.status,
        submittedAmount: record.amount,
        approvedAmount: record.approvedAmount,
        remarks: record.reviewRemarks,
      },
    });

    return {
      success: true,
      message: `Record ${record.billNumber} has been ${result.data.status.toLowerCase()}.`,
    };
  } catch (error) {
    console.error("Review finance record error:", error);
    return { success: false, error: "Failed to review finance record." };
  }
}

export async function createCommunicationSaleBatchAction(payload: {
  shopId: string;
  items: Array<{
    communicationItem?: string | null;
    itemCode?: string | null;
    itemName: string;
    quantity: number;
    actualPrice: number;
    sellingPrice?: number;
    totalPrice: number;
    discountPrice: number;
    additionalCost?: number;
    amount: number;
    isTelecomReload?: boolean;
    telecomType?: "CUSTOM" | "PACKAGE";
    packageBasePrice?: number;
    telecomOperator?: string | null;
    commissionRate?: number;
  }>;
  paymentMethod?: "CASH" | "CREDIT" | "BANK_TRANSFER" | "ONLINE";
  customerName?: string;
  customerPhone?: string;
  bankAccountId?: string | null;
  isRelatedToBranch?: boolean;
  relatedBranch?: string | null;
  relatedBranchNote?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "STAFF" && !isAdmin(session.user as any)) {
    return { success: false, error: "Only assigned staff can record sales." };
  }

  if (role === "STAFF") {
    const dbUser = await User.findById(session.user.id).select("shop shops").lean();
    const currentActiveShop = dbUser?.shop ? dbUser.shop.toString() : (session.user as any).shop;
    const assignedIds = (dbUser?.shops || []).map((s: any) => s.toString());
    if (currentActiveShop) assignedIds.push(currentActiveShop);

    if (!assignedIds.includes(payload.shopId)) {
      return { success: false, error: "You are not assigned to this branch." };
    }
  }

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: "At least one item is required to record a sale." };
  }

  const paymentMethod = payload.paymentMethod || "CASH";
  const isCredit = paymentMethod === "CREDIT";

  if (isCredit) {
    if (!payload.customerPhone || !payload.customerPhone.trim()) {
      return { success: false, error: "Customer mobile number is required for credit sales." };
    }
    if (!payload.customerName || !payload.customerName.trim()) {
      return { success: false, error: "Customer name is required for credit sales." };
    }
  }

  try {
    await connectDB();

    const shop = await Shop.findById(payload.shopId);
    if (!shop || !shop.isActive) {
      return { success: false, error: "Invalid or inactive branch." };
    }

    const isBranchRelated = Boolean(payload.isRelatedToBranch);
    const relatedBranchId = isBranchRelated && payload.relatedBranch
      ? new mongoose.Types.ObjectId(payload.relatedBranch)
      : null;
    const relatedBranchNote = isBranchRelated ? (payload.relatedBranchNote || "").trim() : "";

    const recordStatus: "PENDING" | "APPROVED" = isBranchRelated ? "PENDING" : "APPROVED";
    const isLocked = !isBranchRelated;

    // Handle Customer Credit Account if CREDIT sale
    let customerCreditDoc: any = null;
    if (isCredit) {
      const cleanPhone = payload.customerPhone!.trim();
      const cleanName = payload.customerName!.trim();

      customerCreditDoc = await CustomerCredit.findOne({
        shop: shop._id,
        phone: cleanPhone,
      });

      if (!customerCreditDoc) {
        customerCreditDoc = await CustomerCredit.create({
          shop: shop._id,
          name: cleanName,
          phone: cleanPhone,
          totalCredit: 0,
          totalPaid: 0,
          currentBalance: 0,
          lastActivityDate: new Date(),
        });
      } else if (cleanName && customerCreditDoc.name !== cleanName) {
        customerCreditDoc.name = cleanName;
      }
    }

    // Find or create "Communication Items" INCOME category
    let category = await Category.findOne({
      name: { $regex: /^communication items$/i },
      type: "INCOME",
      isActive: true,
    });
    if (!category) {
      category = await Category.findOne({
        name: { $regex: /^communication/i },
        type: "INCOME",
        isActive: true,
      });
    }
    if (!category) {
      category = await Category.create({
        name: "Communication Items",
        description: "Revenue from communication shop sales and services",
        type: "INCOME",
        colorToken: "chart-1",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      });
    }

    const now = new Date();
    const datePrefix = now.toISOString().slice(2, 7).replace("-", "");
    const countToday = await FinanceRecord.countDocuments({
      shop: shop._id,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });
    const seq = String(countToday + 1).padStart(4, "0");
    const billNumber = `${shop.code || "COMM"}-${datePrefix}-${seq}`;

    let grandTotal = 0;

    for (const item of payload.items) {
      const netAmount = Math.max(0, Number(item.amount) || Number(item.totalPrice) - Number(item.discountPrice || 0));
      grandTotal += netAmount;
      // Resolve unit selling price
      const unitSelling = item.sellingPrice !== undefined && item.sellingPrice > 0
        ? Number(item.sellingPrice)
        : (item.quantity > 0 ? Number((item.totalPrice / item.quantity).toFixed(2)) : item.totalPrice);

      // Securely resolve base unit cost price from database (protects secret cost from staff)
      let resolvedActualPrice = Number(item.actualPrice || 0);
      let isTelecomReload = Boolean((item as any).isTelecomReload);
      let telecomOperator = (item as any).telecomOperator || null;
      let commissionRate = typeof (item as any).commissionRate === "number" ? (item as any).commissionRate : 0;

      if (item.communicationItem) {
        const commItemDoc = await CommunicationItem.findById(item.communicationItem).select("actualPrice isTelecomReload telecomOperator commissionRate");
        if (commItemDoc) {
          if (typeof commItemDoc.actualPrice === "number") {
            resolvedActualPrice = commItemDoc.actualPrice;
          }
          if (commItemDoc.isTelecomReload) {
            isTelecomReload = true;
            telecomOperator = commItemDoc.telecomOperator || telecomOperator;
            if (typeof commItemDoc.commissionRate === "number") {
              commissionRate = commItemDoc.commissionRate;
            }
          }
        }
      } else if (item.itemCode) {
        const commItemDoc = await CommunicationItem.findOne({
          shop: shop._id,
          itemCode: item.itemCode.trim().toUpperCase(),
        }).select("actualPrice isTelecomReload telecomOperator commissionRate");
        if (commItemDoc) {
          if (typeof commItemDoc.actualPrice === "number") {
            resolvedActualPrice = commItemDoc.actualPrice;
          }
          if (commItemDoc.isTelecomReload) {
            isTelecomReload = true;
            telecomOperator = commItemDoc.telecomOperator || telecomOperator;
            if (typeof commItemDoc.commissionRate === "number") {
              commissionRate = commItemDoc.commissionRate;
            }
          }
        }
      }

      // If it's a telecom reload, compute commission earned and set base wholesale cost
      let commissionEarned = 0;
      let telecomType: "CUSTOM" | "PACKAGE" = (item as any).telecomType || "CUSTOM";
      const rawPkgBase = typeof (item as any).packageBasePrice === "number" ? Number((item as any).packageBasePrice) : 0;
      let packageBasePrice: number | undefined = undefined;

      if (isTelecomReload) {
        if (telecomType === "PACKAGE" && rawPkgBase > 0) {
          packageBasePrice = rawPkgBase;
          // Commission earned on wholesale package base unit price (e.g. 998 * 4% = 39.92)
          const commFromBase = Number(((packageBasePrice * (commissionRate / 100))).toFixed(2));
          // Extra markup earned from selling price above package base price (e.g. 1000 - 998 = 2.00)
          const markup = Math.max(0, Number((unitSelling - packageBasePrice).toFixed(2)));
          // Total profit = commission from base + markup (e.g. 39.92 + 2 = 41.92)
          commissionEarned = Number((commFromBase + markup).toFixed(2));
          // Base wholesale cost to shop = package base price - commission from base (e.g. 998 - 39.92 = 958.08)
          resolvedActualPrice = Math.max(0, Number((packageBasePrice - commFromBase).toFixed(2)));
        } else {
          telecomType = "CUSTOM";
          commissionEarned = Number(((netAmount * (commissionRate / 100))).toFixed(2));
          resolvedActualPrice = Math.max(0, Number((netAmount - commissionEarned).toFixed(2)));
        }
      }

      const recordReason = isCredit
        ? `Credit Sale to ${customerCreditDoc.name} (${customerCreditDoc.phone}): ${item.itemName} (${item.quantity} ${item.quantity === 1 ? "unit" : "units"})`
        : isTelecomReload
        ? telecomType === "PACKAGE" && packageBasePrice
          ? `Telecom Package: ${item.itemName} (Base: LKR ${packageBasePrice}, Sold: LKR ${netAmount.toLocaleString()})`
          : `Telecom Reload: ${item.itemName} (LKR ${netAmount.toLocaleString()})`
        : `Retail Sale: ${item.itemName} (${item.quantity} ${item.quantity === 1 ? "unit" : "units"})`;

      await FinanceRecord.create({
        date: now,
        shop: shop._id,
        category: category?._id || null,
        paymentMethod,
        bankAccount: paymentMethod === "BANK_TRANSFER" && payload.bankAccountId ? new mongoose.Types.ObjectId(payload.bankAccountId) : null,
        billNumber,
        reason: recordReason,
        amount: netAmount,
        type: "INCOME",
        status: recordStatus,
        approvedAmount: isBranchRelated ? null : netAmount,
        runningBalance: 0,
        isLocked,

        // Customer Credit fields
        customerCredit: customerCreditDoc?._id || null,
        customerName: customerCreditDoc?.name || payload.customerName || null,
        customerPhone: customerCreditDoc?.phone || payload.customerPhone || null,

        // Communication fields
        isCommunicationItem: true,
        communicationItem: item.communicationItem ? new mongoose.Types.ObjectId(item.communicationItem) : null,
        itemCode: item.itemCode ? item.itemCode.trim().toUpperCase() : null,
        itemName: item.itemName.trim(),
        quantity: Number(item.quantity || 1),
        actualPrice: resolvedActualPrice,
        sellingPrice: unitSelling,
        discountPrice: Number(item.discountPrice || 0),
        additionalCost: Number(item.additionalCost || 0),
        isTelecomReload: Boolean(isTelecomReload),
        telecomType: isTelecomReload ? telecomType : undefined,
        packageBasePrice: isTelecomReload && telecomType === "PACKAGE" ? packageBasePrice : undefined,
        telecomOperator: isTelecomReload ? telecomOperator : undefined,
        commissionRate: isTelecomReload ? commissionRate : undefined,
        commissionEarned: isTelecomReload ? commissionEarned : undefined,
        isRelatedToBranch: isBranchRelated,
        relatedBranch: relatedBranchId,
        relatedBranchNote,

        // Cross-Branch Payment fields
        isCrossBranchPayment: isBranchRelated,
        collectingShop: isBranchRelated ? shop._id : null,
        beneficiaryShop: isBranchRelated ? relatedBranchId : null,
        interBranchSettlementStatus: isBranchRelated ? "UNSETTLED" : undefined,

        isDeleted: false,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      });
    }

    // Update Customer Credit Account and log Credit Transaction if CREDIT sale
    if (isCredit && customerCreditDoc) {
      customerCreditDoc.totalCredit += grandTotal;
      customerCreditDoc.currentBalance += grandTotal;
      customerCreditDoc.lastActivityDate = now;
      await customerCreditDoc.save();

      await CreditTransaction.create({
        customerCredit: customerCreditDoc._id,
        shop: shop._id,
        type: "CREDIT_SALE",
        amount: grandTotal,
        paymentMethod: "CREDIT",
        billNumber,
        note: `Credit Sale: ${payload.items.map((i) => i.itemName).join(", ")}`,
        recordedBy: new mongoose.Types.ObjectId(session.user.id),
        date: now,
      });
    }

    // Recalculate shop sequential running balance only when auto-approved
    if (recordStatus === "APPROVED") {
      await recalculateShopRunningBalance(shop._id, now);
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: "COMMUNICATION_BATCH_SALE",
      targetType: "Shop",
      targetId: shop._id,
      metadata: {
        billNumber,
        itemsCount: payload.items.length,
        grandTotal,
        isRelatedToBranch: isBranchRelated,
        relatedBranch: payload.relatedBranch,
        status: recordStatus,
        items: payload.items.map((i) => ({
          code: i.itemCode,
          name: i.itemName,
          quantity: i.quantity,
          actualPrice: i.actualPrice,
          totalPrice: i.totalPrice,
          net: i.amount,
        })),
      },
    });

    return {
      success: true,
      billNumber,
      itemsCount: payload.items.length,
      grandTotal,
      isAutoApproved: !isBranchRelated,
      message: isBranchRelated
        ? `Sale with ${payload.items.length} item(s) submitted for approval.`
        : `Sale with ${payload.items.length} item(s) recorded successfully.`,
    };
  } catch (error) {
    console.error("Batch sale recording error:", error);
    return { success: false, error: "Failed to record communication sale." };
  }
}

/**
 * Settles cross-branch collected physical cash.
 * Can handover physical cash to target branch, deposit directly into company bank account, or direct offset.
 */
export async function settleInterBranchCashAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  if (!isAdmin(role)) {
    return { success: false, error: "Only administrators can perform inter-branch cash settlements." };
  }

  const cleanData = sanitizeInput(formData);
  const result = settleInterBranchCashSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  const {
    recordIds,
    holdingShopId,
    targetShopId,
    settlementType,
    bankAccountId,
    reference,
    note,
  } = result.data;

  try {
    await connectDB();

    const holdingShop = await Shop.findById(holdingShopId);
    if (!holdingShop) {
      return { success: false, error: "Holding branch not found." };
    }

    const objectIds = recordIds.map((id) => new mongoose.Types.ObjectId(id));

    const records = await FinanceRecord.find({
      _id: { $in: objectIds },
      collectingShop: holdingShop._id,
      interBranchSettlementStatus: "UNSETTLED",
      isDeleted: { $ne: true },
    });

    if (records.length === 0) {
      return {
        success: false,
        error: "No unsettled cross-branch records found matching the selection.",
      };
    }

    let totalAmount = 0;
    for (const rec of records) {
      const amt =
        rec.status === "APPROVED" && typeof rec.approvedAmount === "number"
          ? rec.approvedAmount
          : rec.amount;
      totalAmount += amt;
    }

    // If deposited to bank, ensure bank account exists and credit it
    let bankAccountDoc = null;
    if (settlementType === "DEPOSITED_TO_BANK") {
      if (!bankAccountId) {
        return { success: false, error: "Bank account is required when depositing to bank." };
      }
      bankAccountDoc = await BankAccount.findById(bankAccountId);
      if (!bankAccountDoc || !bankAccountDoc.isActive) {
        return { success: false, error: "Valid active bank account is required." };
      }
      bankAccountDoc.currentBalance += totalAmount;
      await bankAccountDoc.save();
    }

    const now = new Date();
    await FinanceRecord.updateMany(
      { _id: { $in: records.map((r) => r._id) } },
      {
        $set: {
          interBranchSettlementStatus: "SETTLED",
          settledAt: now,
          settledBy: new mongoose.Types.ObjectId(session.user.id),
          settlementType,
          settlementReference: reference ? reference.trim() : "",
          settlementNote: note ? note.trim() : "",
          ...(bankAccountId ? { bankAccount: new mongoose.Types.ObjectId(bankAccountId) } : {}),
        },
      }
    );

    // Recalculate cash drawers and running balances
    await recalculateShopRunningBalance(holdingShop._id, now);
    if (targetShopId) {
      await recalculateShopRunningBalance(targetShopId, now);
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: "SETTLE_INTER_BRANCH_CASH",
      targetType: "Shop",
      targetId: holdingShop._id,
      metadata: {
        holdingShop: holdingShop.name,
        targetShopId,
        settlementType,
        settledRecordsCount: records.length,
        totalAmount,
        bankAccount: bankAccountDoc ? bankAccountDoc.bankName : null,
        reference,
      },
    });

    revalidatePath("/dashboard/admin/shops");
    revalidatePath(`/dashboard/admin/shops/${holdingShopId}`);
    if (targetShopId) {
      revalidatePath(`/dashboard/admin/shops/${targetShopId}`);
    }

    return {
      success: true,
      message: `Successfully settled LKR ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} across ${records.length} record(s) via ${settlementType.replace(/_/g, " ")}.`,
      totalAmount,
      count: records.length,
    };
  } catch (error) {
    console.error("Inter-branch settlement error:", error);
    return { success: false, error: "Failed to settle inter-branch cash." };
  }
}

export async function getShopInterBranchDuesAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const dues = await getShopInterBranchDues(shopId);
    return { success: true, dues: JSON.parse(JSON.stringify(dues)) };
  } catch (error) {
    console.error("Get shop inter-branch dues error:", error);
    return { success: false, error: "Failed to fetch inter-branch dues." };
  }
}

