"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { sanitizeInput } from "@/lib/sanitize";
import { isAdmin } from "@/lib/rbac";
import mongoose from "mongoose";

interface AuditLogFilterParams {
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getAuditLogsAction(params: AuditLogFilterParams = {}) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user as any)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (params.action && params.action !== "ALL") {
      query.action = params.action;
    }

    if (params.targetType && params.targetType !== "ALL") {
      query.targetType = params.targetType;
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
      query.createdAt = dateFilter;
    }

    if (params.search && params.search.trim().length > 0) {
      const cleanSearch = sanitizeInput(params.search.trim());
      query.$or = [
        { actorName: { $regex: cleanSearch, $options: "i" } },
        { actorEmail: { $regex: cleanSearch, $options: "i" } },
        { action: { $regex: cleanSearch, $options: "i" } },
        { "metadata.billNumber": { $regex: cleanSearch, $options: "i" } },
        { "metadata.deletionReason": { $regex: cleanSearch, $options: "i" } },
        { "metadata.editReason": { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      success: true,
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Get audit logs error:", error);
    return { success: false, error: "Failed to fetch audit logs." };
  }
}
