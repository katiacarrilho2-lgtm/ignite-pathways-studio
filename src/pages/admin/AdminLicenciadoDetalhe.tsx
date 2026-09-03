import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import useRedeStats from "@/hooks/useRedeStats";
import useCommercialAccounts from "@/hooks/useCommercialAccounts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, Inbox, ClipboardList, GraduationCap, Eye } from "lucide-react";
import { Unidade, tipoLabel, statusInfo, brl, dataBr } from "./AdminLicenciados";

export default function AdminLicenciadoDetalhe() {
  const { id = "" } = useParams();
  const { toast } = useToast();
  const { statsFor } = useRedeStats();
  const { canSwitchAccount, homeAccountId, setActiveAccountId } = useCommercialAccounts();
  const [u, setU] = useState<Unidade | null>(null);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [matriculas, setMatriculas] = useState<any[]>([]);
  const [atividade, setAtividade] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: unit }, { data: team }, { data: enr }, { data: apps }] = await Promise.all([
        supabase.from("contas_comerciais").select("*").eq("id", id).maybeSingle(),
        supabase.from("profiles").select("user_id,display_name,username,cargo,ativo").eq("account_id", id).order("username"),
        supabase.from("enrollments").select("id,status,enrolled_at,course_id").eq("account_id", id).order("enrolled_at", { ascending: false }).limit(20),
        supabase.from("enrollment_applications").select("id,full_name,course_title,status,created_at").eq("account_id", id).order("created_at", { ascending: false }).limit(20),
      ]);
      setU((unit ?? null) as any);
      setEquipe(team ?? []);
      setMatriculas(enr ?? []);
      setAtividade(apps ?? []);
    })();
  }, [id]);

  if (!u) return <div className="p-10 text-center text-muted-foreground">Carregando unidade…</div>;

  const s = statsFor(u.id);
  const st = statusInfo(u.status);
  const resumo = [
    { label: "Usuários", value: s.usuarios, icon: Users },
    { label: "Leads", value: s.leads, icon: Inbox },
    { label: "Pré-matrículas", value: s.preMatriculas, icon: ClipboardList },
    { label: "Matrículas", value: s.matriculas, icon: GraduationCap },
  ];

  const linha = (k: string, v?: string | null) => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v || "—"}</span>
    </div>
  );

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/admin/licenciados"><ArrowLeft className="size-4" /> Rede Multplick</Link></Button>
        {canSwitchAccount && u.id !== homeAccountId && (
          <Button variant="outline" onClick={async () => { await setActiveAccountId(u.id); toast({ title: `Visualizando ${u.nome}` }); }}>
            <Eye className="size-4" /> Visualizar como Polo
          </Button>
        )}
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{u.nome}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{tipoLabel(u.tipo_da_conta)}</span>
          <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${st.cls}`}>{st.label}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Responsável: {u.responsavel_nome ?? "—"} · Cidade: {u.cidade ? `${u.cidade}/${u.estado ?? ""}` : "—"} ·
          Desde: {dataBr(u.data_ativacao ?? u.criado_em)} · Última atividade: {dataBr(s.ultimaAtividade)}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {resumo.map((r) => (
          <Card key={r.label}><CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><r.icon className="size-3.5" /> {r.label}</div>
            <p className="text-2xl font-bold mt-1 tabular-nums">{r.value}</p>
          </CardContent></Card>
        ))}
      </section>

      <Tabs defaultValue="dados">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dados">Dados da unidade</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
          <TabsTrigger value="matriculas">Matrículas</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card><CardHeader><CardTitle className="text-base">Cadastro</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-x-8">
              <div>
                {linha("Nome fantasia", u.nome_fantasia)}
                {linha("CPF/CNPJ", u.documento_fiscal)}
                {linha("E-mail", u.email_contato)}
                {linha("WhatsApp", u.whatsapp ?? u.telefone_contato)}
                {linha("Endereço", u.endereco)}
                {linha("CEP", u.cep)}
              </div>
              <div>
                {linha("Nome público", u.nome_publico)}
                {linha("E-mail institucional", u.email_institucional)}
                {linha("Modelo de fachada", u.modelo_fachada)}
                {linha("Identidade", u.identidade_observacoes)}
                {linha("Observações", u.observacoes)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipe">
          <Card><CardHeader><CardTitle className="text-base">Equipe da unidade</CardTitle>
            <CardDescription>Usuários com perfil vinculado a esta conta.</CardDescription></CardHeader>
            <CardContent>
              {equipe.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border">
                    <th className="py-2">Login</th><th>Nome</th><th>Cargo</th><th>Situação</th></tr></thead>
                  <tbody>{equipe.map((p) => (
                    <tr key={p.user_id} className="border-b border-border/50">
                      <td className="py-2">{p.username ?? "—"}</td><td>{p.display_name ?? "—"}</td>
                      <td>{p.cargo ?? "—"}</td><td>{p.ativo === false ? "Inativo" : "Ativo"}</td>
                    </tr>))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atividade">
          <Card><CardHeader><CardTitle className="text-base">Pré-matrículas recentes</CardTitle></CardHeader>
            <CardContent>
              {atividade.length === 0 ? <p className="text-sm text-muted-foreground">Sem atividade registrada.</p> : (
                <ul className="space-y-2 text-sm">{atividade.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <span>{a.full_name} — {a.course_title}</span>
                    <span className="text-muted-foreground">{a.status} · {dataBr(a.created_at)}</span>
                  </li>))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matriculas">
          <Card><CardHeader><CardTitle className="text-base">Matrículas da unidade</CardTitle></CardHeader>
            <CardContent>
              {matriculas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma matrícula nesta unidade.</p> : (
                <ul className="space-y-2 text-sm">{matriculas.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                    <span>Matrícula {m.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground">{m.status} · {dataBr(m.enrolled_at)}</span>
                  </li>))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercial">
          <Card><CardHeader><CardTitle className="text-base">Comercial</CardTitle>
            <CardDescription>Financeiro da Rede, fechamentos e NF chegam na próxima etapa.</CardDescription></CardHeader>
            <CardContent className="max-w-md">
              {linha("Tipo da conta", tipoLabel(u.tipo_da_conta))}
              {linha("Taxa de implantação", brl(u.taxa_implantacao_cents))}
              {linha("Data de ativação", dataBr(u.data_ativacao))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
