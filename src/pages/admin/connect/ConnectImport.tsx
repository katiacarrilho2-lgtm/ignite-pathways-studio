import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { onlyDigits } from "./hooks";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Row = Record<string, any>;
const TARGETS = [
  { key: "nome", label: "Nome *" },
  { key: "whatsapp", label: "WhatsApp *" },
  { key: "email", label: "E-mail" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado/UF" },
  { key: "origem", label: "Origem" },
];

export default function ConnectImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv") {
      Papa.parse<Row>(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => { setRows(res.data); setHeaders(res.meta.fields || []); autoMap(res.meta.fields || []); },
      });
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
      const hs = Object.keys(json[0] || {});
      setRows(json); setHeaders(hs); autoMap(hs);
    }
  };

  const autoMap = (hs: string[]) => {
    const m: Record<string, string> = {};
    hs.forEach(h => {
      const l = h.toLowerCase().trim();
      if (/nome|name/.test(l)) m.nome = h;
      else if (/whats|telefone|celular|fone|phone/.test(l)) m.whatsapp = h;
      else if (/mail/.test(l)) m.email = h;
      else if (/cidade|city/.test(l)) m.cidade = h;
      else if (/^uf$|estado|state/.test(l)) m.estado = h;
      else if (/origem|source/.test(l)) m.origem = h;
    });
    setMapping(m);
  };

  const preview = rows.slice(0, 10).map(r => {
    const o: any = {};
    TARGETS.forEach(t => { o[t.key] = mapping[t.key] ? r[mapping[t.key]] : ""; });
    const valid = !!o.nome && !!o.whatsapp && onlyDigits(String(o.whatsapp)).length >= 8;
    return { ...o, _valid: valid };
  });

  const importAll = async () => {
    if (!mapping.nome || !mapping.whatsapp) { toast.error("Mapeie ao menos Nome e WhatsApp"); return; }
    setBusy(true);
    const payload = rows.map(r => {
      const o: any = {};
      TARGETS.forEach(t => { if (mapping[t.key]) o[t.key] = String(r[mapping[t.key]] ?? "").trim(); });
      o.whatsapp = onlyDigits(o.whatsapp || "");
      return o;
    }).filter(p => p.nome && p.whatsapp && p.whatsapp.length >= 8);

    let ok = 0, dup = 0, err = 0;
    for (const p of payload) {
      const { error } = await (supabase as any).from("connect_contacts").insert(p);
      if (!error) ok++;
      else if (error.message?.includes("duplicate") || error.code === "23505") dup++;
      else err++;
    }
    setBusy(false);
    toast.success(`Importação concluída: ${ok} novos, ${dup} duplicados, ${err} erros`);
    qc.invalidateQueries({ queryKey: ["connect"] });
    setRows([]); setHeaders([]); setMapping({});
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileSpreadsheet className="size-5" />Importar contatos via CSV/Excel</CardTitle></CardHeader>
        <CardContent>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button variant="outline" onClick={() => inputRef.current?.click()}><Upload className="size-4" /> Selecionar arquivo</Button>
          <p className="text-xs text-muted-foreground mt-2">Aceita CSV, XLSX. Duplicatas (mesmo WhatsApp) são ignoradas automaticamente.</p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Mapeie as colunas</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TARGETS.map(t => (
                <div key={t.key}>
                  <Label>{t.label}</Label>
                  <Select value={mapping[t.key] || "_none"} onValueChange={v => setMapping(m => ({ ...m, [t.key]: v === "_none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Coluna do arquivo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">(não mapear)</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Preview ({rows.length} linhas no arquivo)</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">✓</th>
                    {TARGETS.map(t => <th key={t.key} className="px-3 py-2 text-left font-medium">{t.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} className={`border-t border-border ${p._valid ? "" : "bg-destructive/5"}`}>
                      <td className="px-3 py-2">{p._valid ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-destructive" />}</td>
                      {TARGETS.map(t => <td key={t.key} className="px-3 py-2 text-foreground">{p[t.key] || "—"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setRows([]); setHeaders([]); }}>Cancelar</Button>
                <Button onClick={importAll} disabled={busy}>{busy ? "Importando..." : `Importar ${rows.length} contatos`}</Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}