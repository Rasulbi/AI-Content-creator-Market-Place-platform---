import { NextRequest, NextResponse } from "next/server";
import { getDatabaseCreators } from "@/lib/creators-catalog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const includeDemo = searchParams.get("demo") === "true";
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

    const creators = await getDatabaseCreators({
      category,
      includeDemo,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: creators,
      count: creators.length,
      isDemo: includeDemo && creators.some((c) => c.isDemo),
      message:
        creators.length === 0
          ? "No creator profiles found in the database. Be the first to register your verified profile."
          : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch creator profiles.",
      },
      { status: 500 }
    );
  }
}
