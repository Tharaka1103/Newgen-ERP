import { z } from "zod";

export const createInventoryItemSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code cannot exceed 20 characters")
    .toUpperCase(),
  category: z.string().optional().default("General"),
  quantity: z.number().min(0, "Stock quantity cannot be negative"),
  unit: z.string().min(1, "Unit of measurement is required").default("pcs"),
  unitPrice: z.number().min(0, "Unit price cannot be negative").default(0),
  minStockThreshold: z.number().min(0, "Minimum threshold cannot be negative").default(5),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code cannot exceed 20 characters")
    .toUpperCase(),
  category: z.string().optional().default("General"),
  quantity: z.number().min(0, "Stock quantity cannot be negative"),
  unit: z.string().min(1, "Unit of measurement is required").default("pcs"),
  unitPrice: z.number().min(0, "Unit price cannot be negative").default(0),
  minStockThreshold: z.number().min(0, "Minimum threshold cannot be negative").default(5),
  description: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
});

export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const recordInventoryUsageSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  itemId: z.string().min(1, "Please select an inventory item"),
  quantityUsed: z.number().min(1, "Quantity used must be at least 1"),
  purpose: z.string().min(2, "Usage purpose, department, or reason is required"),
  date: z.string().min(1, "Date is required"),
  note: z.string().optional().or(z.literal("")),
});

export type RecordInventoryUsageInput = z.infer<typeof recordInventoryUsageSchema>;
