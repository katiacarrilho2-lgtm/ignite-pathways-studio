import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { CompanySettings } from "@/lib/corporativo/company";

export default function AdminCompanySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CompanySettings>({});

  useEffect(() => {
    (async () => {
      const { data: row, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (row) setData(row as any);
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...data, singleton: true };
    delete (payload as any).created_at;
    delete (payload as any).updated_at;
    const { error } = data.id
      ? await supabase.from("company_settings").update(payload).eq("id", data.id)
      : await supabase.from("company_settings").insert(payload as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas. Serão usadas em todas as próximas propostas.");
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon"><Link to="/admin/corporativo"><ArrowLeft className="size-4" /></Link></Button>
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <Building2 className="size-3.5" /> Configurações da Empresa
          </div>
          <h1 className="text-2xl font-semibold mt-1">Dados Institucionais Multplick</h1>
          <p className="text-sm text-muted-foreground">Estes dados aparecem automaticamente no cabeçalho, rodapé e local de assinatura de todas as propostas.</p>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Identidade</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Razão Social</Label><Input value={data.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} /></div>
            <div><Label>Nome Fantasia</Label><Input value={data.nome_fantasia || ""} onChange={(e) => set("nome_fantasia", e.target.value)} /></div>
            <div><Label>CNPJ</Label><Input value={data.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} /></div>
            <div><Label>Inscrição Estadual</Label><Input value={data.inscricao_estadual || ""} onChange={(e) => set("inscricao_estadual", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>URL do Logo (opcional)</Label><Input value={data.logo_url || ""} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." /></div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Endereço</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><Label>Endereço completo</Label><Textarea rows={2} value={data.endereco || ""} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, nº, bairro" /></div>
            <div><Label>Cidade</Label><Input value={data.cidade || ""} onChange={(e) => set("cidade", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>UF</Label><Input maxLength={2} value={data.uf || ""} onChange={(e) => set("uf", e.target.value.toUpperCase())} /></div>
              <div><Label>CEP</Label><Input value={data.cep || ""} onChange={(e) => set("cep", e.target.value)} /></div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Contato</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Telefone</Label><Input value={data.telefone || ""} onChange={(e) => set("telefone", e.target.value)} /></div>
            <div><Label>WhatsApp comercial</Label><Input value={data.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} /></div>
            <div><Label>E-mail institucional</Label><Input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
            <div><Label>Site</Label><Input value={data.site || ""} onChange={(e) => set("site", e.target.value)} /></div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Redes sociais</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>Instagram</Label><Input value={data.instagram || ""} onChange={(e) => set("instagram", e.target.value)} placeholder="@multplick" /></div>
            <div><Label>Facebook</Label><Input value={data.facebook || ""} onChange={(e) => set("facebook", e.target.value)} /></div>
            <div><Label>LinkedIn</Label><Input value={data.linkedin || ""} onChange={(e) => set("linkedin", e.target.value)} /></div>
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Responsável</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Nome do responsável</Label><Input value={data.responsavel_nome || ""} onChange={(e) => set("responsavel_nome", e.target.value)} /></div>
            <div><Label>Cargo</Label><Input value={data.responsavel_cargo || ""} onChange={(e) => set("responsavel_cargo", e.target.value)} /></div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar configurações
          </Button>
        </div>
      </Card>
    </div>
  );
}