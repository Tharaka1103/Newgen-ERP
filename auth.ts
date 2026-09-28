import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { authConfig } from "./auth.config";
import connectDB from "./lib/mongodb";
import { User } from "./models/User";
import { Shop } from "./models/Shop";
import { sanitizeInput } from "./lib/sanitize";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = sanitizeInput(
          String(credentials.email).toLowerCase().trim()
        );
        const password = String(credentials.password);

        await connectDB();

        const user = await User.findOne({ email }).select("+password").lean();

        if (!user || !user.password) {
          return null;
        }

        if (!user.isActive) {
          throw new Error("Account has been deactivated. Please contact your administrator.");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return null;
        }

        // Update last login timestamp
        await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

        let shopName: string | null = null;
        let assignedShops: Array<{ _id: string; name: string; code: string; shopType?: string }> = [];

        if (user.shops && user.shops.length > 0) {
          const shopDocs = await Shop.find({ _id: { $in: user.shops }, isActive: true })
            .select("name code shopType")
            .lean();
          assignedShops = shopDocs.map((s) => ({
            _id: s._id.toString(),
            name: s.name,
            code: s.code,
            shopType: (s as any).shopType || "STANDARD",
          }));
        } else if (user.shop) {
          const shopDoc = await Shop.findById(user.shop).select("name code shopType").lean();
          if (shopDoc) {
            assignedShops = [
              {
                _id: shopDoc._id.toString(),
                name: shopDoc.name,
                code: shopDoc.code,
                shopType: (shopDoc as any).shopType || "STANDARD",
              },
            ];
            await User.updateOne({ _id: user._id }, { $set: { shops: [user.shop] } });
          }
        }

        let activeShopId: string | null = user.shop ? user.shop.toString() : null;
        let activeShop = assignedShops.find((s) => s._id === activeShopId);
        if (!activeShop && assignedShops.length > 0) {
          activeShop = assignedShops[0];
          activeShopId = activeShop._id;
          await User.updateOne(
            { _id: user._id },
            { $set: { shop: new mongoose.Types.ObjectId(activeShopId) } }
          );
        }
        shopName = activeShop ? activeShop.name : null;

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          shop: activeShopId,
          shopName,
          shops: assignedShops,
        };
      },
    }),
  ],
});
