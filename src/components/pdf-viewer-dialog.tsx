import { useEffect, useMemo, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PdfDoc = { base64: string; filename: string; title?: string };

function toBlob(base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: "application/pdf" });
}

/** Shows a PDF inside the page, with a direct download button. */
export function PdfViewerDialog({
  doc,
  onClose,
}: {
  doc: PdfDoc | null;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const blob = useMemo(() => (doc ? toBlob(doc.base64) : null), [doc]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    setZoom(100);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  const download = () => {
    if (!blob || !doc) return;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  };

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{doc?.title ?? "Receipt"}</DialogTitle>
          <DialogDescription>{doc?.filename}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={download}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
              −
            </Button>
            <span className="min-w-14 text-center text-sm text-muted-foreground">{zoom}%</span>
            <Button type="button" size="sm" variant="outline" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
              +
            </Button>
          </div>
          <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={onClose}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30">
          {url ? (
            <iframe
              title={doc?.title ?? "Receipt"}
              src={`${url}#zoom=${zoom}`}
              className="h-[70vh] w-full"
              style={{ border: 0 }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
