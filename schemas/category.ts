import { z } from "zod";

export const colorTokenEnum = z.enum([
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
]);

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["EXPENSE", "INCOME"]),
  colorToken: colorTokenEnum,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["EXPENSE", "INCOME"]),
  colorToken: colorTokenEnum,
  isActive: z.boolean(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
