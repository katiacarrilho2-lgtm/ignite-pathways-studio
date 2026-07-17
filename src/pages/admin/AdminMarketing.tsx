import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Copy, Send, Sparkles, Image as ImageIcon, MessageSquare, Video } from "lucide-react";
import { toast } from "sonner";

type ChatMsg = { role: "user" | "assistant"; content: string };

const TEXT_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (qualidade)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5 (premium)" },
];

const IMAGE_MODELS = [
  { value: "google/gemini-2.5-flash-image", label: "Nano Banana (rápido)" },
  { value: "google/gemini-3-pro-image-preview", label: "Gemini 3 Pro Image (alta qualidade)" },
  { value: "openai/gpt-image-2", label: "GPT Image 2" },
];

const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024"];

const PRESETS = [
  { name: "Post Instagram", prompt: "Crie uma legenda curta (até 3 linhas) com 3 hashtags para post no Instagram sobre o curso de [TEMA]. Foque no benefício prático e use CTA de WhatsApp." },
  { name: "Anúncio Facebook/Meta", prompt: "Escreva um anúncio para Meta Ads do curso de [TEMA]: 1 título (até 40 caracteres), 1 texto principal (até 125 caracteres) e 1 descrição (até 30 caracteres). Tom direto, foco em transformação profissional." },
  { name: "E-mail marketing", prompt: "Escreva um e-mail marketing para divulgar o curso de [TEMA] da Multplick. Estrutura: assunto, abertura empática, 3 benefícios em bullets, prova social, CTA com link, P.S. de urgência ética." },
  { name: "Roteiro Reels/TikTok 30s", prompt: "Crie um roteiro de Reels de 30 segundos sobre o curso de [TEMA]: gancho nos 3s iniciais, 3 cortes com benefícios visuais, CTA final. Indique sugestões de B-roll." },
  { name: "Headline para landing page", prompt: "Gere 5 opções de headline + subheadline para uma landing page do curso de [TEMA] da Multplick, com foco em conversão." },
];

function TextLab() {
  const [model, setModel] = useState(TEXT_MODELS[0].value);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!prompt.trim()) return;
    setLoading(true); setOutput("");
    const { data, error } = await supabase.functions.invoke("marketing-ai", {
      body: { action: "text", prompt, model },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error((data as any).error); return; }
    setOutput((data as any)?.text ?? "");
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-primary"/>Gerador de texto</div>
        <div>
          <Label className="text-xs">Modelo</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TEXT_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Atalhos</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESETS.map(p => (
              <Button key={p.name} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPrompt(p.prompt)}>
                {p.name}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Prompt</Label>
          <Textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Descreva o que você quer gerar..." />
        </div>
        <Button onClick={run} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>}
          Gerar texto
        </Button>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Resultado</div>
          {output && (
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copiado!"); }}>
              <Copy className="size-4"/>Copiar
            </Button>
          )}
        </div>
        <Textarea rows={20} value={output} onChange={e => setOutput(e.target.value)} placeholder="A resposta da IA aparecerá aqui. Você pode editar livremente." />
      </Card>
    </div>
  );
}

