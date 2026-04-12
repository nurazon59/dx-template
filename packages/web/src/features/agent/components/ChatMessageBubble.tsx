import { Badge, Box, HStack, Stack, Text } from "@chakra-ui/react";
import type { UIMessage } from "ai";

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

export { ChatMessageBubble };
