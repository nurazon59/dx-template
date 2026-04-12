import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/index.js", () => ({ db: {} }));

vi.mock("../lib/auth.js", () => ({
  auth: {
    handler: vi.fn(),
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("../lib/s3.js", () => ({
  ALLOWED_IMAGE_CONTENT_TYPES: ["image/jpeg", "image/png", "image/webp"],
  MAX_IMAGE_UPLOAD_SIZE_BYTES: 20 * 1024 * 1024,
  createImageUploadUrl: vi.fn(),
}));

import { app } from "../app.js";
import { auth } from "../lib/auth.js";
import { createImageUploadUrl } from "../lib/s3.js";

const mockGetSession = vi.mocked(auth.api.getSession);
const mockCreateImageUploadUrl = vi.mocked(createImageUploadUrl);

beforeEach(() => {
  vi.resetAllMocks();
  mockGetSession.mockResolvedValue({
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
    session: {
      id: "session-1",
      token: "token",
      userId: "user-1",
      expiresAt: new Date("2024-01-02T00:00:00.000Z"),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    },
  });
});

describe("POST /api/uploads/images/presign", () => {
  it("署名付き URL を発行して 201 を返す", async () => {
    const upload = {
      uploadUrl: "https://example-bucket.s3.amazonaws.com/uploads/images/user-1/image.jpg",
      objectKey: "uploads/images/user-1/image.jpg",
      publicUrl: "https://cdn.example.com/uploads/images/user-1/image.jpg",
      expiresIn: 300,
    };
    mockCreateImageUploadUrl.mockResolvedValue(upload);

    const res = await app.request("/api/uploads/images/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "image.jpg",
        contentType: "image/jpeg",
        contentLength: 1024,
      }),
    });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ upload });
    expect(mockCreateImageUploadUrl).toHaveBeenCalledWith({
      userId: "user-1",
      contentType: "image/jpeg",
    });
  });

  it("未認証なら 401 を返す", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await app.request("/api/uploads/images/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "image.jpg",
        contentType: "image/jpeg",
        contentLength: 1024,
      }),
    });

    expect(res.status).toBe(401);
    expect(mockCreateImageUploadUrl).not.toHaveBeenCalled();
  });

  it("許可されていない content type なら 400 を返す", async () => {
    const res = await app.request("/api/uploads/images/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "image.gif",
        contentType: "image/gif",
        contentLength: 1024,
      }),
    });

    expect(res.status).toBe(400);
    expect(mockCreateImageUploadUrl).not.toHaveBeenCalled();
  });

  it("上限を超える画像なら 400 を返す", async () => {
    const res = await app.request("/api/uploads/images/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "image.jpg",
        contentType: "image/jpeg",
        contentLength: 20 * 1024 * 1024 + 1,
      }),
    });

    expect(res.status).toBe(400);
    expect(mockCreateImageUploadUrl).not.toHaveBeenCalled();
  });
});
