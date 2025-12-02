import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { User as UserModel } from "@/models/models";
import { logActivity } from "@/lib/logger";
import { verifyPassword } from "@/lib/password-utils";
import { authenticator } from "otplib";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      clearanceLevel: number;
      department: string;
      isMfaEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    clearanceLevel: number;
    department: string;
    isMfaEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    clearanceLevel: number;
    department: string;
    isMfaEnabled: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" }, // Token-based authentication
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clearanceLevel = user.clearanceLevel;
        token.department = user.department;
        token.id = user.id;
        token.isMfaEnabled = user.isMfaEnabled;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.clearanceLevel = token.clearanceLevel;
        session.user.department = token.department;
        session.user.id = token.id;
        session.user.isMfaEnabled = token.isMfaEnabled;
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
        mfaCode: { label: "MFA Code", type: "text" }, // New Field
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          await connectDB();

          // 1. Fetch User
          const user = await UserModel.findOne({
            email: credentials.email,
          }).select("+password +mfaSecret");

          if (!user) {
            // For security, do not reveal user existence, but we log it internally
            return null;
          }

          // 2. Check Account Lockout Policy
          if (user.lockUntil && user.lockUntil > new Date()) {
            throw new Error(
              `Account locked. Try again after ${user.lockUntil.toLocaleTimeString()}`,
            );
          }

          // 3. Verify Password
          const isValid = await verifyPassword(
            credentials.password,
            user.password,
          );

          if (!isValid) {
            // Increment Failed Attempts
            user.loginAttempts += 1;

            // Lockout Policy: Lock for 15 mins after 5 failed attempts
            if (user.loginAttempts >= 5) {
              user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
              await user.save();
              throw new Error(
                "Account locked due to too many failed attempts.",
              );
            }

            await user.save();
            throw new Error("Invalid credentials");
          }

          // 4. MFA Verification (If Enabled)
          if (user.isMfaEnabled) {
            if (!credentials.mfaCode) {
              // Signal to frontend that MFA is required
              throw new Error("MFA_REQUIRED");
            }

            const isValidToken = authenticator.check(
              credentials.mfaCode,
              user.mfaSecret,
            );
            if (!isValidToken) {
              throw new Error("Invalid MFA Code");
            }
          }

          // 5. Successful Login -> Reset Lockout
          user.loginAttempts = 0;
          user.lockUntil = undefined;
          await user.save();

          await logActivity(user._id.toString(), user.name, "LOGIN_SUCCESS", {
            status: "Success",
            mfaUsed: user.isMfaEnabled,
          });

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            clearanceLevel: user.clearanceLevel,
            department: user.department,
            isMfaEnabled: user.isMfaEnabled,
          };
        } catch (error) {
          console.error("Auth Logic Error:", error);
          throw error; // Rethrow to display message to user
        }
      },
    }),
  ],
};
