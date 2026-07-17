import tecnico from "@/assets/course-tecnico.jpg";
import graduacao from "@/assets/course-graduacao.jpg";
import pos from "@/assets/course-pos.jpg";
import prof from "@/assets/course-prof.jpg";
import eja from "@/assets/course-eja.jpg";
import hibrido from "@/assets/course-hibrido.jpg";
import nr from "@/assets/course-nr.jpg";

export type Course = {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  modalidade: string;
  duracao: string;
};

export const categories = [
  "Cursos Técnicos",
  "Graduações",
  "Pós-graduação",
  "Cursos Profissionalizantes",
  "EJA",
  "Cursos Híbridos",
  "Normas Regulamentadoras (NRs)",
] as const;

export const courses: Course[] = [
  { id: "tec-seguranca", title: "Técnico em Segurança do Trabalho", category: "Cursos Técnicos", image: tecnico, description: "Formação completa para atuar em prevenção de acidentes e gestão de riscos em ambientes industriais.", modalidade: "Presencial / Híbrido", duracao: "18 meses" },
  { id: "tec-mecatronica", title: "Técnico em Mecatrônica", category: "Cursos Técnicos", image: tecnico, description: "Integração entre mecânica, eletrônica e automação industrial para a indústria 4.0.", modalidade: "Presencial", duracao: "24 meses" },
  { id: "grad-engprod", title: "Engenharia de Produção", category: "Graduações", image: graduacao, description: "Forme-se em uma das engenharias mais valorizadas pelo mercado industrial.", modalidade: "EAD / Híbrido", duracao: "5 anos" },
  { id: "grad-adm", title: "Administração", category: "Graduações", image: graduacao, description: "Graduação com foco em gestão empresarial e liderança estratégica.", modalidade: "EAD", duracao: "4 anos" },
  { id: "pos-seg", title: "Pós em Engenharia de Segurança do Trabalho", category: "Pós-graduação", image: pos, description: "Especialização reconhecida para profissionais de SST.", modalidade: "Híbrido", duracao: "18 meses" },
  { id: "pos-mba", title: "MBA em Gestão Industrial", category: "Pós-graduação", image: pos, description: "Liderança, lean manufacturing e gestão de operações industriais.", modalidade: "EAD", duracao: "12 meses" },
  { id: "prof-eletricista", title: "Eletricista Industrial", category: "Cursos Profissionalizantes", image: prof, description: "Capacitação rápida e prática para o mercado industrial.", modalidade: "Presencial", duracao: "200h" },
  { id: "prof-solda", title: "Soldador Industrial", category: "Cursos Profissionalizantes", image: prof, description: "Técnicas de solda MIG, TIG e eletrodo revestido com certificação.", modalidade: "Presencial", duracao: "160h" },
  { id: "eja", title: "EJA — Ensino Fundamental e Médio", category: "EJA", image: eja, description: "Conclua seus estudos com flexibilidade e qualidade reconhecida pelo MEC.", modalidade: "Híbrido", duracao: "6 a 18 meses" },
  { id: "eja-90", title: "EJA — Conclusão em 90 dias", category: "EJA", image: eja, description: "Programa intensivo para conclusão do ensino fundamental ou médio em apenas 90 dias.", modalidade: "EAD", duracao: "90 dias" },
  { id: "hib-gestao", title: "Gestão de Pessoas — Híbrido", category: "Cursos Híbridos", image: hibrido, description: "Conteúdo online com encontros práticos presenciais.", modalidade: "Híbrido", duracao: "6 meses" },
  { id: "nr-10", title: "NR-10 — Segurança em Eletricidade (Básico + SEP)", category: "Normas Regulamentadoras (NRs)", image: nr, description: "Capacitação 100% EAD conforme conteúdo oficial MTE. Prova online e certificado. R$ 169,90.", modalidade: "EAD / In company", duracao: "80h (40h Básico + 40h SEP)" },
  { id: "nr-35", title: "NR-35 — Trabalho em Altura (Trabalhador + Supervisor)", category: "Normas Regulamentadoras (NRs)", image: nr, description: "Capacitação 100% EAD conforme conteúdo oficial MTE. Prova online e certificado. R$ 169,90.", modalidade: "EAD / In company", duracao: "16h (8h Trabalhador + 8h Supervisor)" },
  { id: "nr-33", title: "NR-33 — Espaço Confinado", category: "Normas Regulamentadoras (NRs)", image: nr, description: "Capacitação para trabalhadores e supervisores de entrada.", modalidade: "In company", duracao: "16h" },
];