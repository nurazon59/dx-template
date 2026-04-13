import { Box, HStack, IconButton, Spinner, Text } from "@chakra-ui/react";
import { X } from "lucide-react";
import type { SelectedFile } from "../../agent/hooks/useFileUpload";
import { formatFileSize, getFileTypeInfo } from "../lib/file-utils";

interface FilePreviewListProps {
  files: SelectedFile[];
  uploading: boolean;
  onRemove: (id: string) => void;
}

export function FilePreviewList({ files, uploading, onRemove }: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <Box borderWidth="1px" borderRadius="md" p={2}>
      {files.map((entry) => {
        const typeInfo = getFileTypeInfo(entry.file.type);
        return (
          <HStack key={entry.id} justify="space-between" py={1} px={2}>
            <HStack gap={2} minW={0}>
              <typeInfo.icon size={14} />
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
                <X size={14} />
              </IconButton>
            )}
          </HStack>
        );
      })}
    </Box>
  );
}
