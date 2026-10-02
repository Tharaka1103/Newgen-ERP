import mongoose from "mongoose";
import connectDB from "../lib/mongodb";
import { FinanceRecord } from "../models/FinanceRecord";
import { Shop } from "../models/Shop";
import { recalculateShopRunningBalance } from "../lib/balance";

process.loadEnvFile(".env.local");

export async function revertOct1Settlement() {
  await connectDB();
  const commShop = await Shop.findOne({ code: "AC" }).lean();
  if (!commShop) throw new Error("Arunalu Communication not found");

  const billNumber = "AC-SETTLE-20261001";
  const result = await FinanceRecord.deleteOne({ billNumber, shop: commShop._id });
  console.log(`Deleted settlement record [${billNumber}]:`, result.deletedCount);

  console.log("Recalculating Arunalu Communication balances back to original...");
  await recalculateShopRunningBalance(commShop._id);

  console.log("Revert complete! Arunalu Communication balance restored to original.");
}

// If run directly via CLI
if (process.argv[1]?.includes("revert_oct1_zero")) {
  revertOct1Settlement()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
