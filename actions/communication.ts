"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { CommunicationItem } from "@/models/CommunicationItem";
import { Shop } from "@/models/Shop";
import { FinanceRecord } from "@/models/FinanceRecord";
import { ItemWastage } from "@/models/ItemWastage";
import { User } from "@/models/User";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createCommunicationItemSchema,
  updateCommunicationItemSchema,
  recordItemWastageSchema,
  classifyTelecomOperator,
  type TelecomOperator,
} from "@/schemas/communication";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

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

    const code = result.data.itemCode.trim().toUpperCase();
    const name = result.data.name.trim();
    const nameUpper = name.toUpperCase();
    const isTelecomByKeyword = ["DIALOG", "MOBITEL", "AIRTEL", "HUTCH"].some(
      (op) => code.includes(op) || nameUpper.includes(op)
    );
    const isReload = Boolean(result.data.isTelecomReload || (result.data.telecomOperator && result.data.telecomOperator !== "OTHER") || isTelecomByKeyword);
    let operator = result.data.telecomOperator;
    if (isReload && (!operator || operator === "OTHER")) {
      operator = classifyTelecomOperator(code || nameUpper);
    }
    const commissionRate = isReload
      ? Number(result.data.commissionRate && result.data.commissionRate > 0 ? result.data.commissionRate : 4.0)
      : Number(result.data.commissionRate || 0);

    const newItem = await CommunicationItem.create({
      shop: shop._id,
      itemCode: code,
      name,
      actualPrice: isReload ? 0 : Number(result.data.actualPrice || 0),
      sellingPrice: isReload ? 0 : Number(result.data.sellingPrice || 0),
      description: (result.data.description || "").trim(),
      isTelecomReload: isReload,
      telecomOperator: operator,
      commissionRate,
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
        isTelecomReload: newItem.isTelecomReload,
        telecomOperator: newItem.telecomOperator,
        commissionRate: newItem.commissionRate,
      },
    });

    revalidatePath(`/dashboard/admin/shops/${shop._id}`);
    revalidatePath("/dashboard/staff/finances");

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
      isTelecomReload: item.isTelecomReload,
      telecomOperator: item.telecomOperator,
      commissionRate: item.commissionRate,
      isActive: item.isActive,
    };

    const code = result.data.itemCode.trim().toUpperCase();
    const name = result.data.name.trim();
    const nameUpper = name.toUpperCase();
    const isTelecomByKeyword = ["DIALOG", "MOBITEL", "AIRTEL", "HUTCH"].some(
      (op) => code.includes(op) || nameUpper.includes(op)
    );
    const isReload = Boolean(result.data.isTelecomReload || (result.data.telecomOperator && result.data.telecomOperator !== "OTHER") || isTelecomByKeyword);
    let operator = result.data.telecomOperator;
    if (isReload && (!operator || operator === "OTHER")) {
      operator = classifyTelecomOperator(code || nameUpper);
    }
    const commissionRate = isReload
      ? Number(result.data.commissionRate && result.data.commissionRate > 0 ? result.data.commissionRate : 4.0)
      : Number(result.data.commissionRate || 0);

    item.itemCode = code;
    item.name = name;
    item.actualPrice = isReload ? 0 : Number(result.data.actualPrice || 0);
    item.sellingPrice = isReload ? 0 : Number(result.data.sellingPrice || 0);
    item.description = (result.data.description || "").trim();
    item.isTelecomReload = isReload;
    item.telecomOperator = operator;
    item.commissionRate = commissionRate;
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

    revalidatePath(`/dashboard/admin/shops/${item.shop}`);
    revalidatePath("/dashboard/staff/finances");

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

