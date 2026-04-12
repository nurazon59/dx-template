import {
  postApiUploadsImagesPresign,
  type CreateImageUploadUrlInput,
  type ImageUploadUrl,
} from "./api/generated";

const SUPPORTED_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] satisfies Array<
  CreateImageUploadUrlInput["contentType"]
>;

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export async function uploadImage(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<ImageUploadUrl> {
  if (!isSupportedImageContentType(file.type)) {
    throw new Error("対応していない画像形式です");
  }

  if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
    throw new Error("画像サイズが上限を超えています");
  }

  const presignResponse = await postApiUploadsImagesPresign(
    {
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size,
    },
    { signal: options?.signal },
  );

  if (presignResponse.status !== 201) {
    throw new Error(
      "message" in presignResponse.data
        ? presignResponse.data.message
        : "アップロード URL の発行に失敗しました",
    );
  }

  const { upload } = presignResponse.data;
  const uploadResponse = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
    signal: options?.signal,
  });

  if (!uploadResponse.ok) {
    throw new Error("画像アップロードに失敗しました");
  }

  return upload;
}

function isSupportedImageContentType(
  contentType: string,
): contentType is CreateImageUploadUrlInput["contentType"] {
  return SUPPORTED_IMAGE_CONTENT_TYPES.includes(
    contentType as CreateImageUploadUrlInput["contentType"],
  );
}
