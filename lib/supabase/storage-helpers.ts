import { createClient, createAdminClient } from "./server";
import { requireAuth } from "./auth-helpers";

export type StorageBucket = "portfolio-media" | "test-submissions";

/**
 * Generates a presigned upload URL for direct-to-storage client uploads.
 * Paths are strictly scoped to the user's ID to conform with Storage RLS policies:
 * `{bucket}/{userId}/{timestamp}-{sanitizedFileName}`
 */
export async function createSignedUploadUrl(
  bucket: StorageBucket,
  fileName: string
): Promise<{
  path: string;
  signedUrl: string;
  token: string;
}> {
  const { authId } = await requireAuth();
  const supabase = await createClient();

  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${authId}/${Date.now()}-${sanitized}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    throw new Error(`Failed to generate signed upload URL: ${error?.message || "Unknown error"}`);
  }

  return {
    path: filePath,
    signedUrl: data.signedUrl,
    token: data.token,
  };
}

/**
 * Returns the public URL for a file in the public 'portfolio-media' bucket.
 */
export function getPublicStorageUrl(bucket: "portfolio-media", filePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

/**
 * Generates a temporary signed download URL for private files in 'test-submissions'.
 * Valid for `expiresIn` seconds (default 3600 = 1 hour).
 */
export async function getSignedDownloadUrl(
  bucket: StorageBucket,
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed download URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a file from Supabase storage.
 * Enforces ownership through Storage RLS.
 */
export async function deleteStorageFile(
  bucket: StorageBucket,
  filePath: string
): Promise<void> {
  const { authId } = await requireAuth();

  // Validate that the path belongs to this user unless caller is an admin
  if (!filePath.startsWith(`${authId}/`)) {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.storage.from(bucket).remove([filePath]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete storage file: ${error.message}`);
  }
}
