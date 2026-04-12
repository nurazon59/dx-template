import { z } from "zod";
import { ALLOWED_FILE_CONTENT_TYPES, MAX_FILE_UPLOAD_SIZE_BYTES } from "../lib/s3.js";

export const CreateFileUploadUrlInputSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentType: z.enum(ALLOWED_FILE_CONTENT_TYPES),
    contentLength: z.number().int().positive().max(MAX_FILE_UPLOAD_SIZE_BYTES),
  })
  .meta({ ref: "CreateFileUploadUrlInput" });

export const FileUploadUrlSchema = z
  .object({
    uploadUrl: z.string().url(),
    objectKey: z.string(),
    expiresIn: z.number().int().positive(),
  })
  .meta({ ref: "FileUploadUrl" });

export const FileSchema = z
  .object({
    id: z.string().uuid(),
    objectKey: z.string(),
    fileName: z.string(),
    contentType: z.string(),
    contentLength: z.number().int(),
    createdAt: z.string().datetime(),
  })
  .meta({ ref: "File" });

export const FileDownloadUrlSchema = z
  .object({
    downloadUrl: z.string().url(),
    expiresIn: z.number().int().positive(),
  })
  .meta({ ref: "FileDownloadUrl" });