export async function toggleCommunicationItemAction(itemId: string) {
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

    item.isActive = !item.isActive;
    await item.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: item.isActive ? "ENABLE_COMMUNICATION_ITEM" : "DISABLE_COMMUNICATION_ITEM",
      targetType: "CommunicationItem",
      targetId: item._id,
      metadata: { itemCode: item.itemCode, name: item.name, isActive: item.isActive },
    });

    revalidatePath(`/dashboard/admin/shops/${item.shop}`);
    revalidatePath("/dashboard/staff/finances");

    return {
      success: true,
      isActive: item.isActive,
      message: `Item ${item.name} (${item.itemCode}) ${item.isActive ? "enabled" : "disabled"}.`,
    };
  } catch (error) {
    console.error("Toggle item status error:", error);
    return { success: false, error: "Failed to update item status." };
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

    const shopId = item.shop.toString();
    await CommunicationItem.findByIdAndDelete(itemId);

    await logAuditEvent({
      actorId: session.user.id,
      action: "DELETE_COMMUNICATION_ITEM",
      targetType: "CommunicationItem",
      targetId: item._id,
      metadata: { itemCode: item.itemCode, name: item.name },
    });

    revalidatePath(`/dashboard/admin/shops/${shopId}`);
    revalidatePath("/dashboard/staff/finances");

    return {
      success: true,
      message: `Item ${item.name} (${item.itemCode}) removed successfully.`,
    };
  } catch (error) {
    console.error("Delete communication item error:", error);
    return { success: false, error: "Failed to delete item." };
  }
}

export async function recordItemWastageAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const cleanData = sanitizeInput(formData);
  const result = recordItemWastageSchema.safeParse(cleanData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || "Validation failed" };
  }

  try {
    await connectDB();
    const isUserAdmin = isAdmin(session.user as any);

    if (!isUserAdmin) {
      const dbUser = await User.findById(session.user.id).select("shop shops").lean();
      const currentActiveShop = dbUser?.shop ? dbUser.shop.toString() : (session.user as any).shop;
      const assignedIds = (dbUser?.shops || []).map((s: any) => s.toString());
      if (currentActiveShop) assignedIds.push(currentActiveShop);

      if (!assignedIds.includes(result.data.shopId)) {
        return { success: false, error: "You are not authorized to record wastage for this branch." };
      }
    }

    const item = await CommunicationItem.findById(result.data.itemId);
    if (!item) {
      return { success: false, error: "Selected item does not exist." };
    }

    const unitBasePrice = Number(item.actualPrice || 0);
    const totalLoss = Number((result.data.quantity * unitBasePrice).toFixed(2));
    const wastageDate = result.data.date ? new Date(result.data.date) : new Date();

    const wastage = await ItemWastage.create({
      shop: new mongoose.Types.ObjectId(result.data.shopId),
      communicationItem: item._id,
      itemCode: item.itemCode,
      itemName: item.name,
      quantity: result.data.quantity,
      unitBasePrice,
      totalLoss,
      reason: result.data.reason.trim(),
      reportedBy: new mongoose.Types.ObjectId(session.user.id),
      date: wastageDate,
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "RECORD_ITEM_WASTAGE",
      targetType: "ItemWastage",
      targetId: wastage._id,
      metadata: {
        itemCode: item.itemCode,
        itemName: item.name,
        quantity: result.data.quantity,
        unitBasePrice,
        totalLoss,
        reason: result.data.reason,
      },
    });

    revalidatePath("/dashboard/staff/finances");
    revalidatePath(`/dashboard/admin/shops/${result.data.shopId}`);

    return {
      success: true,
      message: `Recorded ${result.data.quantity} units of ${item.name} as wasted (Loss: LKR ${totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}).`,
      wastage: JSON.parse(JSON.stringify(wastage)),
    };
  } catch (error) {
    console.error("Record item wastage error:", error);
    return { success: false, error: "Failed to record item wastage." };
  }
}

export async function getItemWastageAnalyticsAction(params: {
  shopId: string;
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const now = new Date();
    let start: Date;
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (params.period) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
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
        start.setHours(0, 0, 0, 0);
        break;
    }

    const incidents = await ItemWastage.find({
      shop: new mongoose.Types.ObjectId(params.shopId),
      date: { $gte: start, $lte: end },
    })
      .populate("reportedBy", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    let totalWastedUnits = 0;
    let totalMonetaryLoss = 0;
    const itemMap: Record<string, { itemCode: string; itemName: string; unitsWasted: number; totalLoss: number }> = {};

    for (const inc of incidents) {
      totalWastedUnits += inc.quantity || 0;
      totalMonetaryLoss += inc.totalLoss || 0;

      const code = inc.itemCode || "UNKNOWN";
      if (!itemMap[code]) {
        itemMap[code] = {
          itemCode: code,
          itemName: inc.itemName || code,
          unitsWasted: 0,
          totalLoss: 0,
        };
      }
      itemMap[code].unitsWasted += inc.quantity || 0;
      itemMap[code].totalLoss += inc.totalLoss || 0;
    }

    const itemBreakdown = Object.values(itemMap).sort((a, b) => b.totalLoss - a.totalLoss);

    return {
      success: true,
      totalWastedUnits,
      totalMonetaryLoss,
      incidentCount: incidents.length,
      itemBreakdown,
      incidents: JSON.parse(JSON.stringify(incidents)),
    };
  } catch (error) {
    console.error("Get item wastage analytics error:", error);
    return { success: false, error: "Failed to fetch wastage analytics." };
  }
}

