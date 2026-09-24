import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Shop } from "../models/Shop";
import { Category, ICategory } from "../models/Category";
import { FinanceRecord } from "../models/FinanceRecord";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/newgen_fms";

async function seed() {
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  console.log("Cleaning existing collections...");
  await User.deleteMany({});
  await Shop.deleteMany({});
  await Category.deleteMany({});
  await FinanceRecord.deleteMany({});

  console.log("Creating default administrator account...");
  const adminPassword = await bcrypt.hash("Admin@12345", 10);
  const admin = await User.create({
    name: "System Administrator",
    email: "admin@newgen.lk",
    password: adminPassword,
    role: "ADMIN",
    phone: "+94 77 123 4567",
    isActive: true,
  });

  console.log("Creating business branches/shops from Excel ledger...");
  const shopsData = [
    { name: "Danuma Branch", code: "D", description: "Danuma Educational Institute", address: "Kandy Road, Matale" },
    { name: "Arunalu Branch", code: "A", description: "Arunalu Higher Education Center", address: "Kurunegala" },
    { name: "Vition Branch", code: "V", description: "Vition Study Complex", address: "Kandy" },
    { name: "Newgen Online School", code: "OS", description: "Online Classes & LMS operations", address: "Colombo Head Office" },
    { name: "Newgenclz Matale", code: "MT", description: "Newgen Class Matale Branch", address: "Matale City Center" },
    { name: "Newgenclz Ankumbura", code: "ANK", description: "Ankumbura Rural Extension", address: "Ankumbura Town" },
    { name: "Teachers Center", code: "TCH", description: "Faculty & Staff Resource Hub", address: "Central Campus" },
    { name: "Central Bank Deposit", code: "BD", description: "Treasury and Bank clearing account", address: "BOC Main Branch" },
  ];

  const createdShops = [];
  for (const shop of shopsData) {
    const s = await Shop.create({
      ...shop,
      createdBy: admin._id,
    });
    createdShops.push(s);
  }

  console.log("Creating expense and income categories with theme tokens...");
  const categoriesData: Array<{
    name: string;
    description: string;
    type: "EXPENSE" | "INCOME";
    colorToken: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
  }> = [
    { name: "Advance Payments", description: "Salary & Supplier advances", type: "EXPENSE", colorToken: "chart-1" },
    { name: "Tea & Refreshments", description: "Daily staff hospitality & tea", type: "EXPENSE", colorToken: "chart-2" },
    { name: "Transport & Traveling", description: "Staff transport and courier fees", type: "EXPENSE", colorToken: "chart-3" },
    { name: "Stationery & Printing", description: "Photocopies, paper, printing", type: "EXPENSE", colorToken: "chart-4" },
    { name: "Bank Deposits", description: "Daily branch cash deposits into bank", type: "INCOME", colorToken: "chart-2" },
    { name: "Utility Bills", description: "Electricity, water, internet", type: "EXPENSE", colorToken: "chart-5" },
    { name: "Student Fees & Course Income", description: "Cash collected for admissions & monthly fees", type: "INCOME", colorToken: "chart-1" },
    { name: "Other Expenses", description: "Miscellaneous daily operational costs", type: "EXPENSE", colorToken: "chart-3" },
  ];

  const createdCategories: any[] = [];
  for (const cat of categoriesData) {
    const c = await Category.create({
      ...cat,
      createdBy: admin._id,
    });
    createdCategories.push(c);
  }

  console.log("Creating Verifier and Staff users...");
  const verifierPassword = await bcrypt.hash("Verifier@12345", 10);
  const verifier = await User.create({
    name: "Finance Verifier Officer",
    email: "verifier@newgen.lk",
    password: verifierPassword,
    role: "VERIFIER",
    phone: "+94 71 987 6543",
    isActive: true,
    createdBy: admin._id,
  });

  const staffPassword = await bcrypt.hash("Staff@12345", 10);
  const danumaShop = createdShops.find((s) => s.code === "D")!;
  const mataleShop = createdShops.find((s) => s.code === "MT")!;

  const staffDanuma = await User.create({
    name: "Danuma Finance Officer",
    email: "staff.danuma@newgen.lk",
    password: staffPassword,
    role: "STAFF",
    shop: danumaShop._id,
    phone: "+94 76 555 1234",
    isActive: true,
    createdBy: admin._id,
  });

  const staffMatale = await User.create({
    name: "Matale Finance Officer",
    email: "staff.matale@newgen.lk",
    password: staffPassword,
    role: "STAFF",
    shop: mataleShop._id,
    phone: "+94 78 333 4444",
    isActive: true,
    createdBy: admin._id,
  });

  console.log("Creating sample finance records (Pending, Approved, Rejected)...");
  const sampleRecords: Array<{
    date: Date;
    shop: mongoose.Types.ObjectId;
    category: mongoose.Types.ObjectId;
    paymentMethod: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";
    billNumber: string;
    reason: string;
    amount: number;
    type: "EXPENSE" | "INCOME";
    status: "PENDING" | "APPROVED" | "REJECTED";
    approvedAmount: number | null;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewRemarks?: string;
    runningBalance: number;
    isLocked: boolean;
    createdBy: mongoose.Types.ObjectId;
  }> = [
    {
      date: new Date(Date.now() - 4 * 86400000),
      shop: danumaShop._id,
      category: createdCategories.find((c) => c.name === "Student Fees & Course Income")!._id,
      paymentMethod: "CASH",
      billNumber: "D-202609-0001",
      reason: "Batch A tuition fee collections",
      amount: 125000,
      type: "INCOME",
      status: "APPROVED",
      approvedAmount: 125000,
      reviewedBy: verifier._id,
      reviewedAt: new Date(Date.now() - 3 * 86400000),
      reviewRemarks: "Verified with bank deposit slip",
      runningBalance: 125000,
      isLocked: true,
      createdBy: staffDanuma._id,
    },
    {
      date: new Date(Date.now() - 3 * 86400000),
      shop: danumaShop._id,
      category: createdCategories.find((c) => c.name === "Tea & Refreshments")!._id,
      paymentMethod: "CASH",
      billNumber: "D-202609-0002",
      reason: "Staff meeting tea & snacks",
      amount: 3200,
      type: "EXPENSE",
      status: "APPROVED",
      approvedAmount: 3200,
      reviewedBy: verifier._id,
      reviewedAt: new Date(Date.now() - 2 * 86400000),
      reviewRemarks: "Approved",
      runningBalance: 121800,
      isLocked: true,
      createdBy: staffDanuma._id,
    },
    {
      date: new Date(Date.now() - 2 * 86400000),
      shop: danumaShop._id,
      category: createdCategories.find((c) => c.name === "Stationery & Printing")!._id,
      paymentMethod: "CASH",
      billNumber: "D-202609-0003",
      reason: "Examination paper printing 500 sheets",
      amount: 7500,
      type: "EXPENSE",
      status: "PENDING",
      approvedAmount: null,
      runningBalance: 114300,
      isLocked: false,
      createdBy: staffDanuma._id,
    },
    {
      date: new Date(Date.now() - 1 * 86400000),
      shop: mataleShop._id,
      category: createdCategories.find((c) => c.name === "Transport & Traveling")!._id,
      paymentMethod: "CASH",
      billNumber: "MT-202609-0001",
      reason: "Visiting lecturer taxi reimbursement",
      amount: 4500,
      type: "EXPENSE",
      status: "PENDING",
      approvedAmount: null,
      runningBalance: -4500,
      isLocked: false,
      createdBy: staffMatale._id,
    },
    {
      date: new Date(Date.now() - 1 * 86400000),
      shop: mataleShop._id,
      category: createdCategories.find((c) => c.name === "Utility Bills")!._id,
      paymentMethod: "ONLINE",
      billNumber: "MT-202609-0002",
      reason: "SLT Fiber internet bill for September",
      amount: 8900,
      type: "EXPENSE",
      status: "REJECTED",
      approvedAmount: null,
      reviewedBy: verifier._id,
      reviewedAt: new Date(),
      reviewRemarks: "Duplicate bill submitted. Already paid from Head Office account.",
      runningBalance: -4500,
      isLocked: true,
      createdBy: staffMatale._id,
    },
  ];

  for (const rec of sampleRecords) {
    await FinanceRecord.create(rec);
  }

  console.log("Database seeded successfully!");
  console.log("-----------------------------------------");
  console.log("ADMIN Credentials:   admin@newgen.lk / Admin@12345");
  console.log("VERIFIER Credentials: verifier@newgen.lk / Verifier@12345");
  console.log("STAFF (Danuma):      staff.danuma@newgen.lk / Staff@12345");
  console.log("STAFF (Matale):      staff.matale@newgen.lk / Staff@12345");
  console.log("-----------------------------------------");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