function ImageLab() {
  const [model, setModel] = useState(IMAGE_MODELS[0].value);
  const [size, setSize] = useState(IMAGE_SIZES[0]);
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!prompt.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("marketing-ai", {
      body: { action: "image", prompt, model, size },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if ((data as any)?.error) { toast.error(String((data as any).error).slice(0, 200)); return; }
    const img = (data as any)?.image;
    if (img) setImages(prev => [img, ...prev].slice(0, 12));
  }

  function download(src: string, i: number) {
    const a = document.createElement("a");
    a.href = src; a.download = `multplick-ia-${Date.now()}-${i}.png`; a.click();
  }

  return (
    <div className="grid md:grid-cols-[380px_1fr] gap-4">
      <Card className="p-4 space-y-3 h-fit">
        <div className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="size-4 text-primary"/>Gerar imagem</div>
        <div>
          <Label className="text-xs">Modelo</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{IMAGE_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Proporção</Label>
          <Select value={size} onValueChange={setSize}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1024x1024">Quadrado (1024×1024) — Instagram feed</SelectItem>
              <SelectItem value="1024x1536">Vertical (1024×1536) — Stories/Reels</SelectItem>
              <SelectItem value="1536x1024">Horizontal (1536×1024) — Banner site</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Descrição da imagem</Label>
          <Textarea rows={8} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: técnico industrial sorrindo, capacete amarelo, fundo de fábrica desfocado, luz dourada, estilo fotográfico realista" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin"/> : <ImageIcon/>}
          Gerar imagem
        </Button>
        <p className="text-[11px] text-muted-foreground">Dica: descreva sujeito, cenário, iluminação e estilo. Evite logos de terceiros.</p>
      </Card>
      <div>
        {loading && <div className="aspect-square w-full max-w-md mx-auto rounded-lg border border-dashed grid place-items-center text-muted-foreground"><Loader2 className="animate-spin size-8"/></div>}
        {!loading && images.length === 0 && <div className="aspect-square w-full max-w-md mx-auto rounded-lg border border-dashed grid place-items-center text-sm text-muted-foreground p-6 text-center">Suas imagens aparecerão aqui.</div>}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border bg-card">
              <img src={src} alt="" className="w-full aspect-square object-cover"/>
              <Button size="sm" variant="secondary" className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition" onClick={() => download(src, i)}>
                <Download className="size-4"/>Baixar
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatLab() {
  const [model, setModel] = useState(TEXT_MODELS[0].value);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setLoading(true);
    const { data, error } = await supabase.functions.invoke("marketing-ai", {
      body: { action: "chat", messages: next, model, system: "Você é um consultor estratégico de marketing e educação profissional da Multplick. Responda em PT-BR de forma clara e prática, com listas e exemplos quando útil. Pode discutir qualquer tema (marketing, vendas, copy, redes sociais, posicionamento, processos, IA aplicada)." },
    });
    setLoading(false);
    if (error || (data as any)?.error) { toast.error((error?.message) || (data as any)?.error); return; }
    setMessages(m => [...m, { role: "assistant", content: (data as any)?.reply ?? "" }]);
  }

  return (
    <Card className="p-0 overflow-hidden flex flex-col h-[70vh]">
      <div className="border-b p-3 flex items-center gap-3">
        <MessageSquare className="size-4 text-primary"/>
        <span className="text-sm font-semibold">Consultor IA — perguntas ilimitadas</span>
        <div className="ml-auto w-56">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{TEXT_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/30">
        {messages.length === 0 && <p className="text-sm text-muted-foreground text-center mt-10">Pergunte qualquer coisa sobre marketing, vendas, copy, estratégia...</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-card border border-border rounded-lg px-3 py-2"><Loader2 className="animate-spin size-4"/></div></div>}
        <div ref={endRef}/>
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Pergunte algo..." disabled={loading} />
        <Button onClick={send} disabled={loading || !input.trim()}><Send className="size-4"/></Button>
      </div>
    </Card>
  );
}

function VideoLab() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!prompt.trim()) return;
    setLoading(true); setOutput("");
    const { data, error } = await supabase.functions.invoke("marketing-ai", {
      body: {
        action: "text",
        prompt: `Crie um roteiro completo de vídeo curto (15-45s) para redes sociais sobre: ${prompt}.\n\nEntregue: Título, Gancho (3s), Cenas numeradas (visual + narração), CTA final, sugestões de música e hashtags.`,
        model: "google/gemini-2.5-pro",
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) { toast.error((error?.message) || (data as any)?.error); return; }
    setOutput((data as any)?.text ?? "");
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><Video className="size-4 text-primary"/>Roteiro de vídeo</div>
        <p className="text-xs text-muted-foreground">Gere roteiros prontos para gravar Reels, TikTok, YouTube Shorts e anúncios em vídeo. Geração automática de vídeo por IA será adicionada em breve — por enquanto, use o roteiro com sua ferramenta de edição preferida.</p>
        <div>
          <Label className="text-xs">Tema do vídeo</Label>
          <Textarea rows={6} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ex: divulgar curso de NR-35 para trabalhadores da construção civil em SP" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full">
          {loading ? <Loader2 className="animate-spin"/> : <Video/>}
          Gerar roteiro
        </Button>
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Roteiro gerado</div>
          {output && <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copiado!"); }}><Copy className="size-4"/>Copiar</Button>}
        </div>
        <Textarea rows={20} value={output} onChange={e => setOutput(e.target.value)} placeholder="Seu roteiro aparecerá aqui." />
      </Card>
    </div>
  );
}

export default function AdminMarketing() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Sparkles className="size-6"/>Marketing IA</h1>
        <p className="text-sm text-muted-foreground">Geração ilimitada de textos, imagens, roteiros e consultoria por IA — tudo no padrão Multplick.</p>
      </header>
      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text"><Sparkles className="size-4 mr-1.5"/>Textos</TabsTrigger>
          <TabsTrigger value="image"><ImageIcon className="size-4 mr-1.5"/>Imagens</TabsTrigger>
          <TabsTrigger value="video"><Video className="size-4 mr-1.5"/>Vídeo</TabsTrigger>
          <TabsTrigger value="chat"><MessageSquare className="size-4 mr-1.5"/>Consultor</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-4"><TextLab/></TabsContent>
        <TabsContent value="image" className="mt-4"><ImageLab/></TabsContent>
        <TabsContent value="video" className="mt-4"><VideoLab/></TabsContent>
        <TabsContent value="chat" className="mt-4"><ChatLab/></TabsContent>
      </Tabs>
    </div>
  );
}