import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
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
        if (user.shop) {
          const shopDoc = await Shop.findById(user.shop).select("name").lean();
          if (shopDoc) {
            shopName = shopDoc.name;
          }
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          shop: user.shop ? user.shop.toString() : null,
          shopName,
        };
      },
    }),
  ],
});
