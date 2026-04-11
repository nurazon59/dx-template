const baseUrl = process.env["SERVER_URL"] ?? "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.code ?? "UNKNOWN", body?.message ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface User {
  id: string;
  slackUserId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export const apiClient = {
  users: {
    list: () => request<{ users: User[] }>("/api/users"),
    create: (input: { slackUserId: string; displayName: string }) =>
      request<{ user: User }>("/api/users", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    getBySlackUserId: (slackUserId: string) =>
      request<{ user: User }>(`/api/users/${encodeURIComponent(slackUserId)}`),
  },
};
