import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours session expiry
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.shop = (user as any).shop;
        token.shopName = (user as any).shopName;
        token.shops = (user as any).shops || [];
      }
      if (trigger === "update" && session) {
        if (session.user?.name) token.name = session.user.name;
        if (session.user?.shop !== undefined) token.shop = session.user.shop;
        if (session.user?.shopName !== undefined) token.shopName = session.user.shopName;
        if ((session.user as any)?.shops !== undefined) token.shops = (session.user as any).shops;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).shop = token.shop;
        (session.user as any).shopName = token.shopName;
        (session.user as any).shops = (token as any).shops || [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
