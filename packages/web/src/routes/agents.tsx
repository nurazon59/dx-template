import {
  Badge,
  Box,
  Button,
  Container,
  HStack,
  Heading,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth";

const defaultModels = {
  openai: "gpt-5.4-mini",
  google: "gemini-3-flash-preview",
} as const;

type AgentProvider = keyof typeof defaultModels;

export const Route = createFileRoute("/agents")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login" });
    }
    return { session: data };
  },
  component: AgentsPage,
});

function AgentsPage() {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<AgentProvider>("openai");
  const [model, setModel] = useState<string>(defaultModels.openai);
  const { messages, sendMessage, status, error, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
    }),
  });
  const isSending = status === "submitted" || status === "streaming";

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) {
      return;
    }

    setInput("");
    await sendMessage(
      { text },
      {
        body: {
          model: model.trim(),
          provider,
        },
      },
    );
  };

  const handleProviderChange = (nextProvider: AgentProvider) => {
    setProvider(nextProvider);
    setModel(defaultModels[nextProvider]);
  };

  return (
    <Container maxW="4xl" py={10}>
      <Stack gap={6}>
        <Box>
          <Heading size="2xl">Agents</Heading>
          <Text color="fg.muted" mt={2}>
            業務依頼を入力してください
          </Text>
        </Box>

        <Stack gap={4} minH="52vh">
          {messages.length === 0 ? (
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="fg.muted">例: 週次レポートを作って</Text>
            </Box>
          ) : (
            messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
          )}
        </Stack>

        {error && (
          <Box borderWidth="1px" borderColor="red.200" borderRadius="md" p={4}>
            <Text color="red.500" fontSize="sm">
              {error.message}
            </Text>
          </Box>
        )}

        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={3}>
            <HStack align="flex-end" gap={3}>
              <Box flex="0 0 160px">
                <Text color="fg.muted" fontSize="sm" mb={1}>
                  Provider
                </Text>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={provider}
                    onChange={(event) =>
                      handleProviderChange(event.currentTarget.value as AgentProvider)
                    }
                  >
                    <option value="openai">OpenAI</option>
                    <option value="google">Gemini</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Box>
              <Box flex="1">
                <Text color="fg.muted" fontSize="sm" mb={1}>
                  Model
                </Text>
                <Input
                  value={model}
                  onChange={(event) => setModel(event.currentTarget.value)}
                  placeholder={defaultModels[provider]}
                />
              </Box>
            </HStack>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="依頼内容を入力"
              autoresize
              minH="96px"
              disabled={isSending}
            />
            <HStack justify="space-between">
              <Text color="fg.muted" fontSize="sm">
                Enter で改行、送信ボタンで送信
              </Text>
              <HStack>
                {isSending && (
                  <Button variant="outline" onClick={stop}>
                    停止
                  </Button>
                )}
                <Button
                  type="submit"
                  colorPalette="blue"
                  loading={isSending}
                  disabled={!input.trim() || !model.trim()}
                >
                  送信
                </Button>
              </HStack>
            </HStack>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

function ChatMessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const label = isUser ? "You" : "Agent";

  return (
    <Box
      alignSelf={isUser ? "flex-end" : "flex-start"}
      borderWidth="1px"
      borderRadius="md"
      maxW={{ base: "100%", md: "80%" }}
      p={4}
      bg={isUser ? "blue.50" : "gray.50"}
    >
      <Stack gap={3}>
        <HStack justify="space-between">
          <Badge colorPalette={isUser ? "blue" : "green"}>{label}</Badge>
        </HStack>
        <Stack gap={2}>
          {message.parts.map((part, index) => (
            <MessagePart key={`${message.id}-${index}`} part={part} />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") {
    return <Text whiteSpace="pre-wrap">{part.text}</Text>;
  }

  if (part.type.startsWith("tool-")) {
    return (
      <Text color="fg.muted" fontSize="sm">
        workflow を実行しました
      </Text>
    );
  }

  return null;
}
