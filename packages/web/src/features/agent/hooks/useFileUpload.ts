import { useCallback, useRef, useState } from "react";
import { uploadFile } from "../../../lib/uploads";

export type SelectedFile = {
  id: string;
  file: File;
};

type UploadedFile = {
  fileName: string;
  objectKey: string;
};

export function useFileUpload() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: SelectedFile[] = Array.from(newFiles).map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const uploadAll = useCallback(
    async (options?: { signal?: AbortSignal }): Promise<UploadedFile[]> => {
      if (files.length === 0) return [];

      setUploading(true);
      try {
        const results = await Promise.all(
          files.map(async ({ file }) => {
            const { objectKey } = await uploadFile(file, options);
            return { fileName: file.name, objectKey };
          }),
        );
        return results;
      } finally {
        setUploading(false);
      }
    },
    [files],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    files,
    uploading,
    fileInputRef,
    addFiles,
    removeFile,
    uploadAll,
    reset,
    openFilePicker,
  } as const;
}

export function buildMessageWithFiles(text: string, uploadedFiles: UploadedFile[]): string {
  if (uploadedFiles.length === 0) return text;

  const fileLines = uploadedFiles
    .map((f) => `- ${f.fileName} (objectKey: ${f.objectKey})`)
    .join("\n");

  return `[添付ファイル]\n${fileLines}\n\n${text}`;
}
