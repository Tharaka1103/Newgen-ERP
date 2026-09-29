import { z } from "zod";

export const createCommunicationItemSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code must be under 20 characters")
    .toUpperCase(),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  actualPrice: z.number().min(0, "Unit cost price cannot be negative").optional().default(0),
  sellingPrice: z.number().min(0, "Selling unit price cannot be negative").optional().default(0),
  description: z.string().optional().or(z.literal("")),
  isTelecomReload: z.boolean().optional().default(false),
  telecomOperator: z.enum(["DIALOG", "MOBITEL", "AIRTEL", "HUTCH", "OTHER"]).optional().nullable(),
  commissionRate: z.number().min(0, "Commission cannot be negative").max(100, "Commission cannot exceed 100%").optional().default(0),
});

export type CreateCommunicationItemInput = z.infer<typeof createCommunicationItemSchema>;

export const updateCommunicationItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code must be under 20 characters")
    .toUpperCase(),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  actualPrice: z.number().min(0, "Unit cost price cannot be negative").optional().default(0),
  sellingPrice: z.number().min(0, "Selling unit price cannot be negative").optional().default(0),
  description: z.string().optional().or(z.literal("")),
  isTelecomReload: z.boolean().optional().default(false),
  telecomOperator: z.enum(["DIALOG", "MOBITEL", "AIRTEL", "HUTCH", "OTHER"]).optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional().default(0),
  isActive: z.boolean(),
});

export type UpdateCommunicationItemInput = z.infer<typeof updateCommunicationItemSchema>;

export const recordItemWastageSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  itemId: z.string().min(1, "Communication item is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.string().min(2, "Reason / description is required").max(300),
  date: z.string().optional(),
});

export type RecordItemWastageInput = z.infer<typeof recordItemWastageSchema>;

export type TelecomOperator = "DIALOG" | "AIRTEL" | "MOBITEL" | "HUTCH" | "OTHER";

export function classifyTelecomOperator(codeOrOperator?: string): TelecomOperator {
  if (!codeOrOperator) return "OTHER";
  const val = codeOrOperator.trim().toUpperCase();
  if (val.includes("DIALOG")) return "DIALOG";
  if (val.includes("AIRTEL")) return "AIRTEL";
  if (val.includes("MOBITEL")) return "MOBITEL";
  if (val.includes("HUTCH")) return "HUTCH";
  if (val.startsWith("D")) return "DIALOG";
  if (val.startsWith("A")) return "AIRTEL";
  if (val.startsWith("M")) return "MOBITEL";
  if (val.startsWith("H")) return "HUTCH";
  return "OTHER";
}
