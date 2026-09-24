"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { Shop } from "@/models/Shop";
import { sanitizeInput } from "@/lib/sanitize";
import { createUserSchema, updateUserSchema, reassignShopSchema } from "@/schemas/user";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export async function getUsersAction() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const users = await User.find()
      .populate("shop", "name code")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      users: JSON.parse(JSON.stringify(users)),
    };
  } catch (error) {
    console.error("Get users error:", error);
    return { success: false, error: "Failed to fetch users." };
  }
}

export async function createUserAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createUserSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email: result.data.email });
    if (existing) {
      return { success: false, error: "A user with this email address already exists." };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(result.data.password, salt);

    const newUser = await User.create({
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
      phone: result.data.phone || "",
      role: result.data.role,
      shop: result.data.role === "STAFF" && result.data.shop ? new mongoose.Types.ObjectId(result.data.shop) : null,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_USER",
      targetType: "User",
      targetId: newUser._id,
      metadata: { email: newUser.email, role: newUser.role, shop: newUser.shop },
    });

    return { success: true, message: "User created successfully" };
  } catch (error) {
    console.error("Create user error:", error);
    return { success: false, error: "Failed to create user." };
  }
}

export async function updateUserAction(userId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateUserSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existingEmail = await User.findOne({
      email: result.data.email,
      _id: { $ne: new mongoose.Types.ObjectId(userId) },
    });

    if (existingEmail) {
      return { success: false, error: "Another user with this email address already exists." };
    }

    const updatePayload: Record<string, unknown> = {
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || "",
      role: result.data.role,
      shop: result.data.role === "STAFF" && result.data.shop ? new mongoose.Types.ObjectId(result.data.shop) : null,
      isActive: result.data.isActive,
    };

    if (result.data.password && result.data.password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.password = await bcrypt.hash(result.data.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true }).select("-password");

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_USER",
      targetType: "User",
      targetId: userId,
      metadata: { role: result.data.role, isActive: result.data.isActive },
    });

    return { success: true, user: JSON.parse(JSON.stringify(updatedUser)) };
  } catch (error) {
    console.error("Update user error:", error);
    return { success: false, error: "Failed to update user." };
  }
}

export async function toggleUserActiveAction(userId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  if (session.user.id === userId) {
    return { success: false, error: "You cannot deactivate your own administrative account." };
  }

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found." };

    user.isActive = !user.isActive;
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: user.isActive ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      targetType: "User",
      targetId: user._id,
    });

    return { success: true, isActive: user.isActive };
  } catch (error) {
    console.error("Toggle user error:", error);
    return { success: false, error: "Failed to toggle user status." };
  }
}

export async function reassignShopAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = reassignShopSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(result.data.shopId);
    if (!shop) return { success: false, error: "Selected shop does not exist." };

    const user = await User.findById(result.data.userId);
    if (!user) return { success: false, error: "User not found." };

    const oldShop = user.shop;
    user.shop = new mongoose.Types.ObjectId(result.data.shopId);
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "SHOP_REASSIGN",
      targetType: "User",
      targetId: user._id,
      metadata: { oldShop, newShop: result.data.shopId, shopName: shop.name },
    });

    return { success: true, message: `Reassigned ${user.name} to ${shop.name}` };
  } catch (error) {
    console.error("Reassign shop error:", error);
    return { success: false, error: "Failed to reassign shop." };
  }
}

export async function unassignShopAction(userId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found." };

    const oldShop = user.shop;
    user.shop = null;
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "SHOP_UNASSIGN",
      targetType: "User",
      targetId: user._id,
      metadata: { previousShop: oldShop },
    });

    return { success: true, message: `Unassigned shop from ${user.name}. They cannot create records until reassigned.` };
  } catch (error) {
    console.error("Unassign shop error:", error);
    return { success: false, error: "Failed to unassign shop." };
  }
}
