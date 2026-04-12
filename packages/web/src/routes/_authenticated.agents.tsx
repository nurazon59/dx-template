import { Box, Button, Drawer, HStack, Portal, Stack, Text } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQueryState, parseAsString } from "nuqs";
import { useMemo, useState } from "react";
import { getAgentConversation, listAgentConversations } from "../lib/agent-conversations";
import { authClient } from "../lib/auth";
import { ChatWorkspace } from "../features/agent/components/ChatWorkspace";
import { ConversationSidebar } from "../features/agent/components/ConversationSidebar";

export const Route = createFileRoute("/_authenticated/agents")({
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
  const [conversationId, setConversationId] = useQueryState("conversationId", parseAsString);
  // conversationIdがURLにない場合は新規会話用のIDを生成
  const newConversationId = useMemo(() => crypto.randomUUID(), []);
  const activeConversationId = conversationId ?? newConversationId;
  const isNewConversation = conversationId === null;

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
    void setConversationId(null);
    setIsDrawerOpen(false);
  };

  const selectConversation = (id: string) => {
    void setConversationId(id);
    setIsDrawerOpen(false);
  };

  const conversations = conversationsQuery.data ?? [];
  const initialMessages = isNewConversation ? [] : (activeConversationQuery.data?.messages ?? []);
  const isLoadingActiveConversation = !isNewConversation && activeConversationQuery.isLoading;

  return (
    <HStack align="stretch" gap={0} minH="calc(100vh - 56px)">
      <Box
        display={{ base: "none", md: "block" }}
        flex="0 0 280px"
        bg="gray.50"
        borderRightWidth="1px"
      >
        <ConversationSidebar
          activeConversationId={activeConversationId}
          conversations={conversations}
          isLoading={conversationsQuery.isLoading}
          onNewConversation={startNewConversation}
          onSelectConversation={selectConversation}
        />
      </Box>

      <Stack flex="1" gap={0} minW={0} p={6}>
        <Text color="fg.muted" mb={4}>
          業務依頼を入力してください
        </Text>

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

      <Button
        display={{ base: "inline-flex", md: "none" }}
        variant="outline"
        position="fixed"
        bottom={4}
        right={4}
        onClick={() => setIsDrawerOpen(true)}
      >
        履歴
      </Button>

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
              <Drawer.Body p={0}>
                <ConversationSidebar
                  activeConversationId={activeConversationId}
                  conversations={conversations}
                  isLoading={conversationsQuery.isLoading}
                  onNewConversation={startNewConversation}
                  onSelectConversation={selectConversation}
                />
              </Drawer.Body>
              <Drawer.CloseTrigger />
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </HStack>
  );
}
