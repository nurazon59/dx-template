import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors.js";
import { env } from "../env.js";

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
  region: env.AWS_REGION,
  ...(env.S3_ENDPOINT && {
    endpoint: env.S3_ENDPOINT,
  }),
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
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
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
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
  const baseUrl = env.S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/${objectKey}`;
}

// ファイル用定数
export const ALLOWED_FILE_CONTENT_TYPES = [
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
] as const;
export const MAX_FILE_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

type AllowedFileContentType = (typeof ALLOWED_FILE_CONTENT_TYPES)[number];

const fileContentTypeExtensions: Record<AllowedFileContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/pdf": "pdf",
};

export type CreateFileUploadUrlInput = {
  userId: string;
  contentType: AllowedFileContentType;
};

export type FileUploadUrl = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
};

export async function createFileUploadUrl(input: CreateFileUploadUrlInput): Promise<FileUploadUrl> {
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  const extension = fileContentTypeExtensions[input.contentType];
  const objectKey = `uploads/files/${input.userId}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.contentType,
    }),
    { expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS },
  );

  return { uploadUrl, objectKey, expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS };
}

export async function getFileBuffer(objectKey: string): Promise<Uint8Array> {
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));

  if (!response.Body) {
    throw new AppError("FILE_NOT_FOUND", `File not found: ${objectKey}`, 404);
  }

  return new Uint8Array(await response.Body.transformToByteArray());
}

export async function createFileDownloadUrl(
  objectKey: string,
): Promise<{ downloadUrl: string; expiresIn: number }> {
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  const downloadUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS },
  );

  return { downloadUrl, expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS };
}

export async function deleteFile(objectKey: string): Promise<void> {
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
}

export async function putFileBuffer(
  buffer: Uint8Array,
  fileName: string,
  contentType: string,
): Promise<string> {
  const bucket = env.S3_UPLOAD_BUCKET ?? env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("UPLOAD_STORAGE_NOT_CONFIGURED", "Upload storage is not configured", 500);
  }

  const objectKey = `uploads/files/${randomUUID()}/${fileName}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return objectKey;
}
