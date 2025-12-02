import crypto from "crypto";
import { AuditLog } from "@/models/models";
import { connectDB } from "@/lib/db";

const ALGORITHM = "aes-256-cbc";

const getEncryptionKey = () => {
  const secret = process.env.LOG_ENCRYPTION_KEY || "fallback_secret_key_123";
  // Hashing to sha256 produces exactly 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
};

export async function logActivity(
  userId: string,
  username: string,
  action: string,
  // Use Record<string, unknown> or unknown instead of 'any' for generic JSON data
  details: Record<string, unknown> | unknown,
  ip: string = "127.0.0.1",
) {
  try {
    await connectDB();

    const iv = crypto.randomBytes(16); // IV must be 16 bytes for AES
    const key = getEncryptionKey(); // Get strict 32-byte key

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // details is safe to stringify even if unknown
    let encrypted = cipher.update(JSON.stringify(details), "utf8", "hex");
    encrypted += cipher.final("hex");

    await AuditLog.create({
      action,
      userId,
      username,
      ip,
      encryptedDetails: encrypted,
      iv: iv.toString("hex"),
    });

    console.log(`[AUDIT] Action: ${action} by ${username} logged.`);
  } catch (error) {
    // Prevent logging failures from crashing the entire app flow
    console.error("Logger Error:", error);
  }
}
