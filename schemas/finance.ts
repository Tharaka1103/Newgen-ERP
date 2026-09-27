import { z } from "zod";

export const paymentMethodEnum = z.enum([
  "CASH",
  "CREDIT",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
  "PETTY_CASH",
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
  bankAccount: z.string().optional().nullable(),
  billNumber: z.string().min(1, "Bill number is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: transactionTypeEnum,

  // Customer Credit Fields
  customerCredit: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  isDebtRepayment: z.boolean().optional(),

  // Communication Shop Fields
  isCommunicationItem: z.boolean().optional(),
  communicationItem: z.string().optional().nullable(),
  itemCode: z.string().optional().nullable(),
  itemName: z.string().optional().nullable(),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
  actualPrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  discountPrice: z.number().optional(),
  isRelatedToBranch: z.boolean().optional(),
  relatedBranch: z.string().optional().nullable(),
  relatedBranchNote: z.string().optional(),
});

export type CreateFinanceRecordInput = z.infer<typeof createFinanceRecordSchema>;

export const updateFinanceRecordSchema = z.object({
  recordId: z.string().min(1, "Record ID is required"),
  date: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: paymentMethodEnum,
  bankAccount: z.string().optional().nullable(),
  billNumber: z.string().min(1, "Bill number is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: transactionTypeEnum,

  // Customer Credit Fields
  customerCredit: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  isDebtRepayment: z.boolean().optional(),

  // Communication Shop Fields
  isCommunicationItem: z.boolean().optional(),
  communicationItem: z.string().optional().nullable(),
  itemCode: z.string().optional().nullable(),
  itemName: z.string().optional().nullable(),
  quantity: z.number().min(1, "Quantity must be at least 1").optional(),
  actualPrice: z.number().optional(),
  sellingPrice: z.number().optional(),
  discountPrice: z.number().optional(),
  isRelatedToBranch: z.boolean().optional(),
  relatedBranch: z.string().optional().nullable(),
  relatedBranchNote: z.string().optional(),
});

export type UpdateFinanceRecordInput = z.infer<typeof updateFinanceRecordSchema>;

export const repayCustomerDebtSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  customerCreditId: z.string().min(1, "Customer is required"),
  amount: z.number().positive("Repayment amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
  bankAccountId: z.string().optional().nullable(),
  note: z.string().optional(),
});

export type RepayCustomerDebtInput = z.infer<typeof repayCustomerDebtSchema>;

export const adminEditFinanceRecordSchema = z.object({
  recordId: z.string().min(1, "Record ID is required"),
  date: z.string().min(1, "Date is required"),
  shop: z.string().min(1, "Shop is required"),
  category: z.string().min(1, "Category is required"),
  paymentMethod: paymentMethodEnum,
  bankAccount: z.string().optional().nullable(),
  billNumber: z.string().min(1, "Bill number is required"),
  reason: z.string().min(2, "Reason must be at least 2 characters"),
  amount: z.number().positive("Amount must be greater than 0"),
  type: transactionTypeEnum,
  status: financeRecordStatusEnum,
  approvedAmount: z.number().optional().nullable(),
  quantity: z.number().optional(),
  editReason: z.string().min(2, "Reason for edit is required for audit logs"),
});

export type AdminEditFinanceRecordInput = z.infer<typeof adminEditFinanceRecordSchema>;

export const adminDeleteFinanceRecordSchema = z.object({
  recordId: z.string().min(1, "Record ID is required"),
  deletionReason: z.string().min(3, "Reason for deletion is required for audit logs"),
});

export type AdminDeleteFinanceRecordInput = z.infer<typeof adminDeleteFinanceRecordSchema>;

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
