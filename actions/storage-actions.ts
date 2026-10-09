"use server";

import { createSignedUploadUrl, getPublicStorageUrl } from "@/lib/supabase/storage-helpers";
import { uploadUrlRequestSchema } from "@/lib/validations";
import { ActionResult } from "./creator-actions";

/**
 * Generates a presigned upload URL for direct client-to-storage uploads.
 */
export async function generateUploadUrlAction(rawInput: unknown): Promise<ActionResult> {
  try {
    const validated = uploadUrlRequestSchema.parse(rawInput);
    const { path, signedUrl, token } = await createSignedUploadUrl(
      validated.bucket,
      validated.fileName
    );

    const publicUrl =
      validated.bucket === "portfolio-media"
        ? getPublicStorageUrl("portfolio-media", path)
        : null;

    return {
      success: true,
      data: {
        path,
        signedUrl,
        token,
        publicUrl,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to generate storage upload URL.",
    };
  }
}
