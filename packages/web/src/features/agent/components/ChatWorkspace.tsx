import {
  Box,
  Button,
  Field,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { ChatMessageBubble } from "./ChatMessageBubble";

const defaultModels = {
  openai: "gpt-5.4-mini",
  google: "gemini-3-flash-preview",
} as const;

type AgentProvider = keyof typeof defaultModels;

const chatSchema = z.object({
  provider: z.enum(["openai", "google"]),
  model: z.string().min(1, "モデル名を入力してください"),
  message: z.string().min(1, "依頼内容を入力してください"),
});

type ChatFormValues = z.infer<typeof chatSchema>;

interface ChatWorkspaceProps {
  conversationId: string;
  initialMessages: UIMessage[];
}

export function ChatWorkspace({ conversationId, initialMessages }: ChatWorkspaceProps) {
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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: {
      provider: "openai",
      model: defaultModels.openai,
      message: "",
    },
  });

  const currentProvider = watch("provider");

  const onSubmit = async (data: ChatFormValues) => {
    if (isSending) return;

    await sendMessage(
      { text: data.message },
      {
        body: {
          model: data.model.trim(),
          provider: data.provider,
        },
      },
    );
    reset({ provider: data.provider, model: data.model, message: "" });
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.currentTarget.value as AgentProvider;
    setValue("provider", nextProvider);
    setValue("model", defaultModels[nextProvider]);
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

      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack gap={3}>
          <HStack align="flex-end" gap={3}>
            <Box flex="0 0 160px">
              <Field.Root>
                <Field.Label fontSize="sm" color="fg.muted" mb={1}>
                  Provider
                </Field.Label>
                <NativeSelect.Root>
                  <NativeSelect.Field {...register("provider")} onChange={handleProviderChange}>
                    <option value="openai">OpenAI</option>
                    <option value="google">Gemini</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </Box>
            <Box flex="1">
              <Field.Root invalid={!!errors.model}>
                <Field.Label fontSize="sm" color="fg.muted" mb={1}>
                  Model
                </Field.Label>
                <Input {...register("model")} placeholder={defaultModels[currentProvider]} />
                <Field.ErrorText>{errors.model?.message}</Field.ErrorText>
              </Field.Root>
            </Box>
          </HStack>
          <Field.Root invalid={!!errors.message}>
            <Textarea
              {...register("message")}
              placeholder="依頼内容を入力"
              autoresize
              minH="96px"
              disabled={isSending}
            />
            <Field.ErrorText>{errors.message?.message}</Field.ErrorText>
          </Field.Root>
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
              <Button type="submit" colorPalette="blue" loading={isSending}>
                送信
              </Button>
            </HStack>
          </HStack>
        </Stack>
      </Box>
    </Stack>
  );
}
