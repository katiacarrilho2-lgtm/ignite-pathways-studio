import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Palette,
  List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, Link2, Image as ImageIcon, Undo2, Redo2, Loader2, Pilcrow, Eraser,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--destructive))", "#16a34a", "#2563eb", "#f59e0b", "#7c3aed", "#0f172a", "#64748b",
];

type Props = {
  value: string;
  onChange: (html: string) => void;
  onUploadImage?: (file: File) => Promise<string | null>;
  minHeight?: number;
};

const TbBtn = ({ active, onClick, title, children, disabled }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }) => (
  <button type="button" title={title} onClick={onClick} disabled={disabled}
    className={`h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-md text-sm transition-colors disabled:opacity-40 ${active ? "bg-secondary text-primary" : "hover:bg-secondary text-foreground"}`}>
    {children}
  </button>
);

const Divider = () => <span className="w-px h-5 bg-border mx-0.5" />;

export const RichTextEditor = ({ value, onChange, onUploadImage, minHeight = 280 }: Props) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "max-w-full h-auto rounded-md" } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none focus:outline-none px-4 py-3",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editor in sync if `value` is replaced externally (e.g. opening another lesson)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "<p></p>") !== current) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) return null;

  const handleImage = async (file: File) => {
    if (!onUploadImage) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) editor.chain().focus().setImage({ src: url }).run();
    } finally { setUploading(false); }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL do link:", prev ?? "https://");
    if (url === null) return;
    if (url === "") return editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run();
  };

  const blockValue =
    editor.isActive("heading", { level: 2 }) ? "h2" :
    editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  const fontValue = (editor.getAttributes("textStyle").fontFamily as string) || "default";

  return (
    <div className="border border-border rounded-md bg-background">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/30 sticky top-0 z-10">
        <Select value={blockValue} onValueChange={(v) => {
          if (v === "p") editor.chain().focus().setParagraph().run();
          if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
          if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
        }}>
          <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Parágrafo</SelectItem>
            <SelectItem value="h2">Título H2</SelectItem>
            <SelectItem value="h3">Subtítulo H3</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fontValue} onValueChange={(v) => {
          if (v === "default") editor.chain().focus().unsetFontFamily().run();
          else editor.chain().focus().setFontFamily(v).run();
        }}>
          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Fonte padrão</SelectItem>
            <SelectItem value="Georgia, serif">Serifa (Georgia)</SelectItem>
            <SelectItem value="'Times New Roman', serif">Times</SelectItem>
            <SelectItem value="'Courier New', monospace">Monoespaçada</SelectItem>
            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
          </SelectContent>
        </Select>

        <Divider />
        <TbBtn title="Negrito (Ctrl+B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="size-4" /></TbBtn>
        <TbBtn title="Itálico (Ctrl+I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="size-4" /></TbBtn>
        <TbBtn title="Sublinhado (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="size-4" /></TbBtn>
        <TbBtn title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></TbBtn>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" title="Cor da letra" className="h-8 min-w-8 px-1.5 inline-flex items-center justify-center rounded-md hover:bg-secondary">
              <Palette className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => editor.chain().focus().setColor(c).run()}
                  className="size-7 rounded-md border border-border" style={{ background: c }} title={c} />
              ))}
            </div>
            <button type="button" onClick={() => editor.chain().focus().unsetColor().run()}
              className="mt-2 w-full text-xs px-2 py-1 rounded-md hover:bg-secondary inline-flex items-center gap-1 justify-center">
              <Eraser className="size-3" /> Limpar cor
            </button>
          </PopoverContent>
        </Popover>

        <TbBtn title="Destacar (marca-texto)" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="size-4" /></TbBtn>

        <Divider />
        <TbBtn title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="size-4" /></TbBtn>
        <TbBtn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></TbBtn>
        <TbBtn title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></TbBtn>

        <Divider />
        <TbBtn title="Alinhar à esquerda" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="size-4" /></TbBtn>
        <TbBtn title="Centralizar" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="size-4" /></TbBtn>
        <TbBtn title="Alinhar à direita" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="size-4" /></TbBtn>
        <TbBtn title="Justificar" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify className="size-4" /></TbBtn>

        <Divider />
        <TbBtn title="Link" active={editor.isActive("link")} onClick={setLink}><Link2 className="size-4" /></TbBtn>
        {onUploadImage && (
          <>
            <TbBtn title="Inserir imagem" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
            </TbBtn>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }} />
          </>
        )}

        <Divider />
        <TbBtn title="Desfazer" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="size-4" /></TbBtn>
        <TbBtn title="Refazer" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="size-4" /></TbBtn>
        <TbBtn title="Limpar formatação" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><Pilcrow className="size-4" /></TbBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;