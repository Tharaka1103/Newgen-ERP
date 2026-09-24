import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
]);

export const transactionTypeEnum = z.enum(["EXPENSE", "INCOME"]);

export const financeRecordStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const createFinanceRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shop: z.string().min(1, "Shop is required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: paymentMethodEnum,
  billNumber: z.string().min(1, "Bill number is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: transactionTypeEnum,
});

export type CreateFinanceRecordInput = z.infer<typeof createFinanceRecordSchema>;

export const updateFinanceRecordSchema = z.object({
  recordId: z.string().min(1, "Record ID is required"),
  date: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: paymentMethodEnum,
  billNumber: z.string().min(1, "Bill number is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: transactionTypeEnum,
});

export type UpdateFinanceRecordInput = z.infer<typeof updateFinanceRecordSchema>;

export const reviewFinanceRecordSchema = z
  .object({
    recordId: z.string().min(1, "Record ID is required"),
    status: z.enum(["APPROVED", "REJECTED"]),
    approvedAmount: z.number().optional().nullable(),
    reviewRemarks: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === "REJECTED" && (!data.reviewRemarks || data.reviewRemarks.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Remarks are mandatory when rejecting a transaction",
      path: ["reviewRemarks"],
    }
  );

export type ReviewFinanceRecordInput = z.infer<typeof reviewFinanceRecordSchema>;
