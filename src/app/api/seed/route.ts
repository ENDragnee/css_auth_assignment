import { NextResponse } from "next/server";
import { User, Resource } from "@/models/models";
import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/password-utils";
export async function GET() {
  await connectDB();

  const password = await hashPassword("password");

  // Clear old data
  await User.deleteMany({});
  await Resource.deleteMany({});

  // 1. Create Users representing different scenarios
  const users = await User.create([
    {
      name: "Alice Admin",
      email: "admin@test.com",
      password,
      role: "Admin",
      clearanceLevel: 3,
      department: "IT",
      status: "Active",
    },
    {
      name: "Bob Manager",
      email: "manager@test.com",
      password,
      role: "Manager",
      clearanceLevel: 2,
      department: "Payroll",
      status: "Active",
    },
    {
      name: "Charlie User",
      email: "user@test.com",
      password,
      role: "Employee",
      clearanceLevel: 1,
      department: "Sales",
      status: "Active",
    },
  ]);

  // 2. Create Resources for DAC/MAC
  await Resource.create([
    { name: "Public Memo", sensitivityLevel: "Public", ownerId: users[0]._id },
    {
      name: "Internal Report",
      sensitivityLevel: "Internal",
      ownerId: users[1]._id,
    },
    {
      name: "Confidential Salaries",
      sensitivityLevel: "Confidential",
      ownerId: users[0]._id,
    },
    {
      name: "Bob's Private File",
      sensitivityLevel: "Internal",
      ownerId: users[1]._id,
      sharedWith: [users[2]._id],
    }, // Shared with Charlie
  ]);

  return NextResponse.json({
    message: "Database Seeded! Password for all is 'password'",
  });
}
