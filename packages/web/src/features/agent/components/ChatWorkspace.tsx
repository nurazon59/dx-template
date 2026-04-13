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
import { Folder, Paperclip } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod/v4";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { FileLibrarySelect } from "../../files/components/FileLibrarySelect";
import { FilePreviewList } from "../../files/components/FilePreviewList";
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

  const [libraryFiles, setLibraryFiles] = useState<{ fileName: string; objectKey: string }[]>([]);

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

    const allFiles = [...libraryFiles, ...(selectedFiles.length > 0 ? await uploadAll() : [])];
    if (allFiles.length > 0) {
      messageText = buildMessageWithFiles(data.message, allFiles);
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
    setLibraryFiles([]);
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
        <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
          {/* 添付プレビュー */}
          {(selectedFiles.length > 0 || libraryFiles.length > 0) && (
            <Box px={3} pt={3}>
              <FilePreviewList files={selectedFiles} uploading={uploading} onRemove={removeFile} />
              {libraryFiles.length > 0 && (
                <HStack gap={2} flexWrap="wrap" mt={selectedFiles.length > 0 ? 2 : 0}>
                  {libraryFiles.map((f) => (
                    <HStack
                      key={f.objectKey}
                      px={2}
                      py={1}
                      bg="blue.50"
                      borderRadius="md"
                      fontSize="sm"
                      gap={1}
                    >
                      <Folder size={14} />
                      <Text>{f.fileName}</Text>
                    </HStack>
                  ))}
                </HStack>
              )}
            </Box>
          )}

          {/* テキストエリア */}
          <Box px={3} pt={3}>
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
            <Field.Root invalid={!!errors.message}>
              <Textarea
                {...register("message")}
                placeholder="依頼内容を入力"
                autoresize
                minH="80px"
                variant="flushed"
                border="none"
                _focus={{ boxShadow: "none" }}
                disabled={isSending}
              />
              <Field.ErrorText>{errors.message?.message}</Field.ErrorText>
            </Field.Root>
          </Box>

          {/* ツールバー */}
          <HStack px={3} py={2} justify="space-between">
            <HStack gap={0}>
              <IconButton
                aria-label="ファイルを添付"
                variant="ghost"
                size="sm"
                onClick={openFilePicker}
                disabled={isSending || uploading}
              >
                <Paperclip size={16} />
              </IconButton>
              <FileLibrarySelect onSelect={setLibraryFiles} disabled={isSending || uploading} />
            </HStack>

            <HStack gap={2}>
              <NativeSelect.Root size="sm" width="auto">
                <NativeSelect.Field value={provider} onChange={handleProviderChange}>
                  <option value="openai">OpenAI</option>
                  <option value="google">Gemini</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
              <Input
                size="sm"
                width="160px"
                value={model}
                onChange={(e) => void setModel(e.currentTarget.value)}
                placeholder={defaultModels[provider]}
              />
              {isSending && (
                <Button size="sm" variant="outline" onClick={stop}>
                  停止
                </Button>
              )}
              <Button type="submit" size="sm" colorPalette="blue" loading={isSending}>
                送信
              </Button>
            </HStack>
          </HStack>
        </Box>
      </Box>
    </Stack>
  );
}
