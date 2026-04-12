import {
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  HStack,
  Heading,
  Input,
  NativeSelect,
  Portal,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import {
  type AgentConversationSummary,
  getAgentConversation,
  listAgentConversations,
} from "../lib/agent-conversations";
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
  const [activeConversationId, setActiveConversationId] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const [isNewConversation, setIsNewConversation] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const conversationsQuery = useQuery({
    queryKey: ["agent-conversations"],
    queryFn: listAgentConversations,
  });
  const activeConversationQuery = useQuery({
    queryKey: ["agent-conversation", activeConversationId],
    queryFn: () => getAgentConversation(activeConversationId),
    enabled: !isNewConversation,
  });

  const startNewConversation = () => {
    setActiveConversationId(crypto.randomUUID());
    setIsNewConversation(true);
    setIsDrawerOpen(false);
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsNewConversation(false);
    setIsDrawerOpen(false);
  };

  const conversations = conversationsQuery.data ?? [];
  const initialMessages = isNewConversation ? [] : (activeConversationQuery.data?.messages ?? []);
  const isLoadingActiveConversation = !isNewConversation && activeConversationQuery.isLoading;

  const renderSidebar = () => (
    <ConversationSidebar
      activeConversationId={activeConversationId}
      conversations={conversations}
      isLoading={conversationsQuery.isLoading}
      onNewConversation={startNewConversation}
      onSelectConversation={selectConversation}
    />
  );

  return (
    <Container maxW="7xl" py={10}>
      <HStack align="stretch" gap={6}>
        <Box display={{ base: "none", md: "block" }} flex="0 0 280px" borderRightWidth="1px" pr={4}>
          {renderSidebar()}
        </Box>

        <Stack flex="1" gap={6} minW={0}>
          <HStack justify="space-between" align="flex-start">
            <Box>
              <Heading size="2xl">Agents</Heading>
              <Text color="fg.muted" mt={2}>
                業務依頼を入力してください
              </Text>
            </Box>
            <Button
              display={{ base: "inline-flex", md: "none" }}
              variant="outline"
              onClick={() => setIsDrawerOpen(true)}
            >
              履歴
            </Button>
          </HStack>

          {isLoadingActiveConversation ? (
            <Box borderWidth="1px" borderRadius="md" p={4}>
              <Text color="fg.muted">会話を読み込み中です</Text>
            </Box>
          ) : (
            <ChatWorkspace
              key={activeConversationId}
              conversationId={activeConversationId}
              initialMessages={initialMessages}
            />
          )}
        </Stack>
      </HStack>

      <Drawer.Root
        open={isDrawerOpen}
        onOpenChange={(details) => setIsDrawerOpen(details.open)}
        placement="start"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>会話履歴</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>{renderSidebar()}</Drawer.Body>
              <Drawer.CloseTrigger />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Container>
  );
}

function ChatWorkspace({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<AgentProvider>("openai");
  const [model, setModel] = useState<string>(defaultModels.openai);
  const queryClient = useQueryClient();
  const { messages, sendMessage, status, error, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      prepareSendMessagesRequest: ({ messages, body }) => {
        return {
          body: {
            ...body,
            conversationId,
            messages,
          },
        };
      },
    }),
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["agent-conversation", conversationId] });
    },
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
    <Stack gap={6}>
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
  );
}

function ConversationSidebar({
  activeConversationId,
  conversations,
  isLoading,
  onNewConversation,
  onSelectConversation,
}: {
  activeConversationId: string;
  conversations: AgentConversationSummary[];
  isLoading: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}) {
  return (
    <Stack gap={4}>
      <Button variant="outline" onClick={onNewConversation}>
        新規チャット
      </Button>
      <Stack gap={2}>
        <Text color="fg.muted" fontSize="sm">
          会話履歴
        </Text>
        {isLoading ? (
          <Text color="fg.muted" fontSize="sm">
            読み込み中です
          </Text>
        ) : conversations.length === 0 ? (
          <Text color="fg.muted" fontSize="sm">
            履歴はまだありません
          </Text>
        ) : (
          conversations.map((conversation) => (
            <Button
              key={conversation.id}
              justifyContent="flex-start"
              overflow="hidden"
              textAlign="left"
              variant={conversation.id === activeConversationId ? "solid" : "ghost"}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <Text truncate>{conversation.title}</Text>
            </Button>
          ))
        )}
      </Stack>
    </Stack>
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
