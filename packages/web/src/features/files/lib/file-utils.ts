import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, FileText, Image, Paperclip } from "lucide-react";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FileTypeInfo = {
  label: string;
  colorPalette: string;
  icon: LucideIcon;
};

export function getFileTypeInfo(contentType: string): FileTypeInfo {
  if (contentType.startsWith("image/")) {
    return { label: "画像", colorPalette: "green", icon: Image };
  }
  if (contentType === "application/pdf") {
    return { label: "PDF", colorPalette: "red", icon: FileText };
  }
  if (contentType.startsWith("application/vnd.openxmlformats")) {
    return { label: "Excel", colorPalette: "blue", icon: FileSpreadsheet };
  }
  return { label: "ファイル", colorPalette: "gray", icon: Paperclip };
}
