import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
  role: z.enum(["USER", "DRIVER"]).optional().default("USER"),
  vehicleClass: z.enum(["BIKE", "PICKUP_TRUCK", "TRUCK"]).optional(),
}).refine(
  (data) => {
    // If role is DRIVER, vehicleClass is required
    if (data.role === "DRIVER" && !data.vehicleClass) {
      return false;
    }
    return true;
  },
  { message: "Vehicle class is required for drivers", path: ["vehicleClass"] }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, role, vehicleClass } = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name ?? null,
        role: role,
        vehicleClass: role === "DRIVER" ? vehicleClass : null,
      },
    });

    return NextResponse.json(
      { message: "User created successfully", userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Validation error" },
        { status: 400 },
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

