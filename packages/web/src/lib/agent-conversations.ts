import type { UIMessage } from "ai";

export interface AgentConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface AgentConversation extends AgentConversationSummary {
  messages: UIMessage[];
}

interface ApiAgentMessage {
  id: string;
  role: UIMessage["role"];
  parts: UIMessage["parts"];
}

interface ApiAgentConversation extends AgentConversationSummary {
  messages: ApiAgentMessage[];
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message ?? "Agent conversation request failed");
  }
  return data as T;
}

export async function listAgentConversations(): Promise<AgentConversationSummary[]> {
  const response = await fetch("/api/agent/conversations");
  const data = await parseJsonResponse<{ conversations: AgentConversationSummary[] }>(response);
  return data.conversations;
}

export async function getAgentConversation(conversationId: string): Promise<AgentConversation> {
  const response = await fetch(`/api/agent/conversations/${conversationId}`);
  const data = await parseJsonResponse<{ conversation: ApiAgentConversation }>(response);
  return {
    ...data.conversation,
    messages: data.conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts,
    })),
  };
}
