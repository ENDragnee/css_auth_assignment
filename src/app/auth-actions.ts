"use server";

import { connectDB } from "@/lib/db";
import { User } from "@/models/models";
import { hashPassword } from "@/lib/password-utils";
import { z } from "zod";
import { authenticator } from "otplib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

// Standardized return type for actions
type ActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

// Password Policy Schema
const RegistrationSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  // Updated .email() syntax to pass an object for the message to avoid deprecation warnings
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 chars" })
    .regex(/[A-Z]/, { message: "Must contain uppercase letter" })
    .regex(/[a-z]/, { message: "Must contain lowercase letter" })
    .regex(/[0-9]/, { message: "Must contain number" })
    .regex(/[^A-Za-z0-9]/, { message: "Must contain special character" }),
  captchaAnswer: z.string(),
  expectedCaptcha: z.string(),
});

export async function registerUser(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const data = Object.fromEntries(formData);

    // 1. CAPTCHA Check
    if (data.captchaAnswer !== data.expectedCaptcha) {
      return { success: false, error: "Incorrect Captcha Answer" };
    }

    // 2. Validate Password Policy
    const validation = RegistrationSchema.safeParse(data);

    if (!validation.success) {
      // Accessing .issues provides a cleaner array of error details
      const firstError = validation.error.issues[0]?.message || "Invalid input";
      return { success: false, error: firstError };
    }

    await connectDB();

    // 3. Check Duplicate
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return { success: false, error: "User already exists" };
    }

    // 4. Hash Password
    const hashedPassword = await hashPassword(data.password as string);

    // 5. Create User
    const newUser = await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: "Employee",
      department: "General",
      status: "Active",
      isVerified: false,
    });

    await logActivity(newUser._id.toString(), newUser.name, "USER_REGISTERED", {
      email: data.email,
    });

    return { success: true, message: "Account created! Please login." };
  } catch (error) {
    console.error("Registration Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

// Generate MFA Secret
export async function generateMfaSecret() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) throw new Error("Unauthorized");

  const secret = authenticator.generateSecret();
  return { secret, email: session.user.email };
}

// Enable MFA
export async function enableMfa(
  secret: string,
  token: string,
): Promise<ActionResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const isValid = authenticator.check(token, secret);
    if (!isValid) return { success: false, error: "Invalid Token" };

    await connectDB();
    await User.findByIdAndUpdate(session.user.id, {
      mfaSecret: secret,
      isMfaEnabled: true,
    });

    await logActivity(
      session.user.id,
      session.user.name || "User",
      "MFA_ENABLED",
      {},
    );

    return { success: true };
  } catch (error) {
    console.error("MFA Enable Error:", error);
    return { success: false, error: "Failed to enable MFA" };
  }
}

// Strict Type for Update Data to avoid 'any'
interface ProfileUpdateData {
  name: string;
  password?: string;
}

// Update Profile / Change Password
export async function updateProfile(
  formData: FormData,
): Promise<ActionResponse> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    // Initialize object with strict type
    const updateData: ProfileUpdateData = { name };

    if (password && password.trim() !== "") {
      // Re-validate password policy if changing
      // We can reuse the password part of the schema
      const passwordSchema = z
        .string()
        .min(8, { message: "Password must be at least 8 chars" })
        .regex(/[A-Z]/, { message: "Must contain uppercase" })
        .regex(/[a-z]/, { message: "Must contain lowercase" })
        .regex(/[0-9]/, { message: "Must contain number" })
        .regex(/[^A-Za-z0-9]/, { message: "Must contain special char" });

      const result = passwordSchema.safeParse(password);

      if (!result.success) {
        return { success: false, error: result.error.issues[0].message };
      }

      updateData.password = await hashPassword(password);
    }

    await connectDB();
    await User.findByIdAndUpdate(session.user.id, updateData);

    await logActivity(
      session.user.id,
      session.user.name || "User",
      "PROFILE_UPDATED",
      {},
    );

    return { success: true, message: "Profile Updated" };
  } catch (error) {
    console.error("Profile Update Error:", error);
    return { success: false, error: "Failed to update profile" };
  }
}
