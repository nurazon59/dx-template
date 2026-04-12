import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors.js";

export const ALLOWED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
export const UPLOAD_URL_EXPIRES_IN_SECONDS = 60 * 5;

type AllowedImageContentType = (typeof ALLOWED_IMAGE_CONTENT_TYPES)[number];

const contentTypeExtensions: Record<AllowedImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const s3Client = new S3Client({
  region: process.env["AWS_REGION"] ?? "ap-northeast-1",
  ...(process.env["S3_ENDPOINT"] && {
    endpoint: process.env["S3_ENDPOINT"],
  }),
  forcePathStyle: process.env["S3_FORCE_PATH_STYLE"] === "true",
});

export type CreateImageUploadUrlInput = {
  userId: string;
  contentType: AllowedImageContentType;
};

export type ImageUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  publicUrl?: string;
  expiresIn: number;
};

export async function createImageUploadUrl(
  input: CreateImageUploadUrlInput,
): Promise<ImageUploadUrl> {
  const bucket = process.env["S3_UPLOAD_BUCKET"] ?? process.env["S3_BUCKET"];
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  const objectKey = createImageObjectKey(input.userId, input.contentType);
  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS },
  );

  return {
    uploadUrl,
    objectKey,
    publicUrl: createPublicUrl(objectKey),
    expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
  };
}

function createImageObjectKey(userId: string, contentType: AllowedImageContentType) {
  const extension = contentTypeExtensions[contentType];
  return `uploads/images/${userId}/${randomUUID()}.${extension}`;
}

function createPublicUrl(objectKey: string) {
  const baseUrl = process.env["S3_PUBLIC_BASE_URL"];
  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/${objectKey}`;
}
