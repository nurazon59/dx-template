import { parseAsString, useQueryStates } from "nuqs";

export const defaultModels = {
  openai: "gpt-5.4-mini",
  google: "gemini-3-flash-preview",
} as const;

export type AgentProvider = keyof typeof defaultModels;

const searchParams = {
  conversationId: parseAsString,
  provider: parseAsString.withDefault("openai"),
  model: parseAsString.withDefault(defaultModels.openai),
} as const;

export function useAgentSearchParams() {
  return useQueryStates(searchParams, {
    urlKeys: {
      conversationId: "conversationId",
      provider: "provider",
      model: "model",
    },
  });
}
