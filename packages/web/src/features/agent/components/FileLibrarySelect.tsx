import { Box, Button, HStack, IconButton, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { useGetApiFiles } from "../../../lib/api/generated";

interface FileLibrarySelectProps {
  onSelect: (files: { fileName: string; objectKey: string }[]) => void;
  disabled?: boolean;
}

export function FileLibrarySelect({ onSelect, disabled }: FileLibrarySelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: response } = useGetApiFiles();
  const files = response?.status === 200 ? response.data.files : [];

  const toggleFile = (objectKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(objectKey)) next.delete(objectKey);
      else next.add(objectKey);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedFiles = files
      .filter((f) => selected.has(f.objectKey))
      .map((f) => ({ fileName: f.fileName, objectKey: f.objectKey }));
    onSelect(selectedFiles);
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <Box position="relative">
      <IconButton
        aria-label="ライブラリから選択"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        📁
      </IconButton>
      {open && (
        <Box
          position="absolute"
          bottom="100%"
          left={0}
          mb={1}
          bg="white"
          borderWidth="1px"
          borderRadius="md"
          shadow="md"
          p={3}
          zIndex={10}
          minW="280px"
          maxH="300px"
          overflowY="auto"
        >
          <Stack gap={2}>
            <Text fontWeight="medium" fontSize="sm">
              ファイルライブラリ
            </Text>
            {files.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                ファイルがありません
              </Text>
            ) : (
              files.map((file) => (
                <HStack key={file.id} gap={2} as="label" cursor="pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(file.objectKey)}
                    onChange={() => toggleFile(file.objectKey)}
                  />
                  <Text fontSize="sm" truncate>
                    {file.fileName}
                  </Text>
                </HStack>
              ))
            )}
            {files.length > 0 && (
              <Button
                size="sm"
                colorPalette="blue"
                onClick={handleConfirm}
                disabled={selected.size === 0}
              >
                選択を確定 ({selected.size})
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
