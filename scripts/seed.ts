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

  console.log("Database seeded successfully!");
  console.log("-----------------------------------------");
  console.log("ADMIN Credentials:   admin@newgen.lk / Admin@12345");
  console.log("-----------------------------------------");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
