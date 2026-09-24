import connectDB from "./mongodb";
import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

interface LogAuditParams {
  actorId: string;
  action: string;
  targetType: "FinanceRecord" | "User" | "Shop" | "Category";
  targetId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent({
  actorId,
  action,
  targetType,
  targetId,
  metadata = {},
  ipAddress = "127.0.0.1",
  userAgent = "Web Client",
}: LogAuditParams) {
  try {
    await connectDB();
    await AuditLog.create({
      actor: new mongoose.Types.ObjectId(actorId),
      action,
      targetType,
      targetId: targetId ? new mongoose.Types.ObjectId(targetId.toString()) : null,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to write to AuditLog:", error);
    // Non-blocking so the main transaction completes even if audit log has an issue
  }
}
