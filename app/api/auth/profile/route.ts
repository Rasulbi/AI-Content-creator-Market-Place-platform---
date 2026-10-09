import { NextRequest, NextResponse } from "next/server";
import { usersDb } from "@/lib/auth-server";
import { z, ZodError } from "zod";

const UpdateProfileSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(2).optional(),
  companyName: z.string().optional(),
  category: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = UpdateProfileSchema.parse(body);

    const updatedUser = usersDb.update(validated.id, validated);
    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

    response.cookies.set("ai_user_session", JSON.stringify(updatedUser), {
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
        error: "Internal server error during profile update",
      },
      { status: 500 }
    );
  }
}
