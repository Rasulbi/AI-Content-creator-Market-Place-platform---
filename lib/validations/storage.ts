import { z } from "zod";

export const uploadUrlRequestSchema = z.object({
  bucket: z.enum(["portfolio-media", "test-submissions"]),
  fileName: z.string().trim().min(3).max(255),
  contentType: z.string().trim().min(3).max(100),
});

export type UploadUrlRequestInput = z.infer<typeof uploadUrlRequestSchema>;
