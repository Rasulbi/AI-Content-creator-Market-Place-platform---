import { NextRequest, NextResponse } from "next/server";
import { usersDb, UserRole } from "@/lib/auth-server";
import { z, ZodError } from "zod";

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please provide a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  role: z.enum(["brand", "influencer"] as const),
  companyName: z.string().optional(),
  category: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    const email = validated.email.toLowerCase().trim();

    // 1. Prevent duplicate registrations
    const existing = usersDb.findByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email address already exists. Please log in or use a different email.",
        },
        { status: 409 }
      );
    }

    // 2. Default avatar based on role
    const avatarUrl =
      validated.role === "brand"
        ? "/images/brand-user.jpg"
        : "/images/anjali.jpg";

    const newUser = usersDb.create(
      {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email,
        name: validated.fullName.trim(),
        role: validated.role as UserRole,
        companyName: validated.companyName?.trim() || (validated.role === "brand" ? "My Brand" : undefined),
        category: validated.category || (validated.role === "brand" ? "Beauty & Skincare" : "Beauty & Skincare"),
        avatarUrl,
        verified: true,
        createdAt: new Date().toISOString(),
      },
      validated.password
    );

    const response = NextResponse.json({
      success: true,
      message: "Registration successful",
      user: newUser,
    });

    // Set cookie for session persistence
    response.cookies.set("ai_user_session", JSON.stringify(newUser), {
      path: "/",
      httpOnly: false, // Accessible to client scripts for seamless UI sync
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: err.issues[0]?.message || "Validation failed",
          details: err.flatten(),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during registration",
      },
      { status: 500 }
    );
  }
}
