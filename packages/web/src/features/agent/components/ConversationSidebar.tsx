import { Button, Stack, Text } from "@chakra-ui/react";
import type { AgentConversationSummary } from "../../../lib/agent-conversations";

interface ConversationSidebarProps {
  activeConversationId: string;
  conversations: AgentConversationSummary[];
  isLoading: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
}

export function ConversationSidebar({
  activeConversationId,
  conversations,
  isLoading,
  onNewConversation,
  onSelectConversation,
}: ConversationSidebarProps) {
  return (
    <Stack bg="gray.50" p={4} gap={4} borderRightWidth="1px" minH="100vh">
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
