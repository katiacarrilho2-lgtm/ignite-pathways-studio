import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Database, History, Upload, Wand2 } from "lucide-react";

const SITUACOES = [
  { v: "lista_espera", label: "Lista de espera" },
  { v: "aguardando_proxima_turma", label: "Aguardando próxima turma" },
  { v: "reengajar", label: "Reengajar" },
  { v: "ja_atendido", label: "Já atendido" },
  { v: "desistente", label: "Desistente" },
  { v: "arquivado", label: "Arquivado" },
];

const INTERESSES = [
  { v: "eja", label: "EJA" },
  { v: "tecnico", label: "Técnico" },
  { v: "competencia", label: "Curso por Competência" },
  { v: "outro", label: "Outro" },
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?55\s*)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;

const normalizePhone = (phone: string) => {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length > 11 && digits.startsWith("55")) return digits;
  return digits;
};

function parseLine(line: string) {
  const raw = line.trim();
  if (!raw) return [];
  const emails = Array.from(raw.match(new RegExp(EMAIL_RE, "g")) ?? []);
  const phones = Array.from(raw.matchAll(PHONE_RE)).map(m => m[0]);
  if (!phones.length && !emails.length) return [];

  // Quando há vários telefones/e-mails na mesma linha (colagem em massa),
  // cada telefone vira um contato próprio — sem herdar um "nome" que na verdade
  // é a lista inteira de outros números.
  const multi = phones.length > 1 || emails.length > 1;
  const nameFromRaw = () => {
    const pieces = raw.split(/[\t;,|:]|\s[—–-]\s/).map(s => s.trim()).filter(Boolean);
    const cand = pieces.find(p => !EMAIL_RE.test(p) && !normalizePhone(p) && p.length > 2);
    if (cand) return cand;
    const cleaned = raw.replace(EMAIL_RE, "").replace(PHONE_RE, "").replace(/[-|·•:()]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > 2 && cleaned.length <= 80 ? cleaned : "";
  };

  return (phones.length ? phones : [""]).map((phone, index) => {
    const email = emails[index] ?? (multi ? "" : emails[0] ?? "");
    const baseName = multi ? "" : nameFromRaw();
    const nome = baseName || (email ? email.split("@")[0] : phone || "(sem nome)");
    return { nome, whatsapp: phone || "", email };
  });
}

export default function LeadsImportar() {
  const [texto, setTexto] = useState("");
  const [situacao, setSituacao] = useState("reengajar");
  const [interesse, setInteresse] = useState("outro");
  const [curso, setCurso] = useState("");
  const [origemTipo, setOrigemTipo] = useState("grupo_whatsapp");
  const [grupoNome, setGrupoNome] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [dupBatch, setDupBatch] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const origemFinal = origemTipo === "grupo_whatsapp"
    ? `Grupo WhatsApp: ${grupoNome.trim()}`
    : origemTipo === "manual"
      ? "Manual / outro"
      : origemTipo;

  const parse = () => {
    const linhas = texto.split(/\r?\n/).flatMap(parseLine).filter(Boolean) as any[];
    if (linhas.length === 0) return toast.error("Nenhum telefone ou e-mail reconhecido");

    const seen = new Set<string>();
    const unicos: any[] = [];
    let duplicated = 0;
    for (const l of linhas) {
      const phoneKey = normalizePhone(l.whatsapp || "");
      const key = phoneKey || (l.email || "").toLowerCase();
      if (!key) continue;
      if (seen.has(key)) { duplicated++; continue; }
      seen.add(key);
      unicos.push({ ...l, whatsapp_norm: phoneKey });
    }

    setRows(unicos);
    setDupBatch(duplicated);
    setImportResult(null);
    toast.success(`${unicos.length} contato(s) único(s) detectado(s)${duplicated ? ` — ${duplicated} repetido(s) removido(s)` : ""}`);
  };

  const importar = async () => {
    if (rows.length === 0) return toast.error("Nada para importar. Clique em Detectar primeiro.");
    if (origemTipo === "grupo_whatsapp" && !grupoNome.trim()) return toast.error("Informe o nome do grupo de WhatsApp.");
    setImporting(true);
    const { data, error } = await (supabase.rpc("lead_bank_import_batch" as any, {
      _items: rows.map(r => ({ nome: r.nome, whatsapp: r.whatsapp, email: r.email })),
      _origem: origemFinal,
      _origem_tipo: origemTipo,
      _grupo_nome: origemTipo === "grupo_whatsapp" ? grupoNome.trim() : null,
      _situacao: situacao,
      _interesse_tipo: interesse,
      _curso_interesse: curso.trim() || null,
    }) as any);
    setImporting(false);
    if (error) return toast.error(error.message);
    setImportResult(data);
    toast.success(`${data.created} novo(s) salvo(s), ${data.updated_existing} repetido(s) com histórico atualizado`);
    setTexto("");
    setRows([]);
  };

  const preview = useMemo(() => rows.slice(0, 30), [rows]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-primary">Importar contatos dos grupos</h2>
        <p className="text-sm text-muted-foreground">Cole números extraídos do WhatsApp. O sistema limpa repetidos, salva os novos e registra o grupo nos contatos que já existiam.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Origem do lote</label>
          <Select value={origemTipo} onValueChange={setOrigemTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grupo_whatsapp">Grupo de WhatsApp</SelectItem>
              <SelectItem value="excel">Planilha Excel</SelectItem>
              <SelectItem value="google">Google Contatos</SelectItem>
              <SelectItem value="indicacao">Indicação</SelectItem>
              <SelectItem value="manual">Manual / outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {origemTipo === "grupo_whatsapp" && (
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Nome do grupo *</label>
            <Input value={grupoNome} onChange={e => setGrupoNome(e.target.value)} placeholder="Ex.: Grupo Santa Fé - Três Lagoas" />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground">Situação inicial</label>
          <Select value={situacao} onValueChange={setSituacao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SITUACOES.map(s => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Interesse</label>
          <Select value={interesse} onValueChange={setInteresse}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{INTERESSES.map(i => <SelectItem key={i.v} value={i.v}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Curso</label>
          <Input value={curso} onChange={e => setCurso(e.target.value)} placeholder="Ex.: Enfermagem" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Cole aqui os contatos do grupo</label>
        <Textarea rows={12} value={texto} onChange={e => setTexto(e.target.value)} placeholder={"Ex.:\nAline Malaquias: +55 67 98115-6969\nMaria Silva (11) 98888-1234\nJoão Souza — 21 97777-5555\n+55 67 99999-0000"} />
        <div className="flex flex-wrap justify-end gap-2 mt-2">
          <Button variant="outline" onClick={parse}><Wand2 className="size-4 mr-1" />Detectar e limpar repetidos</Button>
          <Button onClick={importar} disabled={importing || rows.length === 0}><Upload className="size-4 mr-1" />Salvar no Banco {rows.length ? `(${rows.length})` : ""}</Button>
        </div>
      </div>

      {dupBatch > 0 && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Repetidos na colagem removidos</AlertTitle>
          <AlertDescription>{dupBatch} número(s)/e-mail(s) repetido(s) foram removidos antes de salvar.</AlertDescription>
        </Alert>
      )}

      {importResult && (
        <Alert className={importResult.in_crm ? "bg-amber-50 border-amber-200 text-amber-950" : "bg-emerald-50 border-emerald-200 text-emerald-950"}>
          {importResult.in_crm ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
          <AlertTitle>Importação concluída</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{importResult.created} novos</Badge>
              <Badge variant="outline"><History className="size-3 mr-1" />{importResult.updated_existing} já existiam: histórico atualizado</Badge>
              <Badge variant="outline">{importResult.in_crm} em atendimento</Badge>
              <Badge variant="outline">{importResult.skipped} ignorados</Badge>
            </div>
            <Button asChild size="sm" className="mt-3"><Link to="/admin/leads/banco"><Database className="size-4 mr-1" />Abrir Banco de Leads</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      {rows.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border text-sm font-medium bg-secondary/50">Prévia ({rows.length}) — mostrando {preview.length}</div>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-secondary/30">
              <tr><th className="text-left px-3 py-2">Nome</th><th className="text-left px-3 py-2">WhatsApp</th><th className="text-left px-3 py-2">Normalizado</th><th className="text-left px-3 py-2">Email</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.map((r, i) => (
                <tr key={`${r.whatsapp_norm}-${i}`}>
                  <td className="px-3 py-2">{r.nome}</td>
                  <td className="px-3 py-2">{r.whatsapp || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.whatsapp_norm || "—"}</td>
                  <td className="px-3 py-2">{r.email || <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}