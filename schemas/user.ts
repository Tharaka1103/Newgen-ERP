import { z } from "zod";
import { passwordValidation } from "./auth";

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address").toLowerCase(),
    password: passwordValidation,
    phone: z.string().optional().or(z.literal("")),
    role: z.enum(["STAFF", "VERIFIER", "ADMIN"]),
    shop: z.string().optional().nullable(),
    shops: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.role === "STAFF") {
        const hasSingleShop = Boolean(data.shop && data.shop.trim() !== "");
        const hasMultipleShops = Boolean(data.shops && data.shops.length > 0);
        return hasSingleShop || hasMultipleShops;
      }
      return true;
    },
    {
      message: "At least one branch assignment is required for Finance Officers (Staff)",
      path: ["shop"],
    }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").toLowerCase(),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum(["STAFF", "VERIFIER", "ADMIN"]),
  shop: z.string().optional().nullable(),
  shops: z.array(z.string()).optional(),
  isActive: z.boolean(),
  password: passwordValidation.optional().or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const reassignShopSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    shopId: z.string().optional(),
    shopIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      const hasShopId = Boolean(data.shopId && data.shopId.trim() !== "");
      const hasShopIds = Boolean(data.shopIds && data.shopIds.length > 0);
      return hasShopId || hasShopIds;
    },
    {
      message: "Please select at least one branch/shop",
      path: ["shopIds"],
    }
  );

export type ReassignShopInput = z.infer<typeof reassignShopSchema>;

export const switchActiveShopSchema = z.object({
  shopId: z.string().min(1, "Valid branch ID is required"),
});

export type SwitchActiveShopInput = z.infer<typeof switchActiveShopSchema>;
