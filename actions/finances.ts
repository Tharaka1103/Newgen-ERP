"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import { BankAccount } from "@/models/BankAccount";
import { PettyCashAccount } from "@/models/PettyCashAccount";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createFinanceRecordSchema,
  updateFinanceRecordSchema,
  reviewFinanceRecordSchema,
} from "@/schemas/finance";
import { canCreateFinanceRecord, canReviewFinanceRecord, isAdmin } from "@/lib/rbac";
import { recalculateShopRunningBalance } from "@/lib/balance";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";

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
      if (!userShop) {
        return {
          success: true,
          records: [],
          total: 0,
          page: 1,
          totalPages: 0,
          unassignedStaff: true,
        };
      }
      query.shop = new mongoose.Types.ObjectId(userShop);
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

    // If STAFF, strictly force their assigned shop
    const shopId = role === "STAFF" ? userShop : result.data.shop;

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
    const isBranchRelated = Boolean(result.data.isRelatedToBranch);

    // Business Rule for Communication Shop:
    // Only branch-related transactions need verifier approval.
    // Non-branch related communication retail sales are auto-approved immediately.
    let recordStatus: "PENDING" | "APPROVED" = "PENDING";
    let approvedAmount: number | null = null;
    let isLocked = false;

    if (isCommShop && !isBranchRelated) {
      recordStatus = "APPROVED";
      approvedAmount = result.data.amount;
      isLocked = true;
    }

    const bankAccountId = result.data.bankAccount
      ? new mongoose.Types.ObjectId(result.data.bankAccount)
      : null;

    const relatedBranchId = result.data.relatedBranch
      ? new mongoose.Types.ObjectId(result.data.relatedBranch)
      : null;

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

    // Staff can only edit PENDING records they created
    if (role === "STAFF") {
      if (record.createdBy.toString() !== session.user.id) {
        return { success: false, error: "You can only edit records you created." };
      }
      if (record.status !== "PENDING" || record.isLocked) {
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
    }
    record.billNumber = result.data.billNumber.trim();
    record.reason = result.data.reason.trim();
    record.amount = result.data.amount;
    record.type = result.data.type;

    await record.save();

    // Recalculate running balance
    if (record.shop) {
      const earliestDate = previousDate < record.date ? previousDate : record.date;
      await recalculateShopRunningBalance(record.shop, earliestDate);
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

    // Recalculate running balance from this record's date
    if (record.shop) {
      await recalculateShopRunningBalance(record.shop, record.date);
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
