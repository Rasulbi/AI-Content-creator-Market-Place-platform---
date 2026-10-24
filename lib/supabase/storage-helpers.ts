import { createClient, createAdminClient } from "./server";
import { requireAuth, requireRole, AuthError } from "./auth-helpers";

export type StorageBucket = "portfolio-media" | "test-submissions";

/**
 * Validates and normalizes storage file paths.
 * Enforces strict structure: {userId}/{fileName}
 * Rejects path traversal sequences (..), backslashes, null bytes, and malformed segments.
 */
export function sanitizeStoragePath(rawPath: string): { normalizedPath: string; ownerId: string } {
  if (!rawPath || typeof rawPath !== "string") {
    throw new AuthError("Invalid storage path: Path must be a non-empty string.", 400);
  }

  // Strictly block path traversal sequences, backslashes, null bytes, and protocol injections
  if (
    rawPath.includes("..") ||
    rawPath.includes("\\") ||
    rawPath.includes("\0") ||
    rawPath.includes("//") ||
    rawPath.includes(":")
  ) {
    throw new AuthError("Invalid storage path: Path traversal sequences detected.", 400);
  }

  const clean = rawPath.replace(/^\/+|\/+$/g, "");
  const segments = clean.split("/").filter(Boolean);

  if (segments.length < 2) {
    throw new AuthError("Invalid storage path format: Expected {userId}/{fileName}.", 400);
  }

  const ownerId = segments[0];
  if (!ownerId || ownerId.length < 3) {
    throw new AuthError("Invalid storage path: Invalid owner identifier in path.", 400);
  }

  return {
    normalizedPath: clean,
    ownerId,
  };
}

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
  const auth = await requireAuth();

  // Role validation: Only creators and admins can upload test submissions or portfolio media
  if (bucket === "test-submissions" && auth.user.role !== "creator" && auth.user.role !== "admin") {
    throw new AuthError("Access denied: Only creators and administrators can upload test submissions.", 403);
  }

  const supabase = await createClient();

  // Extract base filename only, stripping directory separators and leading dots
  const baseName = fileName.split(/[/\\]/).pop() || "upload";
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
  const filePath = `${auth.authId}/${Date.now()}-${sanitized}`;

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
  const { normalizedPath } = sanitizeStoragePath(filePath);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;
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
  const { normalizedPath, ownerId } = sanitizeStoragePath(filePath);

  // If bucket is private (e.g. test-submissions), verify ownership or admin role
  if (bucket === "test-submissions") {
    const auth = await requireAuth();
    if (ownerId !== auth.authId && auth.user.role !== "admin") {
      throw new AuthError("Access denied: You cannot access files belonging to other creators.", 403);
    }
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(normalizedPath, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to generate signed download URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a file from Supabase storage.
 * Enforces ownership through Storage RLS and server-side checks.
 */
export async function deleteStorageFile(
  bucket: StorageBucket,
  filePath: string
): Promise<void> {
  const { normalizedPath, ownerId } = sanitizeStoragePath(filePath);
  const { authId } = await requireAuth();

  // Validate that the path belongs to this user unless caller is a verified admin
  if (ownerId !== authId) {
    await requireRole(["admin"]);
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.storage.from(bucket).remove([normalizedPath]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove([normalizedPath]);

  if (error) {
    throw new Error(`Failed to delete storage file: ${error.message}`);
  }
}
