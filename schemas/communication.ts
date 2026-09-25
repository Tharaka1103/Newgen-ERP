import { z } from "zod";

export const createCommunicationItemSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  itemCode: z
    .string()
    .min(1, "Item code is required")
    .max(20, "Item code must be under 20 characters")
    .toUpperCase(),
  name: z.string().min(2, "Item name must be at least 2 characters"),
  actualPrice: z.number().min(0, "Unit cost price cannot be negative"),
  description: z.string().optional().or(z.literal("")),
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
  actualPrice: z.number().min(0, "Unit cost price cannot be negative"),
  description: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type UpdateCommunicationItemInput = z.infer<typeof updateCommunicationItemSchema>;
