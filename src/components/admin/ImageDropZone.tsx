import { useEffect, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { ClipboardPaste } from "lucide-react";

type Props = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  /** Max size in MB (default 5) */
  maxMB?: number;
  className?: string;
  children?: ReactNode;
  /** Show the helper hint "Clique, arraste ou cole (Ctrl+V)" inside the zone */
  showHint?: boolean;
};

/**
 * Wrapper that adds drag-and-drop + paste (Ctrl/Cmd+V) support to any
 * image upload UI. Renders `children` (typically the existing upload
 * button/label) inside a focusable, dashed area.
 *
 * Paste works in two ways:
 *  - When the zone (or any element inside it) is focused.
 *  - Globally while mounted — useful inside modals, so the user just opens
 *    the dialog and presses Ctrl+V without clicking anywhere first.
 */
export function ImageDropZone({
  onFiles,
  multiple = false,
  maxMB = 5,
  className = "",
  children,
  showHint = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleFiles = (incoming: File[]) => {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    if (!images.length) {
      toast.error("Nenhuma imagem encontrada na área de transferência");
      return;
    }
    const tooBig = images.find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) {
      toast.error(`Imagem muito grande (máx ${maxMB} MB): ${tooBig.name}`);
      return;
    }
    onFiles(multiple ? images : [images[0]]);
  };

  // Global paste listener while mounted
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Ignore paste inside text inputs/textareas/contenteditable
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const it of Array.from(items)) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiple, maxMB]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add("ring-2", "ring-primary");
      }}
      onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-primary")}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("ring-2", "ring-primary");
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) handleFiles(files);
      }}
      className={`rounded-md border border-dashed border-border bg-secondary/20 p-3 outline-none focus:ring-2 focus:ring-primary transition ${className}`}
    >
      {children}
      {showHint && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ClipboardPaste className="size-3" />
          Dica: você também pode <strong>arrastar</strong> a imagem aqui ou apertar <kbd className="px-1 rounded bg-muted">Ctrl</kbd>+<kbd className="px-1 rounded bg-muted">V</kbd> para colar.
        </p>
      )}
    </div>
  );
}

export default ImageDropZone;