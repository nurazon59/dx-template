import { Box, Button, Container, Heading, IconButton, Stack, Table, Text } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  getApiFilesByObjectKeyDownload,
  getGetApiFilesQueryKey,
  useDeleteApiFilesByObjectKey,
  useGetApiFilesSuspense,
} from "../lib/api/generated";
import { authClient } from "../lib/auth";
import { uploadFile } from "../lib/uploads";

export const Route = createFileRoute("/_authenticated/files")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      throw redirect({ to: "/login" });
    }
    return { session: data };
  },
  component: FilesPage,
});

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function FilesPage() {
  const { data: response } = useGetApiFilesSuspense();
  const files = response.data.files;

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteApiFilesByObjectKey();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setIsUploading(true);
    try {
      await Promise.all(selected.map((file) => uploadFile(file)));
      await queryClient.invalidateQueries({ queryKey: getGetApiFilesQueryKey() });
    } finally {
      setIsUploading(false);
      // 同一ファイルを再アップロードできるようリセット
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (objectKey: string, fileName: string) => {
    if (!window.confirm(`「${fileName}」を削除しますか？`)) return;
    deleteMutation.mutate(
      { objectKey: encodeURIComponent(objectKey) },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetApiFilesQueryKey() });
        },
      },
    );
  };

  const handlePreview = async (objectKey: string) => {
    const result = await getApiFilesByObjectKeyDownload(encodeURIComponent(objectKey));
    if (result.status === 200) {
      window.open(result.data.download.downloadUrl, "_blank");
    }
  };

  return (
    <Container maxW="4xl" py={10}>
      <Stack gap={6}>
        <Box>
          <Heading size="2xl">ファイル</Heading>
          <Text color="fg.muted" mt={2}>
            アップロード済みファイルの管理
          </Text>
        </Box>

        <Box>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            onChange={(e) => void handleUpload(e)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            loading={isUploading}
            loadingText="アップロード中..."
          >
            ファイルをアップロード
          </Button>
        </Box>

        {files.length === 0 ? (
          <Text color="fg.muted">ファイルはまだありません</Text>
        ) : (
          <Table.Root variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>ファイル名</Table.ColumnHeader>
                <Table.ColumnHeader>種別</Table.ColumnHeader>
                <Table.ColumnHeader>サイズ</Table.ColumnHeader>
                <Table.ColumnHeader>作成日</Table.ColumnHeader>
                <Table.ColumnHeader />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {files.map((file) => (
                <Table.Row key={file.id}>
                  <Table.Cell>
                    <Button
                      variant="plain"
                      size="sm"
                      p={0}
                      height="auto"
                      fontWeight="normal"
                      onClick={() => void handlePreview(file.objectKey)}
                    >
                      {file.fileName}
                    </Button>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {file.contentType}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{formatFileSize(file.contentLength)}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">
                      {new Date(file.createdAt).toLocaleDateString("ja-JP")}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      aria-label="削除"
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(file.objectKey, file.fileName)}
                    >
                      ✕
                    </IconButton>
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
