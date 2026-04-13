interface PdfViewerProps {
  url: string;
}

export function PdfViewer({ url }: PdfViewerProps) {
  return (
    <iframe
      src={url}
      title="PDF Viewer"
      style={{ width: "100%", height: "70vh", border: "none" }}
    />
  );
}
