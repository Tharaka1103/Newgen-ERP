"use server";

import { signIn, signOut, auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { User } from "@/models/User";
import { sanitizeInput } from "@/lib/sanitize";
import {
  changePasswordSchema,
  loginSchema,
  updateProfileSchema,
} from "@/schemas/auth";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { logAuditEvent } from "@/lib/audit";

export async function loginAction(formData: unknown) {
  const result = loginSchema.safeParse(formData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Invalid input data",
    };
  }

  const { email, password } = result.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { success: false, error: "Invalid email or password." };
        default:
          return { success: false, error: "Authentication failed. Please try again." };
      }
    }
    return { success: false, error: "An unexpected error occurred during login." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function updateProfileAction(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(data);
  const result = updateProfileSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const updated = await User.findByIdAndUpdate(
      session.user.id,
      {
        name: result.data.name,
        phone: result.data.phone || "",
        avatarUrl: result.data.avatarUrl || null,
      },
      { new: true }
    ).select("-password");

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_PROFILE",
      targetType: "User",
      targetId: session.user.id,
      metadata: { name: result.data.name },
    });

    return { success: true, user: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Profile update error:", error);
    return { success: false, error: "Failed to update profile." };
  }
}

export async function changePasswordAction(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const cleanData = sanitizeInput(data);
  const result = changePasswordSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select("+password");

    if (!user || !user.password) {
      return { success: false, error: "User not found" };
    }

    const isMatch = await bcrypt.compare(
      result.data.currentPassword,
      user.password
    );

    if (!isMatch) {
      return { success: false, error: "Current password is incorrect" };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(result.data.newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: "CHANGE_PASSWORD",
      targetType: "User",
      targetId: session.user.id,
    });

    return { success: true, message: "Password updated successfully" };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, error: "Failed to change password." };
  }
}
