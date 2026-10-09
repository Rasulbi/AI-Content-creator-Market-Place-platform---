import { NextRequest, NextResponse } from "next/server";
import { usersDb, UserRole } from "@/lib/auth-server";
import { z, ZodError } from "zod";

const LoginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["brand", "influencer"] as const),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const email = validated.email.toLowerCase().trim();
    const existing = usersDb.findByEmail(email);

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: "No account found with this email. Please check your email or sign up.",
        },
        { status: 401 }
      );
    }

    // Role check
    if (existing.role !== validated.role) {
      return NextResponse.json(
        {
          success: false,
          error: `This account is registered as a ${existing.role === "brand" ? "Brand" : "Creator"}, not a ${validated.role === "brand" ? "Brand" : "Creator"}. Please switch login tab.`,
        },
        { status: 400 }
      );
    }

    // Password verification
    const isValid = usersDb.verifyPassword(existing, validated.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Incorrect password. Please try again.",
        },
        { status: 401 }
      );
    }

    // Return sanitized profile
    const { passwordHash: _p, salt: _s, ...userProfile } = existing;

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userProfile,
    });

    response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: err.issues[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during login",
      },
      { status: 500 }
    );
  }
}
