"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { InventoryItem } from "@/models/InventoryItem";
import { InventoryUsage } from "@/models/InventoryUsage";
import { Shop } from "@/models/Shop";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  recordInventoryUsageSchema,
} from "@/schemas/inventory";
import { isAdmin } from "@/lib/rbac";
import mongoose from "mongoose";

export async function getInventoryItemsAction(
  shopId: string,
  search?: string,
  category?: string,
  status?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!shopId) {
    return { success: false, error: "Shop ID is required" };
  }

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      shop: new mongoose.Types.ObjectId(shopId),
      isActive: true,
    };

    if (category && category !== "ALL") {
      query.category = category;
    }

    if (search && search.trim().length > 0) {
      const cleanSearch = sanitizeInput(search.trim());
      query.$or = [
        { name: { $regex: cleanSearch, $options: "i" } },
        { itemCode: { $regex: cleanSearch, $options: "i" } },
        { description: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const items = await InventoryItem.find(query).sort({ itemCode: 1 }).lean();

    // Map computed fields
    const processedItems = items
      .map((item: any) => {
        const isOutOfStock = item.quantity <= 0;
        const isLowStock = !isOutOfStock && item.quantity <= item.minStockThreshold;
        const totalValue = item.quantity * (item.unitPrice || 0);

        return {
          ...item,
          isLowStock,
          isOutOfStock,
          totalValue,
        };
      })
      .filter((item: any) => {
        if (status === "LOW_STOCK") return item.isLowStock;
        if (status === "OUT_OF_STOCK") return item.isOutOfStock;
        if (status === "IN_STOCK") return !item.isLowStock && !item.isOutOfStock;
        return true;
      });

    // Unique categories for filtering
    const categories = await InventoryItem.distinct("category", {
      shop: new mongoose.Types.ObjectId(shopId),
      isActive: true,
    });

    return {
      success: true,
      items: JSON.parse(JSON.stringify(processedItems)),
      categories: categories.filter(Boolean),
    };
  } catch (error) {
    console.error("Get inventory items error:", error);
    return { success: false, error: "Failed to load inventory items." };
  }
}

export async function createInventoryItemAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(formData);
  const result = createInventoryItemSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const shop = await Shop.findById(result.data.shopId);
    if (!shop || !shop.isActive) {
      return { success: false, error: "Branch not found or inactive." };
    }

    // Check duplicate item code in same shop
    const existing = await InventoryItem.findOne({
      shop: shop._id,
      itemCode: result.data.itemCode.toUpperCase().trim(),
      isActive: true,
    });

    if (existing) {
      return {
        success: false,
        error: `An inventory item with code "${result.data.itemCode}" already exists in this branch.`,
      };
    }

    const newItem = await InventoryItem.create({
      shop: shop._id,
      name: result.data.name.trim(),
      itemCode: result.data.itemCode.toUpperCase().trim(),
      category: (result.data.category || "General").trim(),
      quantity: Number(result.data.quantity || 0),
      unit: (result.data.unit || "pcs").trim(),
      unitPrice: Number(result.data.unitPrice || 0),
      minStockThreshold: Number(result.data.minStockThreshold || 5),
      description: (result.data.description || "").trim(),
      location: (result.data.location || "").trim(),
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      isActive: true,
    });

    return {
      success: true,
      message: `Item "${newItem.name}" (${newItem.itemCode}) registered successfully.`,
      item: JSON.parse(JSON.stringify(newItem)),
    };
  } catch (error: any) {
    console.error("Create inventory item error:", error);
    if (error.code === 11000) {
      return { success: false, error: "Item code already exists in this shop." };
    }
    return { success: false, error: "Failed to register inventory item." };
  }
}

export async function updateInventoryItemAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateInventoryItemSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const item = await InventoryItem.findById(result.data.itemId);
    if (!item || !item.isActive) {
      return { success: false, error: "Inventory item not found." };
    }

    // Check duplicate code if changed
    const newCode = result.data.itemCode.toUpperCase().trim();
    if (newCode !== item.itemCode) {
      const duplicate = await InventoryItem.findOne({
        _id: { $ne: item._id },
        shop: item.shop,
        itemCode: newCode,
        isActive: true,
      });
      if (duplicate) {
        return { success: false, error: `Item code "${newCode}" is already in use.` };
      }
    }

    item.name = result.data.name.trim();
    item.itemCode = newCode;
    item.category = (result.data.category || "General").trim();
    item.quantity = Number(result.data.quantity || 0);
    item.unit = (result.data.unit || "pcs").trim();
    item.unitPrice = Number(result.data.unitPrice || 0);
    item.minStockThreshold = Number(result.data.minStockThreshold || 5);
    item.description = (result.data.description || "").trim();
    item.location = (result.data.location || "").trim();

    await item.save();

    return {
      success: true,
      message: `Item "${item.name}" updated successfully.`,
      item: JSON.parse(JSON.stringify(item)),
    };
  } catch (error) {
    console.error("Update inventory item error:", error);
    return { success: false, error: "Failed to update inventory item." };
  }
}

