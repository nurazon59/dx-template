import {
  Button,
  DialogActionTrigger,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@chakra-ui/react";

interface DeleteFileDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileName: string;
}

export function DeleteFileDialog({ open, onClose, onConfirm, fileName }: DeleteFileDialogProps) {
  return (
    <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} placement="center">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ファイルの削除</DialogTitle>
        </DialogHeader>
        <DialogBody>「{fileName}」を削除しますか？この操作は取り消せません。</DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">キャンセル</Button>
          </DialogActionTrigger>
          <Button colorPalette="red" onClick={onConfirm}>
            削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
