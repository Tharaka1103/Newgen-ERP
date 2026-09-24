"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import { Category } from "@/models/Category";
import { User } from "@/models/User";
import mongoose from "mongoose";

interface AnalyticsParams {
  period?: "today" | "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
  shopId?: string;
  categoryId?: string;
}

export async function getSummaryAnalyticsAction(params: AnalyticsParams = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  const userShop = (session.user as { shop?: string }).shop;

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

    const query: Record<string, unknown> = {
      date: { $gte: start, $lte: end },
    };

    if (role === "STAFF") {
      if (!userShop) {
        return {
          success: true,
          kpis: {
            totalTransactions: 0,
            totalExpense: 0,
            totalIncome: 0,
            pendingApprovals: 0,
            approvedAmount: 0,
            rejectedAmount: 0,
            netBalance: 0,
          },
          timelineData: [],
          shopComparisonData: [],
          categoryBreakdownData: [],
          records: [],
        };
      }
      query.shop = new mongoose.Types.ObjectId(userShop);
    } else if (params.shopId && params.shopId !== "ALL") {
      query.shop = new mongoose.Types.ObjectId(params.shopId);
    }

    if (params.categoryId && params.categoryId !== "ALL") {
      query.category = new mongoose.Types.ObjectId(params.categoryId);
    }

    const records = await FinanceRecord.find(query)
      .populate("shop", "name code")
      .populate("category", "name type colorToken")
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // 1. Calculate KPIs
    let totalTransactions = records.length;
    let totalExpense = 0;
    let totalIncome = 0;
    let pendingApprovals = 0;
    let approvedAmount = 0;
    let rejectedAmount = 0;

    for (const rec of records) {
      const amt = rec.status === "APPROVED" && typeof rec.approvedAmount === "number"
        ? rec.approvedAmount
        : rec.amount;

      if (rec.status === "PENDING") {
        pendingApprovals += 1;
      } else if (rec.status === "APPROVED") {
        approvedAmount += amt;
      } else if (rec.status === "REJECTED") {
        rejectedAmount += rec.amount;
      }

      // Cash flow calculations (Approved or tentative)
      if (rec.status !== "REJECTED") {
        if (rec.type === "INCOME") {
          totalIncome += amt;
        } else {
          totalExpense += amt;
        }
      }
    }

    const netBalance = totalIncome - totalExpense;

    // 2. Timeline Aggregation (Day-by-Day)
    const timelineMap: Record<string, { date: string; income: number; expense: number }> = {};
    for (const rec of records) {
      if (rec.status === "REJECTED") continue;
      const d = new Date(rec.date);
      let dateKey: string;
      if (params.period === "year") {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")} (${monthNames[d.getMonth()]})`;
      } else {
        dateKey = d.toISOString().split("T")[0];
      }
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }
      const amt = rec.status === "APPROVED" && typeof rec.approvedAmount === "number"
        ? rec.approvedAmount
        : rec.amount;

      if (rec.type === "INCOME") {
        timelineMap[dateKey].income += amt;
      } else {
        timelineMap[dateKey].expense += amt;
      }
    }
    const timelineData = Object.values(timelineMap).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Shop-Wise Breakdown
    const allShops = await Shop.find({ isActive: true }).select("_id name code").lean();
    const shopMap: Record<string, { shop: string; code: string; income: number; expense: number; count: number }> = {};
    for (const s of allShops) {
      shopMap[s._id.toString()] = { shop: s.name, code: s.code, income: 0, expense: 0, count: 0 };
    }

    for (const rec of records) {
      if (rec.status === "REJECTED") continue;
      const sId = rec.shop ? (rec.shop as any)._id?.toString() || rec.shop.toString() : null;
      if (sId && shopMap[sId]) {
        const amt = rec.status === "APPROVED" && typeof rec.approvedAmount === "number"
          ? rec.approvedAmount
          : rec.amount;
        shopMap[sId].count += 1;
        if (rec.type === "INCOME") {
          shopMap[sId].income += amt;
        } else {
          shopMap[sId].expense += amt;
        }
      }
    }
    const shopComparisonData = Object.values(shopMap).filter((item) => item.count > 0 || (params.shopId === "ALL" || !params.shopId));

    // 4. Category Breakdown
    const catMap: Record<string, { category: string; colorToken: string; total: number; type: string; count: number }> = {};
    for (const rec of records) {
      if (rec.status === "REJECTED") continue;
      const cat = rec.category as any;
      const catName = cat?.name || "Uncategorized";
      const colorToken = cat?.colorToken || "chart-1";
      const amt = rec.status === "APPROVED" && typeof rec.approvedAmount === "number"
        ? rec.approvedAmount
        : rec.amount;

      if (!catMap[catName]) {
        catMap[catName] = { category: catName, colorToken, total: 0, type: rec.type, count: 0 };
      }
      catMap[catName].total += amt;
      catMap[catName].count += 1;
    }
    const categoryBreakdownData = Object.values(catMap).sort((a, b) => b.total - a.total);

    return {
      success: true,
      kpis: {
        totalTransactions,
        totalExpense,
        totalIncome,
        pendingApprovals,
        approvedAmount,
        rejectedAmount,
        netBalance,
      },
      timelineData,
      shopComparisonData,
      categoryBreakdownData,
      records: JSON.parse(JSON.stringify(records)),
    };
  } catch (error) {
    console.error("Summary analytics error:", error);
    return { success: false, error: "Failed to generate analytics report." };
  }
}
