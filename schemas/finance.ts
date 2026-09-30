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
  additionalCost: z.number().min(0).optional(),
  isRelatedToBranch: z.boolean().optional(),
  relatedBranch: z.string().optional().nullable(),
  relatedBranchNote: z.string().optional(),
  isCrossBranchPayment: z.boolean().optional(),
  collectingShop: z.string().optional().nullable(),
  beneficiaryShop: z.string().optional().nullable(),

  // Utility Bill Payment Fields
  isUtilityBill: z.boolean().optional(),
  utilityBillType: z.enum(["ELECTRICITY", "WATER", "OTHER"]).optional().nullable(),
  utilityAccountNumber: z.string().optional().nullable(),
  billAmount: z.number().optional().nullable(),
  serviceCharge: z.number().optional().nullable(),
  providerFee: z.number().optional().nullable(),
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
  additionalCost: z.number().min(0).optional(),
  isRelatedToBranch: z.boolean().optional(),
  relatedBranch: z.string().optional().nullable(),
  relatedBranchNote: z.string().optional(),
  isCrossBranchPayment: z.boolean().optional(),
  collectingShop: z.string().optional().nullable(),
  beneficiaryShop: z.string().optional().nullable(),

  // Utility Bill Payment Fields
  isUtilityBill: z.boolean().optional(),
  utilityBillType: z.enum(["ELECTRICITY", "WATER", "OTHER"]).optional().nullable(),
  utilityAccountNumber: z.string().optional().nullable(),
  billAmount: z.number().optional().nullable(),
  serviceCharge: z.number().optional().nullable(),
  providerFee: z.number().optional().nullable(),
});

export type UpdateFinanceRecordInput = z.infer<typeof updateFinanceRecordSchema>;

export const repayCustomerDebtSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  customerCreditId: z.string().min(1, "Customer is required"),
  amount: z.number().positive("Repayment amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "ONLINE", "CHEQUE"]),
  bankAccountId: z.string().optional().nullable(),
  note: z.string().optional(),
  isCrossBranchPayment: z.boolean().optional(),
  collectingShop: z.string().optional().nullable(),
  beneficiaryShop: z.string().optional().nullable(),
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

export const settleInterBranchCashSchema = z.object({
  recordIds: z.array(z.string()).min(1, "At least one record must be selected for settlement"),
  holdingShopId: z.string().min(1, "Holding branch is required"),
  targetShopId: z.string().optional().nullable(),
  settlementType: z.enum(["HANDOVER_TO_BRANCH", "DEPOSITED_TO_BANK", "DIRECT_OFFSET"]),
  bankAccountId: z.string().optional().nullable(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

export type SettleInterBranchCashInput = z.infer<typeof settleInterBranchCashSchema>;

export const utilityBillTypeEnum = z.enum(["ELECTRICITY", "WATER", "OTHER"]);
export type UtilityBillType = z.infer<typeof utilityBillTypeEnum>;

export const recordUtilityBillPaymentSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  billType: utilityBillTypeEnum,
  accountNumber: z.string().min(1, "Account or reference number is required").max(60),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  billAmount: z.number().positive("Bill amount must be greater than 0"),
  serviceCharge: z.number().min(0, "Service charge cannot be negative").optional(),
  providerFee: z.number().min(0, "Provider fee cannot be negative").optional(),
  paymentMethod: paymentMethodEnum.optional().default("CASH"),
  bankAccountId: z.string().optional().nullable(),
  note: z.string().optional(),
  date: z.string().optional(),
});

export type RecordUtilityBillPaymentInput = z.infer<typeof recordUtilityBillPaymentSchema>;

/**
 * Calculates utility bill charges based on business rules:
 * - Bill <= 5000: provider fee = 18, customer service charge = 30, profit = 12
 * - Bill > 5000:  provider fee = 23, customer service charge = 40, profit = 17
 */
export function calculateUtilityBillCharges(billAmount: number) {
  const safeBill = Math.max(0, Number(billAmount) || 0);
  const isOver5000 = safeBill > 5000;
  const serviceCharge = safeBill > 0 ? (isOver5000 ? 40 : 30) : 0;
  const providerFee = safeBill > 0 ? (isOver5000 ? 23 : 18) : 0;
  const totalCustomerPaid = safeBill + serviceCharge;
  const costToShop = safeBill + providerFee;
  const profit = serviceCharge - providerFee;

  return {
    isOver5000,
    serviceCharge,
    providerFee,
    totalCustomerPaid,
    costToShop,
    profit,
  };
}
