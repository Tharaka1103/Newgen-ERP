"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";
import { User } from "@/models/User";
import { FinanceRecord } from "@/models/FinanceRecord";
import { sanitizeInput } from "@/lib/sanitize";
import { createShopSchema, updateShopSchema } from "@/schemas/shop";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";

export async function getShopsAction() {
  try {
    await connectDB();
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();

    // Attach count of active staff assigned to each shop
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const staffCount = await User.countDocuments({
          shop: shop._id,
          isActive: true,
          role: "STAFF",
        });
        const recordsCount = await FinanceRecord.countDocuments({
          shop: shop._id,
        });

        // Get latest record running balance
        const latestRecord = await FinanceRecord.findOne({ shop: shop._id })
          .sort({ date: -1, createdAt: -1 })
          .select("runningBalance")
          .lean();

        return {
          ...shop,
          staffCount,
          recordsCount,
          currentBalance: latestRecord?.runningBalance || 0,
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

    const recordsCount = await FinanceRecord.countDocuments({ shop: shop._id });
    const pendingCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "PENDING" });
    const approvedCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "APPROVED" });

    const latestRecord = await FinanceRecord.findOne({ shop: shop._id })
      .sort({ date: -1, createdAt: -1 })
      .select("runningBalance")
      .lean();

    return {
      success: true,
      shop: JSON.parse(JSON.stringify(shop)),
      assignedStaff: JSON.parse(JSON.stringify(assignedStaff)),
      stats: {
        recordsCount,
        pendingCount,
        approvedCount,
        currentBalance: latestRecord?.runningBalance || 0,
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
