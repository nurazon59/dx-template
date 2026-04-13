import { Center, Image } from "@chakra-ui/react";

interface ImageViewerProps {
  url: string;
}

export function ImageViewer({ url }: ImageViewerProps) {
  return (
    <Center>
      <Image src={url} maxW="100%" maxH="70vh" objectFit="contain" />
    </Center>
  );
}
