import { z } from "zod";

export const pettyCashTransactionSchema = z.object({
  type: z.enum(["TOP_UP", "WITHDRAWAL"]),
  amount: z.number().positive("Amount must be greater than 0"),
  reason: z.string().min(2, "Reason is required"),
  date: z.string().min(1, "Date is required"),
  sourceBankAccount: z.string().optional().nullable(),
});

export type PettyCashTransactionInput = z.infer<typeof pettyCashTransactionSchema>;
