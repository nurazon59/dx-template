import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { AgentProvider } from "../types.js";

export class AgentConfigurationError extends Error {
  constructor(
    public readonly code:
      | "AI_MODEL_NOT_CONFIGURED"
      | "GOOGLE_API_KEY_NOT_CONFIGURED"
      | "OPENAI_API_KEY_NOT_CONFIGURED"
      | "OPENAI_MODEL_NOT_CONFIGURED"
      | "UNSUPPORTED_AI_PROVIDER",
    message: string,
  ) {
    super(message);
    this.name = "AgentConfigurationError";
  }
}

export function getConfiguredModel(
  config: { model?: string; provider?: AgentProvider } = {},
): LanguageModel {
  const provider = config.provider ?? process.env["AI_PROVIDER"] ?? "openai";
  const modelName = config.model ?? process.env["AI_MODEL"] ?? process.env["OPENAI_MODEL"];

  if (!modelName) {
    throw new AgentConfigurationError("AI_MODEL_NOT_CONFIGURED", "AI_MODEL is not set");
  }

  switch (provider) {
    case "google":
      if (!process.env["GOOGLE_GENERATIVE_AI_API_KEY"]) {
        throw new AgentConfigurationError(
          "GOOGLE_API_KEY_NOT_CONFIGURED",
          "GOOGLE_GENERATIVE_AI_API_KEY is not set",
        );
      }
      return google(modelName);
    case "openai":
      if (!process.env["OPENAI_API_KEY"]) {
        throw new AgentConfigurationError(
          "OPENAI_API_KEY_NOT_CONFIGURED",
          "OPENAI_API_KEY is not set",
        );
      }
      return openai(modelName);
    default:
      throw new AgentConfigurationError(
        "UNSUPPORTED_AI_PROVIDER",
        `Unsupported AI_PROVIDER: ${provider}`,
      );
  }
}
