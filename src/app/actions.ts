"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Resource } from "@/models/models";
import {
  checkMAC,
  checkDAC,
  checkRBAC,
  checkRuBAC,
  checkABAC,
} from "@/lib/accessControl";
import { logActivity } from "@/lib/logger";

// Define strict types for the payload
type AccessType = "MAC" | "DAC" | "RBAC" | "RuBAC" | "ABAC";

interface AccessPayload {
  sensitivity?: "Public" | "Internal" | "Confidential";
  resourceId?: string;
  requiredRole?: string;
  action?: string;
}

interface AccessResult {
  allowed: boolean;
  reason: string;
}

export async function checkAccess(
  type: AccessType,
  payload: AccessPayload,
): Promise<AccessResult> {
  // 1. Get Session using the authOptions config
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return { allowed: false, reason: "Not Authenticated" };
  }

  const user = session.user;

  let allowed = false;
  let reason = "";

  try {
    switch (type) {
      case "MAC":
        if (!payload.sensitivity) throw new Error("Missing sensitivity level");
        allowed = checkMAC(user.clearanceLevel, payload.sensitivity);
        reason = allowed
          ? "Clearance Level Sufficient"
          : `Clearance Level ${user.clearanceLevel} too low for ${payload.sensitivity}`;
        break;

      case "DAC":
        if (!payload.resourceId) throw new Error("Missing resource ID");
        allowed = await checkDAC(user.id, payload.resourceId);
        reason = allowed
          ? "You are Owner or have Shared access"
          : "No Discretionary Access granted";
        break;

      case "RBAC":
        if (!payload.requiredRole) throw new Error("Missing required role");
        allowed = checkRBAC(user.role, payload.requiredRole);
        reason = allowed
          ? "Role Match"
          : `User role ${user.role} != ${payload.requiredRole}`;
        break;

      case "RuBAC":
        allowed = checkRuBAC();
        reason = allowed
          ? "Accessing within working hours (9-17)"
          : "Access denied: Outside working hours";
        break;

      case "ABAC":
        if (!payload.action) throw new Error("Missing action type");
        allowed = checkABAC({ ...user, status: "Active" }, payload.action);
        reason = allowed
          ? "Attributes Match Policy"
          : "Attributes do not match policy";
        break;

      default:
        return { allowed: false, reason: "Invalid Access Type" };
    }

    await logActivity(
      user.id,
      user.name || "Unknown",
      `${type}_ACCESS_ATTEMPT`,
      {
        payload,
        allowed,
        reason,
      },
    );

    return { allowed, reason };
  } catch (error: unknown) {
    console.error("Access Check Error:", error);
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Internal Server Error",
    };
  }
}

// Define return type for frontend
interface ResourceItem {
  _id: string;
  name: string;
  sensitivityLevel: string;
  ownerId: string;
  sharedWith: string[];
}

// Define the shape of the raw Mongoose document
interface LeanResource {
  _id: { toString: () => string };
  name: string;
  sensitivityLevel: string;
  ownerId?: { toString: () => string };
  sharedWith?: { toString: () => string }[];
}

export async function getResources(): Promise<ResourceItem[]> {
  await connectDB();

  // Cast the result to the interface instead of default any
  const resources = (await Resource.find(
    {},
  ).lean()) as unknown as LeanResource[];

  return resources.map((r) => ({
    _id: r._id.toString(),
    name: r.name,
    sensitivityLevel: r.sensitivityLevel,
    ownerId: r.ownerId ? r.ownerId.toString() : "",
    sharedWith: Array.isArray(r.sharedWith)
      ? r.sharedWith.map((s) => s.toString())
      : [],
  }));
}
