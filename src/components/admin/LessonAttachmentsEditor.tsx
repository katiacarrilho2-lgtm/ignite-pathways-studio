import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Link2, Paperclip, Trash2, Upload, Loader2, ExternalLink } from "lucide-react";

export type Attachment = {
  kind: "video_link" | "link" | "file";
  title: string;
  url: string;
  mime?: string;
};

type Props = {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  onUploadFile: (file: File) => Promise<{ url: string; mime: string } | null>;
};

const iconFor = (a: Attachment) =>
  a.kind === "video_link" ? Video : a.kind === "file" ? Paperclip : Link2;

export const LessonAttachmentsEditor = ({ value, onChange, onUploadFile }: Props) => {
  const [adding, setAdding] = useState<"video_link" | "link" | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const items = value ?? [];

  const add = (a: Attachment) => onChange([...(items), a]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  const commitDraft = () => {
    if (!adding) return;
    const url = draftUrl.trim();
    const title = draftTitle.trim() || url;
    if (!url) return;
    add({ kind: adding, title, url });
    setAdding(null); setDraftTitle(""); setDraftUrl("");
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const res = await onUploadFile(file);
      if (res) add({ kind: "file", title: file.name, url: res.url, mime: res.mime });
    } finally { setUploading(false); }
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Materiais e links extras</Label>
        <span className="text-xs text-muted-foreground">{items.length} item(ns)</span>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((a, i) => {
            const Icon = iconFor(a);
            return (
              <li key={i} className="flex items-center gap-2 text-sm bg-secondary/40 rounded-md px-2 py-1.5">
                <Icon className="size-4 text-primary shrink-0" />
                <span className="flex-1 truncate">{a.title}</span>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="size-3.5" />
                </a>
                <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={() => remove(i)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="space-y-2 bg-secondary/30 rounded-md p-2">
          <Input placeholder="Título (opcional)" value={draftTitle} onChange={e => setDraftTitle(e.target.value)} />
          <Input
            placeholder={adding === "video_link" ? "URL do vídeo (YouTube, Vimeo, Drive...)" : "URL"}
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="hero" onClick={commitDraft}>Adicionar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(null); setDraftTitle(""); setDraftUrl(""); }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setAdding("video_link")}>
            <Video className="size-3.5" /> Link de vídeo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdding("link")}>
            <Link2 className="size-3.5" /> Link / material
          </Button>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-secondary cursor-pointer">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Enviar arquivo
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*"
              disabled={uploading}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Adicione links de vídeo, materiais externos ou envie arquivos (PDF, DOCX, planilhas — até 20 MB).
      </p>
    </div>
  );
};