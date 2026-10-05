"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";
import { User } from "@/models/User";
import { FinanceRecord } from "@/models/FinanceRecord";
import { CustomerCredit } from "@/models/CustomerCredit";
import { sanitizeInput } from "@/lib/sanitize";
import { createShopSchema, updateShopSchema } from "@/schemas/shop";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import {
  getShopCashBalance,
  getShopInterBranchDues,
  getShopCashAuditData,
  recalculateShopRunningBalance,
} from "@/lib/balance";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function getShopsAction() {
  try {
    await connectDB();
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();

    // Attach count of active staff assigned to each shop and exact balances
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const staffCount = await User.countDocuments({
          shop: shop._id,
          isActive: true,
          role: "STAFF",
        });
        const recordsCount = await FinanceRecord.countDocuments({
          shop: shop._id,
          isDeleted: { $ne: true },
        });

        // Compute true physical cash balance
        const currentBalance = await getShopCashBalance(shop._id);
        const interBranchDues = await getShopInterBranchDues(shop._id);

        let totalCustomerCredit = 0;
        if (shop.shopType === "COMMUNICATION") {
          const creditAgg = await CustomerCredit.aggregate([
            { $match: { shop: shop._id } },
            { $group: { _id: null, total: { $sum: "$currentBalance" } } },
          ]);
          if (creditAgg.length > 0) {
            totalCustomerCredit = creditAgg[0].total || 0;
          }
        }

        return {
          ...shop,
          staffCount,
          recordsCount,
          currentBalance,
          totalCustomerCredit,
          interBranchDues: {
            totalHolding: interBranchDues.totalHolding,
            totalOwed: interBranchDues.totalOwed,
          },
        };
      })
    );

    return { success: true, shops: JSON.parse(JSON.stringify(shopsWithCounts)) };
  } catch (error) {
    console.error("Get shops error:", error);
    return { success: false, error: "Failed to fetch shops." };
  }
}

export async function getActiveShopsAction() {
  try {
    await connectDB();
    const shops = await Shop.find({ isActive: true }).select("_id name code shopType").sort({ name: 1 }).lean();
    return { success: true, shops: JSON.parse(JSON.stringify(shops)) };
  } catch (error) {
    console.error("Get active shops error:", error);
    return { success: false, error: "Failed to fetch active shops." };
  }
}

export async function getShopDetailsAction(shopId: string) {
  try {
    await connectDB();
    const shop = await Shop.findById(shopId).lean();
    if (!shop) return { success: false, error: "Shop not found." };

    const assignedStaff = await User.find({ shop: shop._id, isActive: true })
      .select("name email phone role lastLoginAt")
      .lean();

    const recordsCount = await FinanceRecord.countDocuments({ shop: shop._id, isDeleted: { $ne: true } });
    const pendingCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "PENDING", isDeleted: { $ne: true } });
    const approvedCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "APPROVED", isDeleted: { $ne: true } });

    // Compute true physical cash balance and inter-branch dues
    const currentBalance = await getShopCashBalance(shop._id);
    const interBranchDues = await getShopInterBranchDues(shop._id);

    let totalCustomerCredit = 0;
    let creditCustomerCount = 0;
    if (shop.shopType === "COMMUNICATION") {
      const creditAgg = await CustomerCredit.aggregate([
        { $match: { shop: shop._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$currentBalance" },
            count: { $sum: 1 },
          },
        },
      ]);
      if (creditAgg.length > 0) {
        totalCustomerCredit = creditAgg[0].total || 0;
        creditCustomerCount = creditAgg[0].count || 0;
      }
    }

    return {
      success: true,
      shop: JSON.parse(JSON.stringify(shop)),
      assignedStaff: JSON.parse(JSON.stringify(assignedStaff)),
      stats: {
        recordsCount,
        pendingCount,
        approvedCount,
        currentBalance,
        totalCustomerCredit,
        creditCustomerCount,
        interBranchDues: JSON.parse(JSON.stringify(interBranchDues)),
      },
    };
  } catch (error) {
    console.error("Get shop details error:", error);
    return { success: false, error: "Failed to load shop details." };
  }
}

