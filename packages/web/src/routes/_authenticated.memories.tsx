import {
  Box,
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  getGetApiMemoriesQueryKey,
  useDeleteApiMemoriesById,
  useGetApiMemoriesSuspense,
  usePostApiMemories,
  usePutApiMemoriesById,
} from "../lib/api/generated";

export const Route = createFileRoute("/_authenticated/memories")({
  component: MemoriesPage,
});

function MemoriesPage() {
  const { data: response } = useGetApiMemoriesSuspense();
  const memories = response.status === 200 ? response.data.memories : [];
  const queryClient = useQueryClient();

  const createMutation = usePostApiMemories();
  const updateMutation = usePutApiMemoriesById();
  const deleteMutation = useDeleteApiMemoriesById();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setTitle("");
    setContent("");
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setTitle("");
    setContent("");
  };

  const handleEdit = (memory: { id: string; title: string; content: string }) => {
    setEditingId(memory.id);
    setIsCreating(false);
    setTitle(memory.title);
    setContent(memory.content);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    if (isCreating) {
      createMutation.mutate(
        { data: { title: title.trim(), content: content.trim(), source: "web" as const } },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: getGetApiMemoriesQueryKey() });
            resetForm();
          },
        },
      );
    } else if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: { title: title.trim(), content: content.trim() } },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: getGetApiMemoriesQueryKey() });
            resetForm();
          },
        },
      );
    }
  };

  const handleDelete = (id: string, memoryTitle: string) => {
    if (!window.confirm(`「${memoryTitle}」を削除しますか？`)) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetApiMemoriesQueryKey() });
        },
      },
    );
  };

  const isEditing = isCreating || editingId !== null;

  return (
    <Container maxW="4xl" py={10}>
      <Stack gap={6}>
        <Box>
          <Heading size="2xl">メモリ</Heading>
          <Text color="fg.muted" mt={2}>
            チーム共有のナレッジベース
          </Text>
        </Box>

        {isEditing ? (
          <Stack gap={4} p={4} borderWidth="1px" borderRadius="md">
            <Heading size="md">{isCreating ? "新規作成" : "編集"}</Heading>
            <Input
              placeholder="タイトル"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="本文"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
            <Box display="flex" gap={2}>
              <Button
                onClick={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
              <Button variant="ghost" onClick={resetForm}>
                キャンセル
              </Button>
            </Box>
          </Stack>
        ) : (
          <Box>
            <Button onClick={handleCreate}>新規作成</Button>
          </Box>
        )}

        {memories.length === 0 ? (
          <Text color="fg.muted">メモリはまだありません</Text>
        ) : (
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>タイトル</Table.ColumnHeader>
                <Table.ColumnHeader>登録元</Table.ColumnHeader>
                <Table.ColumnHeader>作成日</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {memories.map((memory) => (
                <Table.Row key={memory.id}>
                  <Table.Cell>{memory.title}</Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {memory.source}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {new Date(memory.createdAt).toLocaleDateString("ja-JP")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        aria-label="編集"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(memory)}
                      >
                        ✎
                      </IconButton>
                      <IconButton
                        aria-label="削除"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(memory.id, memory.title)}
                      >
                        ✕
                      </IconButton>
                    </Box>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Stack>
    </Container>
  );
}
