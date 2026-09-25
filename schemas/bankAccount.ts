import { z } from "zod";

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(3, "Account number is required"),
  branch: z.string().optional().or(z.literal("")),
  initialBalance: z.number().min(0, "Initial balance cannot be negative"),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;

export const updateBankAccountSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(3, "Account number is required"),
  branch: z.string().optional().or(z.literal("")),
  isActive: z.boolean(),
});

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

export const bankDepositWithdrawSchema = z.object({
  accountId: z.string().min(1, "Bank account is required"),
  type: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.number().positive("Amount must be greater than 0"),
  referenceNumber: z.string().optional().or(z.literal("")),
  reason: z.string().min(2, "Reason is required"),
  date: z.string().min(1, "Date is required"),
});

export type BankDepositWithdrawInput = z.infer<typeof bankDepositWithdrawSchema>;
