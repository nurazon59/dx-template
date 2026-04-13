import createClient from "openapi-fetch";
import type { components, paths } from "./lib/api/schema.js";
import { env } from "./env.js";

const client = createClient<paths>({
  baseUrl: env.SERVER_URL,
  fetch: (request) => globalThis.fetch(request),
});

type ApiErrorBody = components["schemas"]["Error"];
export type User = components["schemas"]["User"];

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof body.code === "string" &&
    "message" in body &&
    typeof body.message === "string"
  );
}

function toApiError(error: unknown, response: Response): ApiError {
  if (isApiErrorBody(error)) {
    return new ApiError(response.status, error.code, error.message);
  }

  return new ApiError(response.status, "UNKNOWN", response.statusText);
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

export const apiClient = {
  system: {
    time: async () => {
      const { data, error, response } = await client.GET("/api/time");
      if (error) {
        throw toApiError(error, response);
      }

      return data;
    },
  },
  users: {
    list: async () => {
      const { data, error, response } = await client.GET("/api/users");
      if (error) {
        throw toApiError(error, response);
      }

      return data;
    },
    create: async (input: components["schemas"]["CreateUserInput"]) => {
      const { data, error, response } = await client.POST("/api/users", {
        body: input,
      });
      if (error) {
        throw toApiError(error, response);
      }

      return data;
    },
    getBySlackUserId: async (slackUserId: string) => {
      const { data, error, response } = await client.GET("/api/users/{slackUserId}", {
        params: { path: { slackUserId } },
      });
      if (error) {
        throw toApiError(error, response);
      }

      return data;
    },
  },
  memories: {
    list: async () => {
      const { data, error, response } = await client.GET("/api/memories");
      if (error) {
        throw toApiError(error, response);
      }
      return data;
    },
    getById: async (id: string) => {
      const { data, error, response } = await client.GET("/api/memories/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toApiError(error, response);
      }
      return data;
    },
    create: async (input: components["schemas"]["CreateMemoryInput"]) => {
      const { data, error, response } = await client.POST("/api/memories", {
        body: input,
      });
      if (error) {
        throw toApiError(error, response);
      }
      return data;
    },
    delete: async (id: string) => {
      const { data, error, response } = await client.DELETE("/api/memories/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw toApiError(error, response);
      }
      return data;
    },
  },
};
