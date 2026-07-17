import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

export type AiOptions = {
  level: string;
  audience?: string;
  workload?: string;
  tone: string;
  depth: string;
  include_materials: boolean;
  model: string;
};

const DEFAULTS: AiOptions = {
  level: "Profissionalizante",
  tone: "Didático",
  depth: "Intermediário",
  include_materials: true,
  model: "google/gemini-2.5-flash",
};

export const AiGenerateDialog = ({
  open, onOpenChange, title, description, onConfirm, busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (opts: AiOptions) => Promise<void> | void;
  busy?: boolean;
}) => {
  const [opts, setOpts] = useState<AiOptions>(DEFAULTS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nível</Label>
              <Select value={opts.level} onValueChange={(v) => setOpts({ ...opts, level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Livre", "Profissionalizante", "Técnico", "Graduação", "Pós-graduação", "Corporativo", "EJA"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Profundidade</Label>
              <Select value={opts.depth} onValueChange={(v) => setOpts({ ...opts, depth: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Básico", "Intermediário", "Avançado"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tom</Label>
              <Select value={opts.tone} onValueChange={(v) => setOpts({ ...opts, tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Didático", "Formal", "Técnico"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select value={opts.model} onValueChange={(v) => setOpts({ ...opts, model: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (recomendado)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Público-alvo (opcional)</Label>
            <Input value={opts.audience ?? ""} onChange={(e) => setOpts({ ...opts, audience: e.target.value })} placeholder="Ex: técnicos em segurança do trabalho" />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <Switch checked={opts.include_materials} onCheckedChange={(v) => setOpts({ ...opts, include_materials: v })} />
              <span className="text-sm">Sugerir material complementar (normas, leis, manuais, artigos)</span>
            </label>
          </div>
          <Button
            variant="hero" className="w-full"
            disabled={busy}
            onClick={async () => { await onConfirm(opts); }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gerar com IA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};