"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { FinanceRecord } from "@/models/FinanceRecord";
import { sanitizeInput } from "@/lib/sanitize";
import { createCategorySchema, updateCategorySchema } from "@/schemas/category";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import mongoose from "mongoose";

export async function getCategoriesAction() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ createdAt: -1 }).lean();

    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const recordsCount = await FinanceRecord.countDocuments({
          category: cat._id,
        });
        return {
          ...cat,
          recordsCount,
        };
      })
    );

    return {
      success: true,
      categories: JSON.parse(JSON.stringify(categoriesWithCounts)),
    };
  } catch (error) {
    console.error("Get categories error:", error);
    return { success: false, error: "Failed to fetch categories." };
  }
}

export async function getActiveCategoriesAction() {
  try {
    await connectDB();
    const categories = await Category.find({ isActive: true })
      .select("_id name type colorToken")
      .sort({ name: 1 })
      .lean();

    return {
      success: true,
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch (error) {
    console.error("Get active categories error:", error);
    return { success: false, error: "Failed to fetch active categories." };
  }
}

export async function createCategoryAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createCategorySchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const existing = await Category.findOne({ name: result.data.name });
    if (existing) {
      return { success: false, error: "A category with this name already exists." };
    }

    const newCategory = await Category.create({
      name: result.data.name,
      description: result.data.description || "",
      type: result.data.type,
      colorToken: result.data.colorToken,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_CATEGORY",
      targetType: "Category",
      targetId: newCategory._id,
      metadata: { name: newCategory.name, type: newCategory.type },
    });

    return { success: true, message: "Category created successfully" };
  } catch (error) {
    console.error("Create category error:", error);
    return { success: false, error: "Failed to create category." };
  }
}

export async function updateCategoryAction(categoryId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateCategorySchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();
    const existing = await Category.findOne({
      name: result.data.name,
      _id: { $ne: new mongoose.Types.ObjectId(categoryId) },
    });

    if (existing) {
      return { success: false, error: "Another category with this name already exists." };
    }

    const updated = await Category.findByIdAndUpdate(
      categoryId,
      {
        name: result.data.name,
        description: result.data.description || "",
        type: result.data.type,
        colorToken: result.data.colorToken,
        isActive: result.data.isActive,
      },
      { new: true }
    );

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_CATEGORY",
      targetType: "Category",
      targetId: categoryId,
      metadata: { name: result.data.name, isActive: result.data.isActive },
    });

    return { success: true, category: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Update category error:", error);
    return { success: false, error: "Failed to update category." };
  }
}

export async function toggleCategoryActiveAction(categoryId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const category = await Category.findById(categoryId);
    if (!category) return { success: false, error: "Category not found." };

    category.isActive = !category.isActive;
    await category.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: category.isActive ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY",
      targetType: "Category",
      targetId: category._id,
    });

    return { success: true, isActive: category.isActive };
  } catch (error) {
    console.error("Toggle category error:", error);
    return { success: false, error: "Failed to toggle category status." };
  }
}
