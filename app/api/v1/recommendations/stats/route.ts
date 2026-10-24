import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-helpers";
import { interactionService } from "@/lib/recommendations/interaction-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view recommendation statistics." },
        { status: 401 }
      );
    }

    if (auth.user.role !== "brand" && auth.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only brand or admin accounts can access recommendation statistics." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId") || undefined;
    const brandId = auth.user.role === "admin" ? searchParams.get("brandId") || undefined : auth.user.id;

    const stats = await interactionService.getRecommendationStats(brandId, campaignId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to load recommendation statistics." },
      { status: 500 }
    );
  }
}
