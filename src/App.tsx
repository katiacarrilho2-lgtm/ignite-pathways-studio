import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Sobre from "./pages/Sobre.tsx";
import Cursos from "./pages/Cursos.tsx";
import CursoPorCompetencia from "./pages/CursoPorCompetencia.tsx";
import CursoRegular from "./pages/CursoRegular.tsx";
import Eja from "./pages/Eja.tsx";
import Empresas from "./pages/Empresas.tsx";
import InCompany from "./pages/InCompany.tsx";
import Blog from "./pages/Blog.tsx";
import Contato from "./pages/Contato.tsx";
import Licenciado from "./pages/Licenciado.tsx";
import SejaVendedor from "./pages/SejaVendedor.tsx";
import PagamentoRetorno from "./pages/PagamentoRetorno.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminCursos from "./pages/admin/AdminCursos.tsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.tsx";
import AdminCargos from "./pages/admin/AdminCargos.tsx";
import LeadsLayout from "./pages/admin/leads/LeadsLayout.tsx";
import LeadsRecebidos from "./pages/admin/leads/LeadsRecebidos.tsx";
import LeadsBanco from "./pages/admin/leads/LeadsBanco.tsx";
import LeadsImportar from "./pages/admin/leads/LeadsImportar.tsx";
import AdminImagens from "./pages/admin/AdminImagens.tsx";
import AdminAlunos from "./pages/admin/AdminAlunos.tsx";
import AdminAlunoEdit from "./pages/admin/AdminAlunoEdit.tsx";
import AdminTurmas from "./pages/admin/AdminTurmas.tsx";
import AdminCursoBuilder from "./pages/admin/AdminCursoBuilder.tsx";
import AdminCursoPreview from "./pages/admin/AdminCursoPreview.tsx";
import AdminCursoIA from "./pages/admin/AdminCursoIA.tsx";
import AdminAndamento from "./pages/admin/AdminAndamento.tsx";
import AdminCorporativo from "./pages/admin/AdminCorporativo.tsx";
import CorpCrm from "./pages/admin/corp/CorpCrm";
import AdminCorpPropostas from "./pages/admin/AdminCorpPropostas.tsx";
import AdminCorpPropostaEditor from "./pages/admin/AdminCorpPropostaEditor.tsx";
import AdminCorpControle from "./pages/admin/AdminCorpControle.tsx";
import AdminCorpContratos from "./pages/admin/AdminCorpContratos.tsx";
import AdminCorpContratoEditor from "./pages/admin/AdminCorpContratoEditor.tsx";
import AdminCompanySettings from "./pages/admin/AdminCompanySettings.tsx";
import AlunoLogin from "./pages/aluno/Login.tsx";
import AlunoDashboard from "./pages/aluno/Dashboard.tsx";
import AlunoPerfil from "./pages/aluno/Perfil.tsx";
import AlunoCertificados from "./pages/aluno/Certificados.tsx";
import AlunoCursoPlayer from "./pages/aluno/CursoPlayer.tsx";
import AlunoCertificado from "./pages/aluno/Certificado.tsx";
import AlunoMensagens from "./pages/aluno/Mensagens.tsx";
import AlunoSuporte from "./pages/aluno/Suporte.tsx";
import AdminMensagens from "./pages/admin/AdminMensagens.tsx";
import AdminSuporte from "./pages/admin/AdminSuporte.tsx";
import AdminFinanceiro from "./pages/admin/AdminFinanceiro.tsx";
import AdminRelatorioPagamentos from "./pages/admin/AdminRelatorioPagamentos.tsx";
import AdminAfiliados from "./pages/admin/AdminAfiliados.tsx";
import AdminPromo from "./pages/admin/AdminPromo.tsx";
import AdminCupons from "./pages/admin/AdminCupons.tsx";
import AdminMarketing from "./pages/admin/AdminMarketing.tsx";
import AdminPreMatriculas from "./pages/admin/AdminPreMatriculas.tsx";
import AdminCategorias from "./pages/admin/AdminCategorias.tsx";
import AdminParceiros from "./pages/admin/AdminParceiros.tsx";
import AdminTreinamentos from "./pages/admin/AdminTreinamentos.tsx";
import AdminCertificacao from "./pages/admin/AdminCertificacao.tsx";
import AdminDocumentosLinks from "./pages/admin/AdminDocumentosLinks.tsx";
import Checkout from "./pages/Checkout.tsx";
import Matricula from "./pages/Matricula.tsx";
import Prova from "./pages/Prova.tsx";
import DocumentosUpload from "./pages/DocumentosUpload.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import AlunoFinanceiro from "./pages/aluno/Financeiro.tsx";
import AlunoAfiliado from "./pages/aluno/Afiliado.tsx";
import AlunoTreinamentos from "./pages/aluno/Treinamentos.tsx";
import AlunoTreinamentoPlayer from "./pages/aluno/TreinamentoPlayer.tsx";
import AlunoDocumentos from "./pages/aluno/Documentos.tsx";
import CrmLayout from "./pages/admin/crm/CrmLayout.tsx";
import CrmKanban from "./pages/admin/crm/CrmKanban.tsx";
import CrmAgenda from "./pages/admin/crm/CrmAgenda.tsx";
import CrmRelatorios from "./pages/admin/crm/CrmRelatorios.tsx";
import CrmListagem from "./pages/admin/crm/CrmListagem.tsx";
import CrmEquipe from "./pages/admin/crm/CrmEquipe.tsx";
import CrmPreMatriculas from "./pages/admin/crm/CrmPreMatriculas.tsx";
import ConnectLayout from "./pages/admin/connect/ConnectLayout.tsx";
import ConnectDashboard from "./pages/admin/connect/ConnectDashboard.tsx";
import ConnectContacts from "./pages/admin/connect/ConnectContacts.tsx";
import ConnectKanban from "./pages/admin/connect/ConnectKanban.tsx";
import ConnectImport from "./pages/admin/connect/ConnectImport.tsx";
import ConnectCampaigns from "./pages/admin/connect/ConnectCampaigns.tsx";
import ConnectCampaignEditor from "./pages/admin/connect/ConnectCampaignEditor.tsx";
import ConnectHistorico from "./pages/admin/connect/ConnectHistorico.tsx";
import ConnectApiConfig from "./pages/admin/connect/ConnectApiConfig.tsx";
import { SiteLayout } from "./components/site/SiteLayout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AlunoLayout } from "./components/aluno/AlunoLayout";
import { AuthProvider } from "./hooks/useAuth";
import { useReferralCapture } from "./hooks/useReferralCapture";