export async function createShopAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createShopSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existingCode = await Shop.findOne({ code: result.data.code.toUpperCase() });
    if (existingCode) {
      return { success: false, error: "A shop with this code already exists." };
    }

    const existingName = await Shop.findOne({ name: result.data.name });
    if (existingName) {
      return { success: false, error: "A shop with this name already exists." };
    }

    const newShop = await Shop.create({
      name: result.data.name,
      code: result.data.code.toUpperCase(),
      description: result.data.description || "",
      address: result.data.address || "",
      shopType: result.data.shopType || "STANDARD",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_SHOP",
      targetType: "Shop",
      targetId: newShop._id,
      metadata: { name: newShop.name, code: newShop.code, shopType: newShop.shopType },
    });

    return { success: true, message: "Shop created successfully" };
  } catch (error) {
    console.error("Create shop error:", error);
    return { success: false, error: "Failed to create shop." };
  }
}

export async function updateShopAction(shopId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateShopSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existingCode = await Shop.findOne({
      code: result.data.code.toUpperCase(),
      _id: { $ne: new mongoose.Types.ObjectId(shopId) },
    });
    if (existingCode) {
      return { success: false, error: "Another shop already uses this code." };
    }

    const updated = await Shop.findByIdAndUpdate(
      shopId,
      {
        name: result.data.name,
        code: result.data.code.toUpperCase(),
        description: result.data.description || "",
        address: result.data.address || "",
        shopType: result.data.shopType || "STANDARD",
        isActive: result.data.isActive,
      },
      { new: true }
    );

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_SHOP",
      targetType: "Shop",
      targetId: shopId,
      metadata: { name: result.data.name, isActive: result.data.isActive },
    });

    return { success: true, shop: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Update shop error:", error);
    return { success: false, error: "Failed to update shop." };
  }
}

export async function toggleShopActiveAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(shopId);
    if (!shop) return { success: false, error: "Shop not found." };

    shop.isActive = !shop.isActive;
    await shop.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: shop.isActive ? "ACTIVATE_SHOP" : "DEACTIVATE_SHOP",
      targetType: "Shop",
      targetId: shop._id,
    });

    return { success: true, isActive: shop.isActive };
  } catch (error) {
    console.error("Toggle shop error:", error);
    return { success: false, error: "Failed to toggle shop status." };
  }
}

export async function getShopCashAuditAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await connectDB();
    const audit = await getShopCashAuditData(shopId);
    return { success: true, audit: JSON.parse(JSON.stringify(audit)) };
  } catch (error) {
    console.error("Get shop cash audit error:", error);
    return { success: false, error: "Failed to retrieve cash diagnostic audit data." };
  }
}

export async function recalculateAndSyncShopCashAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    await recalculateShopRunningBalance(shopId);

    const audit = await getShopCashAuditData(shopId);

    await logAuditEvent({
      actorId: session.user.id,
      action: "RECALCULATE_AND_SYNC_SHOP_CASH",
      targetType: "Shop",
      targetId: new mongoose.Types.ObjectId(shopId),
      metadata: {
        shopName: audit.shopName,
        shopCode: audit.shopCode,
        currentDrawerBalance: audit.currentDrawerBalance,
      },
    });

    revalidatePath(`/dashboard/admin/shops/${shopId}`);
    revalidatePath("/dashboard/admin/shops");
    revalidatePath("/dashboard/staff/finances");

    return {
      success: true,
      message: `Drawer running balance successfully recalculated and synced for ${audit.shopName}.`,
      audit: JSON.parse(JSON.stringify(audit)),
    };
  } catch (error) {
    console.error("Recalculate and sync shop cash error:", error);
    return { success: false, error: "Failed to recalculate and sync shop cash." };
  }
}
