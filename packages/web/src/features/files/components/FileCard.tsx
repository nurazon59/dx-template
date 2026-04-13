import { Badge, Box, HStack, IconButton, Text } from "@chakra-ui/react";
import { Trash2 } from "lucide-react";
import { formatFileSize, getFileTypeInfo } from "../lib/file-utils";

interface FileCardProps {
  fileName: string;
  contentType: string;
  contentLength: number;
  createdAt: string;
  onPreview: () => void;
  onDelete: () => void;
}

export function FileCard({
  fileName,
  contentType,
  contentLength,
  createdAt,
  onPreview,
  onDelete,
}: FileCardProps) {
  const typeInfo = getFileTypeInfo(contentType);

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <HStack justify="space-between">
        <Box
          as="button"
          textAlign="left"
          minW={0}
          onClick={onPreview}
          cursor="pointer"
          _hover={{ textDecoration: "underline" }}
        >
          <HStack gap={1}>
            <typeInfo.icon size={16} />
            <Text fontWeight="medium" truncate>
              {fileName}
            </Text>
          </HStack>
        </Box>
        <IconButton
          aria-label="削除"
          size="sm"
          variant="ghost"
          colorPalette="red"
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </IconButton>
      </HStack>
      <HStack gap={2} mt={1}>
        <Badge colorPalette={typeInfo.colorPalette} size="sm">
          {typeInfo.label}
        </Badge>
        <Text fontSize="xs" color="fg.muted">
          {formatFileSize(contentLength)}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {new Date(createdAt).toLocaleDateString("ja-JP")}
        </Text>
      </HStack>
    </Box>
  );
}
