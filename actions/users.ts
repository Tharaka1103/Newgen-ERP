"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { Shop } from "@/models/Shop";
import { sanitizeInput } from "@/lib/sanitize";
import {
  createUserSchema,
  updateUserSchema,
  reassignShopSchema,
  switchActiveShopSchema,
} from "@/schemas/user";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export async function getUsersAction() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const users = await User.find()
      .populate("shop", "name code")
      .populate("shops", "name code")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedUsers = users.map((u: any) => {
      let shops = u.shops && Array.isArray(u.shops) ? u.shops : [];
      if (shops.length === 0 && u.shop) {
        shops = [u.shop];
      }
      return {
        ...u,
        shops,
      };
    });

    return {
      success: true,
      users: JSON.parse(JSON.stringify(normalizedUsers)),
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

    let assignedShopIds: mongoose.Types.ObjectId[] = [];
    if (result.data.role === "STAFF") {
      const rawShopIds =
        result.data.shops && result.data.shops.length > 0
          ? result.data.shops
          : result.data.shop
          ? [result.data.shop]
          : [];
      assignedShopIds = rawShopIds.map((id) => new mongoose.Types.ObjectId(id));
    }

    const primaryShop = assignedShopIds.length > 0 ? assignedShopIds[0] : null;

    const newUser = await User.create({
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
      phone: result.data.phone || "",
      role: result.data.role,
      shop: primaryShop,
      shops: assignedShopIds,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_USER",
      targetType: "User",
      targetId: newUser._id,
      metadata: {
        email: newUser.email,
        role: newUser.role,
        shop: newUser.shop,
        shops: assignedShopIds,
      },
    });

    revalidatePath("/dashboard/admin/users");
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

    const user = await User.findById(userId);
    if (!user) return { success: false, error: "User not found." };

    let assignedShopIds: mongoose.Types.ObjectId[] = [];
    let primaryShop: mongoose.Types.ObjectId | null = null;

    if (result.data.role === "STAFF") {
      const rawShopIds =
        result.data.shops && result.data.shops.length > 0
          ? result.data.shops
          : result.data.shop
          ? [result.data.shop]
          : [];
      assignedShopIds = rawShopIds.map((id) => new mongoose.Types.ObjectId(id));

      if (user.shop && assignedShopIds.some((s) => s.toString() === user.shop?.toString())) {
        primaryShop = user.shop;
      } else {
        primaryShop = assignedShopIds.length > 0 ? assignedShopIds[0] : null;
      }
    }

    const updatePayload: Record<string, unknown> = {
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone || "",
      role: result.data.role,
      shop: primaryShop,
      shops: assignedShopIds,
      isActive: result.data.isActive,
    };

    if (result.data.password && result.data.password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updatePayload.password = await bcrypt.hash(result.data.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true })
      .populate("shop", "name code")
      .populate("shops", "name code")
      .select("-password");

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_USER",
      targetType: "User",
      targetId: userId,
      metadata: {
        role: result.data.role,
        isActive: result.data.isActive,
        shops: assignedShopIds,
      },
    });

    revalidatePath("/dashboard/admin/users");
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

    revalidatePath("/dashboard/admin/users");
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
    const user = await User.findById(result.data.userId);
    if (!user) return { success: false, error: "User not found." };

    const selectedIds: string[] =
      result.data.shopIds && result.data.shopIds.length > 0
        ? result.data.shopIds
        : result.data.shopId
        ? [result.data.shopId]
        : [];

    if (selectedIds.length === 0) {
      return { success: false, error: "Please select at least one branch/shop." };
    }

    const assignedObjectIds = selectedIds.map((id) => new mongoose.Types.ObjectId(id));
    const assignedShops = await Shop.find({ _id: { $in: assignedObjectIds } }).select("name code");

    if (assignedShops.length === 0) {
      return { success: false, error: "None of the selected branches exist." };
    }

    const oldShop = user.shop;
    const oldShops = user.shops || [];

    user.shops = assignedShops.map((s) => s._id);

    // If current active shop is still among assigned shops, retain it; otherwise default to first assigned shop
    const isCurrentActiveStillAssigned =
      user.shop && user.shops.some((s) => s.toString() === user.shop?.toString());
    user.shop = isCurrentActiveStillAssigned ? user.shop : user.shops[0];

    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "SHOP_REASSIGN",
      targetType: "User",
      targetId: user._id,
      metadata: {
        oldShop,
        oldShops,
        newShop: user.shop,
        newShops: user.shops,
        shopNames: assignedShops.map((s) => s.name),
      },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard", "layout");

    const branchNames = assignedShops.map((s) => s.name).join(", ");
    return {
      success: true,
      message: `Assigned ${user.name} to ${assignedShops.length} branch${
        assignedShops.length > 1 ? "es" : ""
      }: ${branchNames}`,
    };
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
    const oldShops = user.shops;

    user.shop = null;
    user.shops = [];
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "SHOP_UNASSIGN",
      targetType: "User",
      targetId: user._id,
      metadata: { previousShop: oldShop, previousShops: oldShops },
    });

    revalidatePath("/dashboard/admin/users");
    revalidatePath("/dashboard", "layout");

    return {
      success: true,
      message: `Unassigned all shops from ${user.name}. They cannot create records until reassigned.`,
    };
  } catch (error) {
    console.error("Unassign shop error:", error);
    return { success: false, error: "Failed to unassign shop." };
  }
}

export async function switchActiveShopAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const cleanData = sanitizeInput({ shopId });
  const result = switchActiveShopSchema.safeParse(cleanData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || "Invalid branch ID." };
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const userRole = user.role;
    const isUserAdmin = userRole === "ADMIN";

    const targetShop = await Shop.findById(result.data.shopId).lean();
    if (!targetShop || !targetShop.isActive) {
      return { success: false, error: "The selected branch is inactive or does not exist." };
    }

    if (!isUserAdmin) {
      const assignedIds = (user.shops || []).map((s) => s.toString());
      if (user.shop) assignedIds.push(user.shop.toString());

      if (!assignedIds.includes(result.data.shopId)) {
        return { success: false, error: "You are not assigned to this branch." };
      }
    }

    // Persist new active branch in database
    user.shop = new mongoose.Types.ObjectId(result.data.shopId);

    // Make sure user.shops contains it
    if (!user.shops || user.shops.length === 0) {
      user.shops = [user.shop];
    } else if (!user.shops.some((s) => s.toString() === result.data.shopId)) {
      user.shops.push(user.shop);
    }

    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "SWITCH_ACTIVE_SHOP",
      targetType: "Shop",
      targetId: targetShop._id,
      metadata: { shopName: targetShop.name, shopCode: targetShop.code },
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/staff/finances");
    revalidatePath("/dashboard/staff/dashboard");

    return {
      success: true,
      shopId: targetShop._id.toString(),
      shopName: targetShop.name,
      shopCode: targetShop.code,
      shopType: (targetShop as any).shopType || "STANDARD",
    };
  } catch (error) {
    console.error("Switch active shop error:", error);
    return { success: false, error: "Failed to switch active branch." };
  }
}
