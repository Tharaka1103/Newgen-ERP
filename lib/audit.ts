import connectDB from "./mongodb";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import mongoose from "mongoose";

interface LogAuditParams {
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  targetType: "FinanceRecord" | "User" | "Shop" | "Category" | "BankAccount" | "PettyCashAccount" | "CommunicationItem";
  targetId?: string | mongoose.Types.ObjectId | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent({
  actorId,
  actorName,
  actorEmail,
  actorRole,
  action,
  targetType,
  targetId,
  metadata = {},
  ipAddress = "127.0.0.1",
  userAgent = "Web Client",
}: LogAuditParams) {
  try {
    await connectDB();

    let finalActorName = actorName;
    let finalActorEmail = actorEmail;
    let finalActorRole = actorRole;

    if (!finalActorName || !finalActorEmail) {
      try {
        const user = await User.findById(actorId).select("name email role").lean();
        if (user) {
          finalActorName = finalActorName || user.name;
          finalActorEmail = finalActorEmail || user.email;
          finalActorRole = finalActorRole || user.role;
        }
      } catch {
        // Fallback silently if user lookup fails
      }
    }

    await AuditLog.create({
      actor: new mongoose.Types.ObjectId(actorId),
      actorName: finalActorName || "System User",
      actorEmail: finalActorEmail || "",
      actorRole: finalActorRole || "",
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
