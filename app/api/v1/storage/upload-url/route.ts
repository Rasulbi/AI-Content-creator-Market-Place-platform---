import { NextRequest, NextResponse } from "next/server";
import { createSignedUploadUrl, getPublicStorageUrl } from "@/lib/supabase/storage-helpers";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { uploadUrlRequestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Storage service (Supabase) is not configured." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validated = uploadUrlRequestSchema.parse(body);

    const { path, signedUrl, token } = await createSignedUploadUrl(
      validated.bucket,
      validated.fileName
    );

    const publicUrl =
      validated.bucket === "portfolio-media"
        ? getPublicStorageUrl("portfolio-media", path)
        : null;

    return NextResponse.json({
      path,
      signedUrl,
      token,
      publicUrl,
    });
  } catch (err: any) {
    const status = err.name === "AuthError" ? err.statusCode : 400;
    return NextResponse.json(
      { error: err?.message || "Failed to create upload URL" },
      { status }
    );
  }
}