export async function deleteInventoryItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return { success: false, error: "Item not found." };
    }

    // Soft delete
    item.isActive = false;
    await item.save();

    return { success: true, message: `Item "${item.name}" removed from inventory.` };
  } catch (error) {
    console.error("Delete inventory item error:", error);
    return { success: false, error: "Failed to delete inventory item." };
  }
}

export async function recordInventoryUsageAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(formData);
  const result = recordInventoryUsageSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const item = await InventoryItem.findById(result.data.itemId);
    if (!item || !item.isActive) {
      return { success: false, error: "Selected inventory item not found." };
    }

    const qtyToUse = Number(result.data.quantityUsed);
    if (qtyToUse <= 0) {
      return { success: false, error: "Usage quantity must be greater than zero." };
    }

    if (item.quantity < qtyToUse) {
      return {
        success: false,
        error: `Insufficient stock! Current stock: ${item.quantity} ${item.unit}. You requested ${qtyToUse} ${item.unit}.`,
      };
    }

    const previousQuantity = item.quantity;
    const remainingQuantity = previousQuantity - qtyToUse;

    // Decrement stock
    item.quantity = remainingQuantity;
    await item.save();

    // Create usage log
    const usage = await InventoryUsage.create({
      shop: item.shop,
      item: item._id,
      quantityUsed: qtyToUse,
      previousQuantity,
      remainingQuantity,
      purpose: result.data.purpose.trim(),
      date: new Date(result.data.date),
      note: (result.data.note || "").trim(),
      recordedBy: new mongoose.Types.ObjectId(session.user.id),
    });

    const isLowStock = remainingQuantity <= item.minStockThreshold;
    const isOutOfStock = remainingQuantity <= 0;

    return {
      success: true,
      message: `Recorded usage of ${qtyToUse} ${item.unit} for "${item.name}". Remaining: ${remainingQuantity} ${item.unit}.`,
      remainingQuantity,
      isLowStock,
      isOutOfStock,
      itemName: item.name,
      itemCode: item.itemCode,
      unit: item.unit,
      minStockThreshold: item.minStockThreshold,
      usage: JSON.parse(JSON.stringify(usage)),
    };
  } catch (error) {
    console.error("Record inventory usage error:", error);
    return { success: false, error: "Failed to record inventory usage." };
  }
}

export async function getInventoryUsageHistoryAction(
  shopId: string,
  itemId?: string,
  limit = 50
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const query: Record<string, unknown> = {
      shop: new mongoose.Types.ObjectId(shopId),
    };

    if (itemId && itemId !== "ALL") {
      query.item = new mongoose.Types.ObjectId(itemId);
    }

    const usages = await InventoryUsage.find(query)
      .populate("item", "name itemCode unit category")
      .populate("recordedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      success: true,
      usages: JSON.parse(JSON.stringify(usages)),
    };
  } catch (error) {
    console.error("Get inventory usage history error:", error);
    return { success: false, error: "Failed to load usage history." };
  }
}

export async function getInventoryAnalyticsAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();

    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const items = await InventoryItem.find({
      shop: shopObjectId,
      isActive: true,
    }).lean();

    let totalItems = items.length;
    let totalStockCount = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: any[] = [];
    const categoryMap = new Map<string, { count: number; value: number }>();

    for (const item of items) {
      const qty = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const val = qty * unitPrice;
      const minThreshold = item.minStockThreshold ?? 5;

      totalStockCount += qty;
      totalInventoryValue += val;

      if (qty <= 0) {
        outOfStockCount++;
        lowStockItems.push({
          ...item,
          isOutOfStock: true,
          isLowStock: false,
          totalValue: val,
        });
      } else if (qty <= minThreshold) {
        lowStockCount++;
        lowStockItems.push({
          ...item,
          isOutOfStock: false,
          isLowStock: true,
          totalValue: val,
        });
      }

      const cat = item.category || "General";
      const existingCat = categoryMap.get(cat) || { count: 0, value: 0 };
      existingCat.count += 1;
      existingCat.value += val;
      categoryMap.set(cat, existingCat);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      itemCount: data.count,
      totalValue: data.value,
    }));

    // Recent usages
    const recentUsages = await InventoryUsage.find({ shop: shopObjectId })
      .populate("item", "name itemCode unit")
      .populate("recordedBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .lean();

    return {
      success: true,
      analytics: {
        totalItems,
        totalStockCount,
        totalInventoryValue,
        lowStockCount,
        outOfStockCount,
        lowStockItems: JSON.parse(JSON.stringify(lowStockItems)),
        categoryBreakdown,
        recentUsages: JSON.parse(JSON.stringify(recentUsages)),
      },
    };
  } catch (error) {
    console.error("Get inventory analytics error:", error);
    return { success: false, error: "Failed to load inventory analytics." };
  }
}
