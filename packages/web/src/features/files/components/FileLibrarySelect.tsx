import {
  Box,
  Button,
  CheckboxControl,
  CheckboxHiddenInput,
  CheckboxLabel,
  CheckboxRoot,
  HStack,
  IconButton,
  PopoverBody,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
  Stack,
  Text,
} from "@chakra-ui/react";
import { FolderOpen } from "lucide-react";
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
    <PopoverRoot
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      positioning={{ placement: "top-start" }}
    >
      <PopoverTrigger asChild>
        <IconButton aria-label="ライブラリから選択" variant="ghost" size="sm" disabled={disabled}>
          <FolderOpen size={16} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverBody>
          <Stack gap={2}>
            <Text fontWeight="medium" fontSize="sm">
              ファイルライブラリ
            </Text>
            {files.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                ファイルがありません
              </Text>
            ) : (
              <Box maxH="240px" overflowY="auto">
                <Stack gap={1}>
                  {files.map((file) => (
                    <CheckboxRoot
                      key={file.id}
                      checked={selected.has(file.objectKey)}
                      onCheckedChange={() => toggleFile(file.objectKey)}
                    >
                      <CheckboxHiddenInput />
                      <HStack gap={2} cursor="pointer">
                        <CheckboxControl />
                        <CheckboxLabel>
                          <Text fontSize="sm" truncate>
                            {file.fileName}
                          </Text>
                        </CheckboxLabel>
                      </HStack>
                    </CheckboxRoot>
                  ))}
                </Stack>
              </Box>
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
        </PopoverBody>
      </PopoverContent>
    </PopoverRoot>
  );
}
