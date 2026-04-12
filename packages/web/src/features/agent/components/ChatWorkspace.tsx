import {
  Box,
  Button,
  Field,
  HStack,
  IconButton,
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
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { FilePreviewList } from "./FilePreviewList";
import { useFileUpload, buildMessageWithFiles } from "../hooks/useFileUpload";

const defaultModels = {
  openai: "gpt-5.4-mini",
  google: "gemini-3-flash-preview",
} as const;

const providers = ["openai", "google"] as const;
type AgentProvider = (typeof providers)[number];

const messageSchema = z.object({
  message: z.string().min(1, "依頼内容を入力してください"),
});

type MessageFormValues = z.infer<typeof messageSchema>;

interface ChatWorkspaceProps {
  conversationId: string;
  initialMessages: UIMessage[];
}

export function ChatWorkspace({ conversationId, initialMessages }: ChatWorkspaceProps) {
  const [provider, setProvider] = useQueryState(
    "provider",
    parseAsStringLiteral(providers).withDefault("openai"),
  );
  const [model, setModel] = useQueryState("model", {
    defaultValue: defaultModels[provider],
    parse: (v) => v,
    serialize: (v) => v,
  });

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
    files: selectedFiles,
    uploading,
    fileInputRef,
    addFiles,
    removeFile,
    uploadAll,
    reset: resetFiles,
    openFilePicker,
  } = useFileUpload();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: { message: "" },
  });

  const onSubmit = async (data: MessageFormValues) => {
    if (isSending || uploading) return;

    let messageText = data.message;

    if (selectedFiles.length > 0) {
      const uploaded = await uploadAll();
      messageText = buildMessageWithFiles(data.message, uploaded);
    }

    await sendMessage(
      { text: messageText },
      {
        body: {
          model: model.trim(),
          provider,
        },
      },
    );
    reset({ message: "" });
    resetFiles();
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.currentTarget.value as AgentProvider;
    void setProvider(nextProvider);
    void setModel(defaultModels[nextProvider]);
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
                  <NativeSelect.Field value={provider} onChange={handleProviderChange}>
                    <option value="openai">OpenAI</option>
                    <option value="google">Gemini</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field.Root>
            </Box>
            <Box flex="1">
              <Field.Root>
                <Field.Label fontSize="sm" color="fg.muted" mb={1}>
                  Model
                </Field.Label>
                <Input
                  value={model}
                  onChange={(e) => void setModel(e.currentTarget.value)}
                  placeholder={defaultModels[provider]}
                />
              </Field.Root>
            </Box>
          </HStack>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.pdf,.jpg,.jpeg,.png,.webp"
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
            }}
          />
          <FilePreviewList files={selectedFiles} uploading={uploading} onRemove={removeFile} />
          <Field.Root invalid={!!errors.message}>
            <HStack align="flex-start" gap={2}>
              <IconButton
                aria-label="ファイルを添付"
                variant="ghost"
                size="sm"
                mt={2}
                onClick={openFilePicker}
                disabled={isSending || uploading}
              >
                📎
              </IconButton>
              <Box flex="1">
                <Textarea
                  {...register("message")}
                  placeholder="依頼内容を入力"
                  autoresize
                  minH="96px"
                  disabled={isSending}
                />
              </Box>
            </HStack>
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