export async function getTelecomSalesAnalyticsAction(params: {
  shopId: string;
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  itemCodeFilter?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(params.shopId);
    if (!shop) {
      return { success: false, error: "Shop not found." };
    }

    const now = new Date();
    let start: Date;
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (params.period) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);
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
        start.setHours(0, 0, 0, 0);
        break;
    }

    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
      date: { $gte: start, $lte: end },
      $or: [
        { shop: shop._id, isCrossBranchPayment: { $ne: true } },
        { beneficiaryShop: shop._id, isCrossBranchPayment: true },
      ],
    };

    if (params.itemCodeFilter && params.itemCodeFilter !== "ALL") {
      query.itemCode = params.itemCodeFilter;
    }

    const [records, registeredItems] = await Promise.all([
      FinanceRecord.find(query)
        .populate("category", "name")
        .populate("relatedBranch", "name code")
        .populate("collectingShop", "name code")
        .populate("beneficiaryShop", "name code")
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
      isReload?: boolean;
    }> = {};

    for (const r of records) {
      if (r.status === "REJECTED") continue;
      const netVal = r.approvedAmount ?? r.amount;
      const qty = Number(r.quantity || 1);

      const codeKey = (r.itemCode || "").trim().toUpperCase() || "UNLISTED";
      const regDoc = registeredMap.get(codeKey);
      const itemName = r.itemName || regDoc?.name || r.reason || "General Item";

      const isReload = Boolean(r.isTelecomReload || regDoc?.isTelecomReload);
      let op: TelecomOperator = "OTHER";

      if (r.telecomOperator) {
        op = classifyTelecomOperator(r.telecomOperator);
      } else if (regDoc?.telecomOperator) {
        op = classifyTelecomOperator(regDoc.telecomOperator);
      } else {
        op = classifyTelecomOperator(codeKey);
      }

      // Calculate unit cost and total cost
      let unitCost = Number(r.actualPrice ?? 0);
      let costVal = 0;
      let profitVal = 0;

      if (isReload) {
        const commEarned = r.commissionEarned !== undefined && r.commissionEarned !== null
          ? Number(r.commissionEarned)
          : (r.actualPrice !== undefined ? Math.max(0, netVal - r.actualPrice) : 0);
        profitVal = commEarned;
        costVal = Math.max(0, netVal - commEarned);
        unitCost = qty > 0 ? Number((costVal / qty).toFixed(2)) : costVal;
      } else {
        if (unitCost === 0 && regDoc && typeof regDoc.actualPrice === "number") {
          unitCost = regDoc.actualPrice;
        }
        const addCost = Number(r.additionalCost || 0);
        costVal = (unitCost * qty) + addCost;
        profitVal = netVal - costVal;
      }

      if (r.type === "INCOME") {
        totalRevenue += netVal;
        totalCost += costVal;
      }

      if (r.isRelatedToBranch) {
        branchRelatedCount++;
      } else {
        nonBranchCount++;
      }

      telecomStatsMap[op].revenue += netVal;
      telecomStatsMap[op].cost += costVal;
      telecomStatsMap[op].profit += profitVal;
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
          isReload,
        };
      }

      itemAggregationMap[codeKey].quantity += qty;
      itemAggregationMap[codeKey].revenue += netVal;
      itemAggregationMap[codeKey].cost += costVal;
      itemAggregationMap[codeKey].profit += profitVal;
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

export { getTelecomSalesAnalyticsAction as getCommunicationAnalyticsAction };

