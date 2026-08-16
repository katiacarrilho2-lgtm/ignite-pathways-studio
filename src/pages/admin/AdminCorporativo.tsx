import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ScrollText, Handshake, Library, Sparkles, ArrowRight, LineChart, Building2 } from "lucide-react";

const items = [
  { to: "/admin/corporativo/crm", title: "CRM Corporativo", desc: "Empresas prospectadas, reuniões, propostas, valor em negociação, contratos e faturamento B2B.", icon: LineChart, status: "Disponível" },
  { to: "/admin/corporativo/propostas", title: "Propostas Comerciais", desc: "Gere propostas profissionais para empresas, indústrias, prefeituras e parceiros.", icon: FileText, status: "Disponível" },
  { to: "/admin/corporativo/contratos", title: "Contratos e Termos", desc: "Minutas editáveis: prestação de serviços, licenciamento, NDA, revenda, PJ.", icon: ScrollText, status: "Disponível" },
  { to: "/admin/corporativo/controle", title: "Controle de Propostas", desc: "Histórico, métricas, taxa de fechamento e responsável por cada proposta.", icon: LineChart, status: "Disponível" },
  { to: "/admin/corporativo/configuracoes", title: "Configurações da Empresa", desc: "Dados institucionais da Multplick usados no cabeçalho, rodapé e assinatura.", icon: Building2, status: "Disponível" },
  { to: "/admin/corporativo/parceiros", title: "Licenciados e Parceiros", desc: "Cadastro, comissões, contratos ativos e desempenho comercial.", icon: Handshake, status: "Em breve" },
  { to: "/admin/corporativo/modelos", title: "Biblioteca de Modelos", desc: "Modelos prontos por segmento: hospitais, usinas, prefeituras, agro.", icon: Library, status: "Em breve" },
];

export default function AdminCorporativo() {
  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Sparkles className="size-3.5" /> Módulo Corporativo Multplick
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Propostas, Contratos e Parcerias</h1>
        <p className="text-muted-foreground max-w-2xl">Geração profissional de documentos comerciais para empresas, indústrias, hospitais, prefeituras, licenciados, afiliados e representantes PJ.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map((it) => (
          <Card key={it.to} className="hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <it.icon className="size-6" />
                </div>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${it.status === "Disponível" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{it.status}</span>
              </div>
              <CardTitle className="mt-3">{it.title}</CardTitle>
              <CardDescription>{it.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {it.status === "Disponível" ? (
                <Button asChild className="w-full"><Link to={it.to}>Abrir <ArrowRight className="size-4" /></Link></Button>
              ) : (
                <Button disabled variant="outline" className="w-full">Em desenvolvimento</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}