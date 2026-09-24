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
  })
  .refine(
    (data) => {
      if (data.role === "STAFF" && (!data.shop || data.shop.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Shop assignment is required for Finance Officers (Staff)",
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
  isActive: z.boolean(),
  password: passwordValidation.optional().or(z.literal("")),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const reassignShopSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  shopId: z.string().min(1, "Please select a valid branch/shop"),
});

export type ReassignShopInput = z.infer<typeof reassignShopSchema>;
