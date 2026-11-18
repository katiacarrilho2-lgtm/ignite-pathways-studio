export const SECTION_REFRIGERACAO = "pagina_refrigeracao";

export type Plano = {
  titulo: string; subtitulo: string; publico: string; beneficios: string;
  preco_avista: string; preco_parcelado: string; link_pagamento: string; whatsapp_msg: string;
};
export type FotoItem = { url: string; legenda: string };
export type FaqItem = { q: string; a: string };

export type RefrigeracaoSettings = {
  titulo: string; subtitulo: string;
  video_youtube: string; video_arquivo: string;
  whatsapp: string;
  campanha_ativa: boolean; campanha_texto: string;
  competencia: Plano; regular: Plano;
  fotos: FotoItem[]; faqs: FaqItem[];
};

export const REFRIGERACAO_DEFAULTS: RefrigeracaoSettings = {
  titulo: "Técnico em Refrigeração e Climatização",
  subtitulo: "Diploma técnico com validade nacional, registro no CFT e habilitação para assinar PMOC.",
  video_youtube: "", video_arquivo: "",
  whatsapp: "5518996841902",
  campanha_ativa: false, campanha_texto: "Condição especial deste mês!",
  competencia: {
    titulo: "Técnico por Competência",
    subtitulo: "Já trabalha com refrigeração ou ar-condicionado?",
    publico: "Para quem já atua na área e quer o diploma oficial comprovando a experiência (Lei 9.394/96, Art. 41).",
    beneficios: "Diploma técnico registrado\nRegistro no CFT/CRT\nAssinar PMOC (Lei 13.589/2018)\nProcesso rápido e online",
    preco_avista: "", preco_parcelado: "", link_pagamento: "",
    whatsapp_msg: "Olá! Quero avaliar minha experiência para o Técnico em Refrigeração por Competência.",
  },
  regular: {
    titulo: "Técnico Regular",
    subtitulo: "Está começando ou quer aprender do zero?",
    publico: "Formação completa: fundamentos, instalação, manutenção, elétrica aplicada e PMOC.",
    beneficios: "Grade curricular completa\nAulas EAD no seu ritmo\nApostilas e certificado\nDiploma com validade nacional",
    preco_avista: "", preco_parcelado: "", link_pagamento: "",
    whatsapp_msg: "Olá! Quero começar o Técnico Regular em Refrigeração e Climatização.",
  },
  fotos: [],
  faqs: [
    { q: "O diploma tem validade nacional?", a: "Sim. O curso é registrado no SISTEC/MEC e tem validade em todo o Brasil." },
    { q: "Posso tirar registro no CFT?", a: "Sim. Com o diploma técnico você pode solicitar o registro no CFT/CRT." },
    { q: "Como faço o pagamento?", a: "Clique no botão de pagamento da modalidade escolhida. O pagamento é feito com segurança pela InfinitePay (Pix ou cartão)." },
  ],
};

export const mergeRefrigeracao = (raw: any): RefrigeracaoSettings => ({
  ...REFRIGERACAO_DEFAULTS, ...(raw ?? {}),
  competencia: { ...REFRIGERACAO_DEFAULTS.competencia, ...(raw?.competencia ?? {}) },
  regular: { ...REFRIGERACAO_DEFAULTS.regular, ...(raw?.regular ?? {}) },
  fotos: Array.isArray(raw?.fotos) ? raw.fotos : [],
  faqs: Array.isArray(raw?.faqs) ? raw.faqs : REFRIGERACAO_DEFAULTS.faqs,
});
