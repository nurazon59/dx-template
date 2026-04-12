import { z } from "zod";
import { ALLOWED_IMAGE_CONTENT_TYPES, MAX_IMAGE_UPLOAD_SIZE_BYTES } from "../lib/s3.js";

export const CreateImageUploadUrlInputSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_IMAGE_CONTENT_TYPES),
    contentLength: z.number().int().positive().max(MAX_IMAGE_UPLOAD_SIZE_BYTES),
  })
  .meta({ ref: "CreateImageUploadUrlInput" });

export const ImageUploadUrlSchema = z
  .object({
    uploadUrl: z.string().url(),
    objectKey: z.string(),
    publicUrl: z.string().url().optional(),
    expiresIn: z.number().int().positive(),
  })
  .meta({ ref: "ImageUploadUrl" });
