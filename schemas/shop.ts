import { z } from "zod";

export const createShopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be at most 10 characters")
    .toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;

export const updateShopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters"),
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be at most 10 characters")
    .toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type UpdateShopInput = z.infer<typeof updateShopSchema>;
