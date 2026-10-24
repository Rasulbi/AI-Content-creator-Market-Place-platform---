import { NextRequest, NextResponse } from "next/server";
import { getDatabaseCreatorById } from "@/lib/creators-catalog";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const allowDemo = searchParams.get("demo") !== "false";

    const creator = await getDatabaseCreatorById(id, { allowDemo });

    if (!creator) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: creator,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch creator profile.",
      },
      { status: 500 }
    );
  }
}
