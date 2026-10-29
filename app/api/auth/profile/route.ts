import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/lib/auth-server";
import { isSupabaseConfigured, createClient, createAdminClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";

const UpdateProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
  companyName: z.string().trim().min(2, "Company name must be at least 2 characters").max(100, "Company name cannot exceed 100 characters").optional(),
  category: z.string().optional(),
  bio: z.string().trim().max(1000, "Bio cannot exceed 1000 characters").optional().nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  website: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  aiTools: z.array(z.string().trim().min(1)).optional(),
  experience: z.string().trim().max(1000).optional(),
  experienceYears: z.number().int().min(0).max(50).optional(),
  hourlyRate: z.number().min(0).max(1000000).optional().nullable(),
  priceRange: z.string().trim().max(100).optional(),
  availability: z.enum(["available", "busy", "unavailable"]).optional(),
});

export async function GET(_req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database service is not configured." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const verifiedUserId = authData.user.id;
    const adminSupabase = createAdminClient();

    const { data: dbUser, error: userErr } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", verifiedUserId)
      .maybeSingle();

    if (userErr || !dbUser) {
      return NextResponse.json(
        { success: false, error: "User record not found in database." },
        { status: 404 }
      );
    }

    let creatorProfile: any = null;

    if (dbUser.role === "creator") {
      const { data: cp, error: cpErr } = await adminSupabase
        .from("creator_profiles")
        .select("*")
        .eq("user_id", verifiedUserId)
        .maybeSingle();

      if (!cp && !cpErr) {
        // Auto-provision creator profile if missing for authenticated creator
        const fullName = dbUser.full_name || authData.user.email?.split("@")[0] || "AI Creator";
        const rawSlug = fullName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^-+|-+$/g, "") || "creator";
        const slug = `${rawSlug}-${verifiedUserId.slice(0, 8)}`;
        const { data: createdCp } = await adminSupabase
          .from("creator_profiles")
          .upsert(
            {
              user_id: verifiedUserId,
              name: fullName,
              slug,
              category: "General AI",
            },
            { onConflict: "user_id" }
          )
          .select()
          .maybeSingle();

        creatorProfile = createdCp;
      } else {
        creatorProfile = cp;
      }
    }

    const userProfile: UserProfile = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.full_name,
      role: dbUser.role === "brand" ? "brand" : "influencer",
      companyName: dbUser.company_name || undefined,
      category: creatorProfile?.category,
      bio: creatorProfile?.bio || undefined,
      location: creatorProfile?.location || undefined,
      website: undefined,
      phone: undefined,
      avatarUrl: dbUser.avatar_url || (dbUser.role === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg"),
      verified: true,
      createdAt: dbUser.created_at,
    };

    return NextResponse.json(
      {
        success: true,
        user: userProfile,
        profile: creatorProfile
          ? {
              id: creatorProfile.id,
              userId: creatorProfile.user_id,
              name: creatorProfile.name || dbUser.full_name,
              slug: creatorProfile.slug,
              bio: creatorProfile.bio || "",
              location: creatorProfile.location || "",
              category: creatorProfile.category || "General AI",
              experience: creatorProfile.experience_years
                ? `${creatorProfile.experience_years} years experience`
                : "",
              experienceYears: creatorProfile.experience_years || null,
              experienceLevel: creatorProfile.experience_level || "intermediate",
              availability: creatorProfile.availability || "available",
              hourlyRate: creatorProfile.hourly_rate || null,
              priceRange: creatorProfile.hourly_rate
                ? `₹${creatorProfile.hourly_rate}/hr`
                : "₹3,500 - ₹6,000/hr",
              aiTools: creatorProfile.ai_tools || [],
              platforms: creatorProfile.platforms || [],
              passportScore: creatorProfile.passport_score || 0,
              clientRating: creatorProfile.client_rating || 5.0,
              totalReviews: creatorProfile.total_reviews || 0,
              isVerified: creatorProfile.is_verified || false,
            }
          : null,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error fetching profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // CRITICAL SECURITY CHECK: Prevent role privilege escalation
    if ("role" in rawBody && rawBody.role !== undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Modifying user role is not permitted.",
        },
        { status: 403 }
      );
    }

    const validated = UpdateProfileSchema.parse(rawBody);

    // Authenticate via Supabase Auth server verification FIRST
    const supabase = await createClient();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    if (authErr || !authData?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please log in to update your profile.",
        },
        { status: 401 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Database service is not configured. Profile updates require Supabase connection.",
        },
        { status: 503 }
      );
    }

    // Verified user UUID from Supabase Auth
    const verifiedUserId = authData.user.id;

    // If client supplied an ID, strictly reject if it doesn't match the authenticated user
    if (validated.id && validated.id !== verifiedUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden: You cannot modify another user's profile.",
        },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    const userUpdates: Record<string, any> = {};
    if (validated.name) userUpdates.full_name = validated.name;
    if (validated.companyName !== undefined) userUpdates.company_name = validated.companyName;
    if (validated.avatarUrl) userUpdates.avatar_url = validated.avatarUrl;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userErr } = await adminSupabase.from("users").update(userUpdates as any).eq("id", verifiedUserId);
      if (userErr) {
        console.error("[Profile PUT] users update error:", userErr);
        return NextResponse.json(
          { success: false, error: `Failed to update user record: ${userErr.message}` },
          { status: 500 }
        );
      }
    }

    const profileUpdates: Record<string, any> = {};
    if (validated.name) profileUpdates.name = validated.name;
    if (validated.bio !== undefined) profileUpdates.bio = validated.bio;
    if (validated.location !== undefined) profileUpdates.location = validated.location;
    if (validated.category !== undefined) profileUpdates.category = validated.category;
    if (validated.aiTools !== undefined) profileUpdates.ai_tools = validated.aiTools;
    if (validated.availability !== undefined) profileUpdates.availability = validated.availability;
    if (validated.hourlyRate !== undefined) profileUpdates.hourly_rate = validated.hourlyRate;
    if (validated.experienceYears !== undefined) profileUpdates.experience_years = validated.experienceYears;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: cpErr } = await adminSupabase.from("creator_profiles").update(profileUpdates as any).eq("user_id", verifiedUserId);
      if (cpErr) {
        console.error("[Profile PUT] creator_profiles update error:", cpErr);
        return NextResponse.json(
          { success: false, error: `Failed to update creator profile: ${cpErr.message}` },
          { status: 500 }
        );
      }
    }

    const { data: dbUser } = await adminSupabase.from("users").select("*").eq("id", verifiedUserId).maybeSingle();
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User profile not found in database.",
        },
        { status: 404 }
      );
    }

    const { data: updatedCp } = await adminSupabase.from("creator_profiles").select("*").eq("user_id", verifiedUserId).maybeSingle();

    const userProfile: UserProfile = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.full_name,
      role: dbUser.role === "brand" ? "brand" : "influencer",
      companyName: dbUser.company_name || undefined,
      category: validated.category || updatedCp?.category || undefined,
      bio: (validated.bio !== undefined ? validated.bio : updatedCp?.bio) || undefined,
      location: (validated.location !== undefined ? validated.location : updatedCp?.location) || undefined,
      website: validated.website,
      phone: validated.phone,
      avatarUrl: dbUser.avatar_url || (dbUser.role === "brand" ? "/images/brand-user.jpg" : "/images/anjali.jpg"),
      verified: true,
      createdAt: dbUser.created_at,
    };

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully in database",
      user: userProfile,
      profile: updatedCp ? {
        id: updatedCp.id,
        userId: updatedCp.user_id,
        name: updatedCp.name,
        slug: updatedCp.slug,
        bio: updatedCp.bio || "",
        location: updatedCp.location || "",
        category: updatedCp.category || "General AI",
        experience: updatedCp.experience_years ? `${updatedCp.experience_years} years experience` : "",
        experienceYears: updatedCp.experience_years,
        availability: updatedCp.availability || "available",
        hourlyRate: updatedCp.hourly_rate,
        priceRange: updatedCp.hourly_rate ? `₹${updatedCp.hourly_rate}/hr` : undefined,
        aiTools: updatedCp.ai_tools || [],
      } : null,
    });

    response.cookies.set("ai_user_session", JSON.stringify(userProfile), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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