const queryClient = new QueryClient();

const ReferralWatcher = () => { useReferralCapture(); return null; };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ReferralWatcher />
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/cursos" element={<Cursos />} />
              <Route path="/curso-por-competencia" element={<CursoPorCompetencia />} />
              <Route path="/curso-regular" element={<CursoRegular />} />
              <Route path="/eja" element={<Eja />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/in-company" element={<InCompany />} />
              <Route path="/licenciado" element={<Licenciado />} />
              <Route path="/seja-vendedor" element={<SejaVendedor />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/pagamento/sucesso" element={<PagamentoRetorno status="sucesso" />} />
              <Route path="/pagamento/falha" element={<PagamentoRetorno status="falha" />} />
              <Route path="/pagamento/pendente" element={<PagamentoRetorno status="pendente" />} />
              <Route path="/checkout/:slug" element={<Checkout />} />
              <Route path="/matricula/:slug" element={<Matricula />} />
            </Route>
            <Route path="/prova/:token" element={<Prova />} />
            <Route path="/documentos/:token" element={<DocumentosUpload />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/aluno/login" element={<AlunoLogin />} />
            <Route path="/aluno" element={<AlunoLayout />}>
              <Route index element={<AlunoDashboard />} />
              <Route path="curso/:enrollmentId" element={<AlunoCursoPlayer />} />
              <Route path="curso/:enrollmentId/certificado" element={<AlunoCertificado />} />
              <Route path="certificados" element={<AlunoCertificados />} />
              <Route path="mensagens" element={<AlunoMensagens />} />
              <Route path="suporte" element={<AlunoSuporte />} />
              <Route path="financeiro" element={<AlunoFinanceiro />} />
              <Route path="afiliado" element={<AlunoAfiliado />} />
              <Route path="treinamentos" element={<AlunoTreinamentos />} />
              <Route path="treinamentos/:slug" element={<AlunoTreinamentoPlayer />} />
              <Route path="perfil" element={<AlunoPerfil />} />
              <Route path="documentos" element={<AlunoDocumentos />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="cursos" element={<AdminCursos />} />
              <Route path="cursos/ia" element={<AdminCursoIA />} />
              <Route path="categorias" element={<AdminCategorias />} />
              <Route path="parceiros" element={<AdminParceiros />} />
              <Route path="treinamentos" element={<AdminTreinamentos />} />
              <Route path="certificacao" element={<AdminCertificacao />} />
              <Route path="certificacao/:userId" element={<AdminCertificacao />} />
              <Route path="documentos-links" element={<AdminDocumentosLinks />} />
              <Route path="cursos/:courseId/conteudo" element={<AdminCursoBuilder />} />
              <Route path="cursos/:courseId/preview" element={<AdminCursoPreview />} />
              <Route path="andamento" element={<AdminAndamento />} />
              <Route path="corporativo" element={<AdminCorporativo />} />
              <Route path="corporativo/crm" element={<CorpCrm />} />
              <Route path="corporativo/propostas" element={<AdminCorpPropostas />} />
              <Route path="corporativo/propostas/:id" element={<AdminCorpPropostaEditor />} />
             <Route path="corporativo/controle" element={<AdminCorpControle />} />
              <Route path="corporativo/contratos" element={<AdminCorpContratos />} />
              <Route path="corporativo/contratos/:id" element={<AdminCorpContratoEditor />} />
              <Route path="corporativo/configuracoes" element={<AdminCompanySettings />} />
              <Route path="imagens" element={<AdminImagens />} />
              <Route path="alunos" element={<AdminAlunos />} />
              <Route path="alunos/:userId" element={<AdminAlunoEdit />} />
              <Route path="turmas" element={<AdminTurmas />} />
              <Route path="usuarios" element={<AdminUsuarios />} />
              <Route path="cargos" element={<AdminCargos />} />
              <Route path="leads" element={<LeadsLayout />}>
                <Route index element={<LeadsRecebidos />} />
                <Route path="banco" element={<LeadsBanco />} />
                <Route path="importar" element={<LeadsImportar />} />
              </Route>
              <Route path="mensagens" element={<AdminMensagens />} />
              <Route path="suporte" element={<AdminSuporte />} />
              <Route path="financeiro" element={<AdminFinanceiro />} />
              <Route path="relatorios/pagamentos" element={<AdminRelatorioPagamentos />} />
              <Route path="afiliados" element={<AdminAfiliados />} />
              <Route path="meu-afiliado" element={<AlunoAfiliado />} />
              <Route path="promo" element={<AdminPromo />} />
              <Route path="cupons" element={<AdminCupons />} />
              <Route path="marketing" element={<AdminMarketing />} />
              <Route path="pre-matriculas" element={<AdminPreMatriculas />} />
              <Route path="crm" element={<CrmLayout />}>
                <Route index element={<CrmKanban />} />
                <Route path="banco-leads" element={<LeadsBanco />} />
                <Route path="agenda" element={<CrmAgenda />} />
                <Route path="relatorios" element={<CrmRelatorios />} />
                <Route path="listagem" element={<CrmListagem />} />
                <Route path="equipe" element={<CrmEquipe />} />
                <Route path="pre-matriculas" element={<CrmPreMatriculas />} />
              </Route>
              <Route path="connect" element={<ConnectLayout />}>
                <Route index element={<ConnectDashboard />} />
                <Route path="contatos" element={<ConnectContacts />} />
                <Route path="kanban" element={<ConnectKanban />} />
                <Route path="importar" element={<ConnectImport />} />
                <Route path="campanhas" element={<ConnectCampaigns />} />
                <Route path="campanhas/:id" element={<ConnectCampaignEditor />} />
                <Route path="historico" element={<ConnectHistorico />} />
                <Route path="configuracoes" element={<ConnectApiConfig />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
