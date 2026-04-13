import { Box, Text } from "@chakra-ui/react";
import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: FileList) => void;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
}

export function DropZone({ onFiles, accept, disabled, uploading }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !uploading) setDragging(true);
    },
    [disabled, uploading],
  );

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled || uploading) return;
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files);
      }
    },
    [disabled, uploading, onFiles],
  );

  const handleClick = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <Box
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={dragging ? "blue.500" : "border.muted"}
      borderRadius="lg"
      p={8}
      textAlign="center"
      cursor={disabled || uploading ? "not-allowed" : "pointer"}
      opacity={disabled ? 0.5 : 1}
      transition="border-color 0.15s"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input ref={inputRef} type="file" multiple accept={accept} hidden onChange={handleChange} />
      <Text color="fg.muted" fontSize="sm">
        {uploading ? "アップロード中..." : "ファイルをドラッグ&ドロップ、またはクリックして選択"}
      </Text>
    </Box>
  );
}
