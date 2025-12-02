import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: { type: String, select: false },

  // RBAC
  role: {
    type: String,
    enum: ["Admin", "Manager", "Employee", "HR"],
    default: "Employee",
  },

  // Security & attributes
  clearanceLevel: { type: Number, default: 1 },
  department: String,
  status: { type: String, default: "Active" },

  // Account Lockout Fields
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // MFA Fields
  mfaSecret: { type: String, select: false },
  isMfaEnabled: { type: Boolean, default: false },

  // Verification
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String, select: false },
});

export const User = models.User || model("User", UserSchema);

// 2. Resource Model (For DAC/MAC simulations)
const ResourceSchema = new Schema({
  name: String,
  content: String,

  // MAC Label
  sensitivityLevel: {
    type: String,
    enum: ["Public", "Internal", "Confidential"],
    default: "Public",
  },

  // DAC Ownership
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});

export const Resource = models.Resource || model("Resource", ResourceSchema);

// 3. Audit Log Model
const LogSchema = new Schema({
  action: String,
  userId: String,
  username: String,
  ip: String,
  timestamp: { type: Date, default: Date.now },
  encryptedDetails: String,
  iv: String,
});

export const AuditLog = models.AuditLog || model("AuditLog", LogSchema);
