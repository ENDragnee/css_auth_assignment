import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { User as UserModel } from "@/models/models";
import { logActivity } from "@/lib/logger";
import { verifyPassword } from "@/lib/password-utils";

// Module augmentation (Keep as is)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clearanceLevel: number;
      department: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    clearanceLevel: number;
    department: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clearanceLevel: number;
    department: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/", // Directs NextAuth to use our custom page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clearanceLevel = user.clearanceLevel;
        token.department = user.department;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.clearanceLevel = token.clearanceLevel;
        session.user.department = token.department;
        session.user.id = token.id;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // 1. Validate Input
          if (!credentials?.email || !credentials?.password) {
            console.error("Missing credentials");
            return null;
          }

          // 2. Connect DB
          await connectDB();

          // 3. Find User
          const user = await UserModel.findOne({
            email: credentials.email,
          }).select("+password");

          if (!user) {
            console.error("User not found:", credentials.email);
            return null;
          }

          // 4. Verify Password
          const isValid = await verifyPassword(
            credentials.password,
            user.password,
          );

          if (!isValid) {
            console.error("Invalid password for:", credentials.email);
            return null;
          }

          // 5. Log & Return
          await logActivity(user._id.toString(), user.name, "LOGIN_ATTEMPT", {
            status: "Success",
          });

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            clearanceLevel: user.clearanceLevel,
            department: user.department,
          };
        } catch (error) {
          console.error("Auth Error:", error);
          return null; // Return null to trigger 401
        }
      },
    }),
  ],
};
