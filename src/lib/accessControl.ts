import { connectDB } from "./db";
import { Resource } from "../models/models";
import { Types } from "mongoose";

// Interface for the user object in ABAC checks
interface AbacUser {
  department: string;
  status?: string;
  [key: string]: unknown; // Allow other properties
}

// 1. MAC: Security Labels
export const checkMAC = (
  userClearance: number,
  resourceSensitivity: "Public" | "Internal" | "Confidential",
) => {
  const levels = { Public: 1, Internal: 2, Confidential: 3 };
  const requiredLevel = levels[resourceSensitivity];
  return userClearance >= requiredLevel;
};

// 2. DAC: Ownership
export const checkDAC = async (userId: string, resourceId: string) => {
  await connectDB();
  const resource = await Resource.findById(resourceId);
  if (!resource) return false;

  // Check Owner
  if (resource.ownerId.toString() === userId) return true;

  // Check Shared List
  // We use .some() and .toString() to safely compare Mongoose ObjectIds with the string userId
  const isShared = resource.sharedWith.some(
    (id: Types.ObjectId | string) => id.toString() === userId,
  );

  if (isShared) return true;

  return false;
};

// 3. RBAC: Roles
export const checkRBAC = (userRole: string, requiredRole: string) => {
  // If user is Admin, they pass everything (Global Override)
  if (userRole === "Admin") return true;

  // Otherwise, strict equality match
  return userRole === requiredRole;
};

// 4. RuBAC: Rules (Time/Context)
export const checkRuBAC = () => {
  const now = new Date();
  const hour = now.getHours();
  // Rule: Access only between 9 AM and 5 PM (17:00)
  if (hour >= 9 && hour < 17) return true;
  return false;
};

// 5. ABAC: Attributes
export const checkABAC = (user: AbacUser, actionType: string) => {
  // Example Policy: Payroll Dept can view Salary, but only if Active
  if (actionType === "VIEW_SALARY") {
    return user.department === "Payroll" && user.status === "Active";
  }
  // Example Policy: IT Dept can Access Server Config
  if (actionType === "ACCESS_SERVER") {
    return user.department === "IT";
  }
  return false;
};
