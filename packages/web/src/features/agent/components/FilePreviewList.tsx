import { Box, HStack, IconButton, Spinner, Text } from "@chakra-ui/react";
import type { SelectedFile } from "../hooks/useFileUpload";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FilePreviewListProps {
  files: SelectedFile[];
  uploading: boolean;
  onRemove: (id: string) => void;
}

export function FilePreviewList({ files, uploading, onRemove }: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <Box borderWidth="1px" borderRadius="md" p={2} mb={2}>
      {files.map((entry) => (
        <HStack key={entry.id} justify="space-between" py={1} px={2}>
          <HStack gap={2} minW={0}>
            <Text fontSize="sm" truncate>
              {entry.file.name}
            </Text>
            <Text fontSize="xs" color="fg.muted" flexShrink={0}>
              {formatFileSize(entry.file.size)}
            </Text>
          </HStack>
          {uploading ? (
            <Spinner size="sm" />
          ) : (
            <IconButton
              aria-label="ファイルを削除"
              size="xs"
              variant="ghost"
              onClick={() => onRemove(entry.id)}
            >
              ✕
            </IconButton>
          )}
        </HStack>
      ))}
    </Box>
  );
}
