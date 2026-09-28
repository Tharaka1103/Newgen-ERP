"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { CommunicationItem } from "@/models/CommunicationItem";
import { Shop } from "@/models/Shop";
import { FinanceRecord } from "@/models/FinanceRecord";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createCommunicationItemSchema,
  updateCommunicationItemSchema,
  classifyTelecomOperator,
  type TelecomOperator,
} from "@/schemas/communication";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";

export async function getCommunicationItemsAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const items = await CommunicationItem.find({
      shop: new mongoose.Types.ObjectId(shopId),
    })
      .sort({ itemCode: 1 })
      .lean();

    const userIsAdmin = isAdmin(session.user as any);
    const sanitizedItems = items.map((item) => {
      if (!userIsAdmin) {
        const { actualPrice, ...rest } = item;
        return rest;
      }
      return item;
    });

    return {
      success: true,
      items: JSON.parse(JSON.stringify(sanitizedItems)),
    };
  } catch (error) {
    console.error("Get communication items error:", error);
    return { success: false, error: "Failed to fetch items." };
  }
}

export async function getCommunicationItemByCodeAction(shopId: string, itemCode: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const item = await CommunicationItem.findOne({
      shop: new mongoose.Types.ObjectId(shopId),
      itemCode: itemCode.trim().toUpperCase(),
      isActive: true,
    }).lean();

    if (!item) {
      return { success: false, error: "Item not found with this code." };
    }

    const userIsAdmin = isAdmin(session.user as any);
    const itemData = userIsAdmin ? item : (({ actualPrice, ...rest }) => rest)(item);

    return {
      success: true,
      item: JSON.parse(JSON.stringify(itemData)),
    };
  } catch (error) {
    console.error("Lookup item by code error:", error);
    return { success: false, error: "Failed to look up item." };
  }
}

export async function createCommunicationItemAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createCommunicationItemSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(result.data.shopId);
    if (!shop) {
      return { success: false, error: "Shop not found." };
    }

    const existing = await CommunicationItem.findOne({
      shop: shop._id,
      itemCode: result.data.itemCode.trim().toUpperCase(),
    });

    if (existing) {
      return { success: false, error: `An item with code "${result.data.itemCode}" already exists for this shop.` };
    }

    const newItem = await CommunicationItem.create({
      shop: shop._id,
      itemCode: result.data.itemCode.trim().toUpperCase(),
      name: result.data.name.trim(),
      actualPrice: Number(result.data.actualPrice || 0),
      sellingPrice: Number(result.data.sellingPrice || 0),
      description: (result.data.description || "").trim(),
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_COMMUNICATION_ITEM",
      targetType: "CommunicationItem",
      targetId: newItem._id,
      metadata: {
        shop: shop.name,
        itemCode: newItem.itemCode,
        name: newItem.name,
        actualPrice: newItem.actualPrice,
        sellingPrice: newItem.sellingPrice,
      },
    });

    return {
      success: true,
      item: JSON.parse(JSON.stringify(newItem)),
      message: "Communication item added successfully",
    };
  } catch (error) {
    console.error("Create communication item error:", error);
    return { success: false, error: "Failed to create communication item." };
  }
}

export async function updateCommunicationItemAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateCommunicationItemSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const item = await CommunicationItem.findById(result.data.itemId);
    if (!item) {
      return { success: false, error: "Item not found." };
    }

    // Check code collision
    const existing = await CommunicationItem.findOne({
      _id: { $ne: item._id },
      shop: item.shop,
      itemCode: result.data.itemCode.trim().toUpperCase(),
    });

    if (existing) {
      return { success: false, error: `Another item is already using code "${result.data.itemCode}".` };
    }

    const previousState = {
      itemCode: item.itemCode,
      name: item.name,
      actualPrice: item.actualPrice,
      sellingPrice: item.sellingPrice,
      isActive: item.isActive,
    };

    item.itemCode = result.data.itemCode.trim().toUpperCase();
    item.name = result.data.name.trim();
    item.actualPrice = Number(result.data.actualPrice || 0);
    item.sellingPrice = Number(result.data.sellingPrice || 0);
    item.description = (result.data.description || "").trim();
    item.isActive = result.data.isActive;

    await item.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_COMMUNICATION_ITEM",
      targetType: "CommunicationItem",
      targetId: item._id,
      metadata: {
        previousState,
        newState: result.data,
      },
    });

    return {
      success: true,
      item: JSON.parse(JSON.stringify(item)),
      message: "Item updated successfully",
    };
  } catch (error) {
    console.error("Update communication item error:", error);
    return { success: false, error: "Failed to update item." };
  }
}

export async function deleteCommunicationItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const item = await CommunicationItem.findById(itemId);
    if (!item) {
      return { success: false, error: "Item not found." };
    }

    await CommunicationItem.findByIdAndDelete(itemId);

    await logAuditEvent({
      actorId: session.user.id,
      action: "DELETE_COMMUNICATION_ITEM",
      targetType: "CommunicationItem",
      targetId: item._id,
      metadata: {
        itemCode: item.itemCode,
        name: item.name,
      },
    });

    return { success: true, message: "Item deleted successfully" };
  } catch (error) {
    console.error("Delete communication item error:", error);
    return { success: false, error: "Failed to delete item." };
  }
}


