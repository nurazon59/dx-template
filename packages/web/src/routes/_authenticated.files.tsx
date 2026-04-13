import { Box, Container, Heading, Stack, Text } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  getApiFilesByObjectKeyDownload,
  getGetApiFilesQueryKey,
  useDeleteApiFilesByObjectKey,
  useGetApiFilesSuspense,
} from "../lib/api/generated";
import { uploadFile } from "../lib/uploads";
import { DeleteFileDialog } from "../features/files/components/DeleteFileDialog";
import { DropZone } from "../features/files/components/DropZone";
import { FileCard } from "../features/files/components/FileCard";

export const Route = createFileRoute("/_authenticated/files")({
  component: FilesPage,
});

function FilesPage() {
  const { data: response } = useGetApiFilesSuspense();
  const files = response.data.files;

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteApiFilesByObjectKey();
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    objectKey: string;
    fileName: string;
  } | null>(null);

  const handleUpload = async (fileList: FileList) => {
    const selected = Array.from(fileList);
    if (selected.length === 0) return;

    setIsUploading(true);
    try {
      await Promise.all(selected.map((file) => uploadFile(file)));
      await queryClient.invalidateQueries({ queryKey: getGetApiFilesQueryKey() });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { objectKey: encodeURIComponent(deleteTarget.objectKey) },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetApiFilesQueryKey() });
        },
      },
    );
    setDeleteTarget(null);
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

        <DropZone
          onFiles={(fl) => void handleUpload(fl)}
          accept=".xlsx,.pdf,.jpg,.jpeg,.png,.webp"
          uploading={isUploading}
        />

        {files.length === 0 ? (
          <Text color="fg.muted">ファイルはまだありません</Text>
        ) : (
          <Stack gap={3}>
            {files.map((file) => (
              <FileCard
                key={file.id}
                fileName={file.fileName}
                contentType={file.contentType}
                contentLength={file.contentLength}
                createdAt={file.createdAt}
                onPreview={() => void handlePreview(file.objectKey)}
                onDelete={() =>
                  setDeleteTarget({ objectKey: file.objectKey, fileName: file.fileName })
                }
              />
            ))}
          </Stack>
        )}
      </Stack>

      <DeleteFileDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        fileName={deleteTarget?.fileName ?? ""}
      />
    </Container>
  );
}
