import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api/generated", () => ({
  postApiUploadsImagesPresign: vi.fn(),
}));

import { postApiUploadsImagesPresign } from "./api/generated";
import { uploadImage } from "./uploads";

const mockPostApiUploadsImagesPresign = vi.mocked(postApiUploadsImagesPresign);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
});

describe("uploadImage", () => {
  it("署名付き URL を発行して画像を PUT する", async () => {
    const upload = {
      uploadUrl: "https://example.com/upload",
      objectKey: "uploads/images/user-1/image.jpg",
      publicUrl: "https://cdn.example.com/uploads/images/user-1/image.jpg",
      expiresIn: 300,
    };
    mockPostApiUploadsImagesPresign.mockResolvedValue({
      data: { upload },
      status: 201,
      headers: new Headers(),
    });
    const file = new File(["image"], "image.jpg", { type: "image/jpeg" });

    await expect(uploadImage(file)).resolves.toEqual(upload);

    expect(mockPostApiUploadsImagesPresign).toHaveBeenCalledWith(
      {
        fileName: "image.jpg",
        contentType: "image/jpeg",
        contentLength: file.size,
      },
      { signal: undefined },
    );
    expect(fetch).toHaveBeenCalledWith("https://example.com/upload", {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: file,
      signal: undefined,
    });
  });

  it("未対応の画像形式なら PUT しない", async () => {
    const file = new File(["image"], "image.gif", { type: "image/gif" });

    await expect(uploadImage(file)).rejects.toThrow("対応していない画像形式です");

    expect(mockPostApiUploadsImagesPresign).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