interface CommunicationAnalyticsParams {
  shopId: string;
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  itemCodeFilter?: string;
}

export async function getCommunicationAnalyticsAction(params: CommunicationAnalyticsParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(params.shopId);
    if (!shop) return { success: false, error: "Shop not found" };

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

    const query: Record<string, unknown> = {
      shop: shop._id,
      isDeleted: { $ne: true },
      date: { $gte: start, $lte: end },
    };

    if (params.itemCodeFilter && params.itemCodeFilter !== "ALL") {
      query.itemCode = params.itemCodeFilter;
    }

    const [records, registeredItems] = await Promise.all([
      FinanceRecord.find(query)
        .populate("category", "name")
        .populate("relatedBranch", "name code")
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .lean(),
      CommunicationItem.find({ shop: shop._id }).lean(),
    ]);

    const registeredMap = new Map<string, any>();
    for (const it of registeredItems) {
      if (it.itemCode) {
        registeredMap.set(it.itemCode.trim().toUpperCase(), it);
      }
    }

    let totalRevenue = 0;
    let totalCost = 0;
    let branchRelatedCount = 0;
    let nonBranchCount = 0;

    const telecomStatsMap: Record<TelecomOperator, {
      operator: TelecomOperator;
      name: string;
      codePrefix: string;
      revenue: number;
      cost: number;
      profit: number;
      quantity: number;
      txCount: number;
      marginPct: number;
    }> = {
      DIALOG: { operator: "DIALOG", name: "Dialog", codePrefix: "D", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      MOBITEL: { operator: "MOBITEL", name: "Mobitel", codePrefix: "M", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      AIRTEL: { operator: "AIRTEL", name: "Airtel", codePrefix: "A", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      HUTCH: { operator: "HUTCH", name: "Hutch", codePrefix: "H", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      OTHER: { operator: "OTHER", name: "Other Items & Services", codePrefix: "*", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
    };

    const itemAggregationMap: Record<string, {
      itemCode: string;
      itemName: string;
      operator: TelecomOperator;
      quantity: number;
      unitCost: number;
      unitSellingPrice: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }> = {};

    for (const r of records) {
      if (r.status === "REJECTED") continue;
      const netVal = r.approvedAmount ?? r.amount;
      const qty = Number(r.quantity || 1);

      const codeKey = (r.itemCode || "").trim().toUpperCase() || "UNLISTED";
      const regDoc = registeredMap.get(codeKey);
      const itemName = r.itemName || regDoc?.name || r.reason || "General Item";

      // If r.actualPrice is 0 or undefined, fallback to registered item actualPrice
      let unitCost = Number(r.actualPrice ?? 0);
      if (unitCost === 0 && regDoc && typeof regDoc.actualPrice === "number") {
        unitCost = regDoc.actualPrice;
      }
      const costVal = unitCost * qty;

      if (r.type === "INCOME") {
        totalRevenue += netVal;
        totalCost += costVal;
      }

      if (r.isRelatedToBranch) {
        branchRelatedCount++;
      } else {
        nonBranchCount++;
      }

      const op = classifyTelecomOperator(codeKey);
      telecomStatsMap[op].revenue += netVal;
      telecomStatsMap[op].cost += costVal;
      telecomStatsMap[op].profit += (netVal - costVal);
      telecomStatsMap[op].quantity += qty;
      telecomStatsMap[op].txCount += 1;

      if (!itemAggregationMap[codeKey]) {
        itemAggregationMap[codeKey] = {
          itemCode: codeKey,
          itemName: itemName,
          operator: op,
          quantity: 0,
          unitCost: unitCost,
          unitSellingPrice: regDoc?.sellingPrice || (qty > 0 ? Number((netVal / qty).toFixed(2)) : netVal),
          revenue: 0,
          cost: 0,
          profit: 0,
          marginPct: 0,
        };
      }

      itemAggregationMap[codeKey].quantity += qty;
      itemAggregationMap[codeKey].revenue += netVal;
      itemAggregationMap[codeKey].cost += costVal;
      itemAggregationMap[codeKey].profit += (netVal - costVal);
    }

    for (const item of Object.values(itemAggregationMap)) {
      item.marginPct = item.revenue > 0 ? Number(((item.profit / item.revenue) * 100).toFixed(1)) : 0;
    }

    for (const opKey of Object.keys(telecomStatsMap) as TelecomOperator[]) {
      const op = telecomStatsMap[opKey];
      op.marginPct = op.revenue > 0 ? Number(((op.profit / op.revenue) * 100).toFixed(1)) : 0;
    }

    const telecomBreakdown = Object.values(telecomStatsMap);
    const netProfit = totalRevenue - totalCost;
    const itemBreakdown = Object.values(itemAggregationMap).sort((a, b) => b.revenue - a.revenue);

    return {
      success: true,
      totalRevenue,
      totalCost,
      netProfit,
      totalTransactions: records.length,
      branchRelatedCount,
      nonBranchCount,
      records: JSON.parse(JSON.stringify(records)),
      itemBreakdown,
      telecomBreakdown,
    };
  } catch (error) {
    console.error("Communication analytics error:", error);
    return { success: false, error: "Failed to fetch communication analytics." };
  }
}
