import {
  Badge,
  Button,
  Center,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  HStack,
  Spinner,
} from "@chakra-ui/react";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getApiFilesByObjectKeyDownload } from "../../../lib/api/generated";
import { getFileTypeInfo } from "../lib/file-utils";
import { ImageViewer } from "./viewers/ImageViewer";
import { PdfViewer } from "./viewers/PdfViewer";
import { XlsxViewer } from "./viewers/XlsxViewer";

interface FileViewerDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  contentType: string;
  objectKey: string;
}

export function FileViewerDialog({
  open,
  onClose,
  fileName,
  contentType,
  objectKey,
}: FileViewerDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const typeInfo = getFileTypeInfo(contentType);

  useEffect(() => {
    if (!open) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchUrl() {
      const result = await getApiFilesByObjectKeyDownload(encodeURIComponent(objectKey));
      if (!cancelled && result.status === 200) {
        setUrl(result.data.download.downloadUrl);
      }
      if (!cancelled) setLoading(false);
    }

    void fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [open, objectKey]);

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      size="cover"
      placement="center"
    >
      <DialogContent>
        <DialogHeader>
          <HStack gap={2}>
            <typeInfo.icon size={18} />
            <DialogTitle>{fileName}</DialogTitle>
            <Badge colorPalette={typeInfo.colorPalette} size="sm">
              {typeInfo.label}
            </Badge>
          </HStack>
        </DialogHeader>
        <DialogBody>
          {loading || !url ? (
            <Center h="50vh">
              <Spinner size="lg" />
            </Center>
          ) : (
            <ViewerSwitch contentType={contentType} url={url} />
          )}
        </DialogBody>
        <DialogFooter>
          {url && (
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />
                新しいタブで開く
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

function ViewerSwitch({ contentType, url }: { contentType: string; url: string }) {
  if (contentType.startsWith("image/")) return <ImageViewer url={url} />;
  if (contentType === "application/pdf") return <PdfViewer url={url} />;
  if (contentType.startsWith("application/vnd.openxmlformats")) return <XlsxViewer url={url} />;

  // 未対応の場合はiframeでフォールバック
  return (
    <iframe
      src={url}
      title="File Viewer"
      style={{ width: "100%", height: "70vh", border: "none" }}
    />
  );
}
