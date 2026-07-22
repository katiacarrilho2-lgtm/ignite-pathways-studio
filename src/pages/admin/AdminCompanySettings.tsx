import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { RequirePermission } from "@/components/admin/AdminLayout";

type Company = Record<string, any>;

const FIELDS: { key: string; label: string; col?: number }[] = [
  { key: "razao_social", label: "Razão social" },
  { key: "nome_fantasia", label: "Nome fantasia" },
  { key: "cnpj", label: "CNPJ" },
  { key: "inscricao_estadual", label: "Inscrição estadual" },
  { key: "endereco", label: "Endereço", col: 2 },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "cep", label: "CEP" },
  { key: "telefone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail" },
  { key: "site", label: "Site" },
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "responsavel_nome", label: "Responsável (nome)" },
  { key: "responsavel_cargo", label: "Responsável (cargo)" },
  { key: "logo_url", label: "URL do logo", col: 2 },
];

const Inner = () => {
  const [row, setRow] = useState<Company>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("company_settings").select("*").eq("singleton", true).maybeSingle();
    setRow((data ?? { singleton: true }) as Company);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = { ...row, singleton: true };
      delete payload.created_at; delete payload.updated_at;
      const { error } = row.id
        ? await supabase.from("company_settings").update(payload).eq("id", row.id)
        : await supabase.from("company_settings").insert(payload);
      if (error) throw error;
      toast.success("Configurações salvas"); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><Building2 className="size-7" /> Configurações da empresa</h1>
        <p className="text-muted-foreground">Dados institucionais utilizados em contratos, propostas, boletos e assinaturas.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da Multplick</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.col === 2 ? "md:col-span-2" : ""}>
                <Label>{f.label}</Label>
                <Input value={row[f.key] ?? ""} onChange={(e) => setRow({ ...row, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="hero" onClick={save} disabled={saving}><Save className="size-4" /> {saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </CardContent>
      </Card>

      {row.logo_url && (
        <div className="rounded-xl border p-4 bg-card">
          <p className="text-xs text-muted-foreground mb-2">Pré-visualização do logo:</p>
          <img src={row.logo_url} alt="Logo Multplick" className="max-h-24" />
        </div>
      )}
    </div>
  );
};

export default function AdminCompanySettings() {
  return <RequirePermission perm="manage_content"><Inner /></RequirePermission>;
}
