export const CONTRACT_TYPES = [
  { value: "prestacao_servicos", label: "Prestação de Serviços Educacionais" },
  { value: "in_company", label: "Treinamento In Company" },
  { value: "ead_corporativo", label: "EAD Corporativo / Pool de Cursos" },
  { value: "licenciamento", label: "Licenciamento Multplick" },
  { value: "revenda", label: "Revenda de Cursos" },
  { value: "afiliacao", label: "Programa de Afiliados" },
  { value: "representacao_pj", label: "Representação Comercial PJ" },
  { value: "vendedor_pj", label: "Vendedor PJ / Comissionamento" },
  { value: "parceria", label: "Parceria Estratégica" },
  { value: "nda", label: "NDA — Acordo de Confidencialidade" },
  { value: "memorando", label: "Memorando de Entendimento (MOU)" },
  { value: "consultoria", label: "Consultoria Educacional" },
  { value: "convenio_publico", label: "Convênio com Poder Público" },
  { value: "termo_adesao", label: "Termo de Adesão" },
  { value: "aditivo", label: "Termo Aditivo Contratual" },
] as const;

export type ContractType = typeof CONTRACT_TYPES[number]["value"];

export const contractTypeLabel = (v: string) =>
  CONTRACT_TYPES.find((p) => p.value === v)?.label ?? v;

export interface ContractClause {
  titulo: string;
  texto: string;
}

export interface ContractData {
  // Contratante (Cliente)
  contratante_razao?: string;
  contratante_cnpj?: string;
  contratante_endereco?: string;
  contratante_cidade?: string;
  contratante_uf?: string;
  contratante_representante?: string;
  contratante_cargo?: string;
  contratante_cpf?: string;
  contratante_email?: string;
  contratante_telefone?: string;
  // Contratada (Multplick)
  contratada_razao?: string;
  contratada_cnpj?: string;
  contratada_endereco?: string;
  contratada_cidade?: string;
  contratada_uf?: string;
  contratada_representante?: string;
  contratada_cargo?: string;
  // Objeto / comerciais
  objeto?: string;
  escopo?: string;
  valor_texto?: string;
  forma_pagamento?: string;
  multa_rescisoria?: string;
  comissao?: string;
  territorio?: string;
  exclusividade?: string;
  prazo_meses?: number;
  // Foro
  foro_cidade?: string;
  foro_uf?: string;
  observacoes?: string;
}

// Cláusulas padrão (minutas editáveis) por tipo
export const DEFAULT_CLAUSES: Record<string, ContractClause[]> = {
  prestacao_servicos: [
    { titulo: "DO OBJETO", texto: "O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de capacitação e treinamento profissional à CONTRATANTE, nas modalidades e nas condições descritas neste instrumento e em seus anexos." },
    { titulo: "DO ESCOPO", texto: "Os serviços compreendem a disponibilização de cursos, conteúdo didático, plataforma EAD, instrutores, certificação e suporte técnico, conforme escopo detalhado na proposta comercial aceita pela CONTRATANTE." },
    { titulo: "DO PRAZO E VIGÊNCIA", texto: "O presente contrato vigorará pelo prazo definido em sua qualificação, podendo ser prorrogado mediante termo aditivo assinado por ambas as partes." },
    { titulo: "DO VALOR E FORMA DE PAGAMENTO", texto: "Pelos serviços ora contratados, a CONTRATANTE pagará à CONTRATADA o valor descrito neste instrumento, conforme forma de pagamento ajustada." },
    { titulo: "DAS OBRIGAÇÕES DA CONTRATADA", texto: "São obrigações da CONTRATADA: (i) entregar o conteúdo contratado com qualidade técnica e pedagógica; (ii) disponibilizar plataforma e suporte conforme escopo; (iii) emitir certificados quando aplicável." },
    { titulo: "DAS OBRIGAÇÕES DA CONTRATANTE", texto: "São obrigações da CONTRATANTE: (i) efetuar o pagamento nas datas pactuadas; (ii) fornecer informações cadastrais corretas dos beneficiários; (iii) zelar pelo uso adequado da plataforma e materiais." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Todo o conteúdo didático, marca, identidade visual e materiais disponibilizados pela CONTRATADA permanecem de sua exclusiva propriedade, sendo vedada qualquer reprodução, distribuição ou comercialização sem autorização expressa por escrito." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "As partes se obrigam a tratar com sigilo as informações trocadas em razão deste contrato e a observar a Lei nº 13.709/2018 (LGPD), tratando dados pessoais apenas para as finalidades aqui pactuadas." },
    { titulo: "DA RESCISÃO", texto: "O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio por escrito de 30 (trinta) dias, ou imediatamente em caso de descumprimento de cláusula essencial, sem prejuízo da multa rescisória ajustada." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação para dirimir quaisquer questões oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja." },
  ],
  in_company: [
    { titulo: "DO OBJETO", texto: "Prestação de serviços de treinamento in company pela CONTRATADA, nas dependências indicadas pela CONTRATANTE ou em ambiente virtual, conforme cronograma anexo." },
    { titulo: "DO ESCOPO E CRONOGRAMA", texto: "O escopo, carga horária, número de turmas e cronograma são definidos no anexo técnico, parte integrante deste contrato." },
    { titulo: "DO LOCAL E INFRAESTRUTURA", texto: "A CONTRATANTE disponibilizará espaço físico, recursos audiovisuais e equipamentos necessários à realização dos treinamentos presenciais, salvo se ajustado de forma diversa." },
    { titulo: "DO VALOR E FORMA DE PAGAMENTO", texto: "Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor descrito neste instrumento, conforme forma de pagamento ajustada." },
    { titulo: "DA REMARCAÇÃO E CANCELAMENTO", texto: "Eventuais remarcações deverão ser solicitadas com no mínimo 5 (cinco) dias úteis de antecedência. Cancelamentos com prazo inferior ensejarão cobrança proporcional dos custos já incorridos." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Todo o material didático permanece de propriedade exclusiva da CONTRATADA, sendo cedida à CONTRATANTE apenas a licença de uso para fins de capacitação interna." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "As partes obrigam-se a manter sigilo sobre informações trocadas e a observar a LGPD no tratamento de dados pessoais dos participantes." },
    { titulo: "DA RESCISÃO", texto: "Aplicam-se as hipóteses de rescisão por descumprimento, por mútuo acordo ou mediante aviso prévio de 30 (trinta) dias, com pagamento proporcional dos serviços efetivamente prestados." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação para dirimir quaisquer questões oriundas deste contrato." },
  ],
  ead_corporativo: [
    { titulo: "DO OBJETO", texto: "Concessão pela CONTRATADA, à CONTRATANTE, de acesso ao pool de cursos EAD da Multplick para capacitação de colaboradores, mediante condições e quantitativos descritos neste instrumento." },
    { titulo: "DAS LICENÇAS DE ACESSO", texto: "A CONTRATANTE receberá o quantitativo de licenças de acesso definido neste contrato, intransferíveis e de uso pessoal por cada colaborador beneficiário." },
    { titulo: "DO VALOR E FORMA DE PAGAMENTO", texto: "Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor descrito neste instrumento, conforme forma de pagamento ajustada." },
    { titulo: "DA VIGÊNCIA E RENOVAÇÃO", texto: "O acesso vigorará pelo prazo definido na qualificação, podendo ser renovado mediante novo aceite comercial." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Todo o conteúdo, marca e plataforma são de propriedade exclusiva da CONTRATADA, vedada qualquer reprodução, cessão ou comercialização." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "As partes obrigam-se a tratar dados pessoais dos colaboradores em estrita observância à LGPD, limitados às finalidades educacionais." },
    { titulo: "DA RESCISÃO", texto: "O contrato poderá ser rescindido nas hipóteses previstas em lei, por mútuo acordo ou mediante aviso prévio de 30 (trinta) dias." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação para dirimir questões oriundas deste contrato." },
  ],
  licenciamento: [
    { titulo: "DO OBJETO", texto: "Concessão, pela CONTRATADA, ao LICENCIADO, do direito não exclusivo de utilizar a marca, metodologia, plataforma e portfólio de cursos Multplick, no território e condições definidos neste contrato." },
    { titulo: "DO TERRITÓRIO E EXCLUSIVIDADE", texto: "A licença abrange o território indicado na qualificação, podendo ser concedida em caráter de exclusividade conforme descrito neste instrumento." },
    { titulo: "DA TAXA DE LICENCIAMENTO E ROYALTIES", texto: "O LICENCIADO pagará à CONTRATADA a taxa inicial de licenciamento e os royalties periódicos descritos neste contrato e em seu anexo comercial." },
    { titulo: "DOS PADRÕES DE QUALIDADE", texto: "O LICENCIADO obriga-se a manter os padrões de identidade visual, qualidade pedagógica, atendimento e comunicação definidos pela CONTRATADA." },
    { titulo: "DA MARCA E IDENTIDADE VISUAL", texto: "O uso da marca Multplick é cedido exclusivamente para os fins deste contrato. Vedada qualquer alteração, sublicenciamento ou uso fora do escopo autorizado." },
    { titulo: "DO TREINAMENTO E SUPORTE", texto: "A CONTRATADA fornecerá ao LICENCIADO treinamento inicial, manual operacional e suporte continuado durante a vigência." },
    { titulo: "DA AUDITORIA", texto: "A CONTRATADA poderá realizar auditorias periódicas para verificar a aderência aos padrões e à apuração de royalties." },
    { titulo: "DA VIGÊNCIA E RENOVAÇÃO", texto: "O presente contrato vigorará pelo prazo definido, podendo ser renovado mediante termo aditivo, observado o desempenho e a aderência aos padrões." },
    { titulo: "DA RESCISÃO", texto: "Constituem causa de rescisão imediata: uso indevido da marca, inadimplência superior a 60 dias, descumprimento dos padrões ou violação das normas legais aplicáveis." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "O LICENCIADO obriga-se a manter sigilo sobre informações estratégicas e a observar a LGPD no tratamento de dados pessoais." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação para dirimir questões oriundas deste contrato." },
  ],
  revenda: [
    { titulo: "DO OBJETO", texto: "Autorização, pela CONTRATADA, ao REVENDEDOR, para comercializar cursos do portfólio Multplick, em caráter não exclusivo, mediante condições previstas neste instrumento." },
    { titulo: "DA COMISSÃO E REPASSE", texto: "O REVENDEDOR fará jus à comissão descrita neste contrato sobre as vendas efetivamente liquidadas, com repasses conforme periodicidade ajustada." },
    { titulo: "DAS CONDIÇÕES COMERCIAIS", texto: "Os preços, descontos máximos e condições de pagamento praticáveis serão definidos pela CONTRATADA, sendo vedada a oferta em desacordo com a tabela vigente." },
    { titulo: "DAS OBRIGAÇÕES DO REVENDEDOR", texto: "O REVENDEDOR obriga-se a divulgar os cursos com fidelidade, respeitar a marca e a comunicar à CONTRATADA quaisquer reclamações relevantes dos alunos." },
    { titulo: "DA VIGÊNCIA E RESCISÃO", texto: "Vigência conforme qualificação, podendo qualquer das partes rescindir mediante aviso prévio de 30 (trinta) dias, sem ônus." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Todo o conteúdo, marca e material promocional são de propriedade exclusiva da CONTRATADA, cedidos apenas para uso promocional autorizado." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "Aplicam-se ao REVENDEDOR os deveres de sigilo e proteção de dados pessoais nos termos da LGPD." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  afiliacao: [
    { titulo: "DO OBJETO", texto: "Adesão do AFILIADO ao Programa de Afiliados Multplick, para divulgação dos cursos mediante link rastreável, fazendo jus à comissão sobre vendas qualificadas." },
    { titulo: "DA COMISSÃO", texto: "O AFILIADO receberá a comissão descrita neste contrato sobre cada venda confirmada e paga, observado o período de carência para reembolsos." },
    { titulo: "DAS REGRAS DE DIVULGAÇÃO", texto: "É vedada a divulgação em SPAM, plataformas que violem direitos de terceiros, uso de marca em mídia paga sem autorização prévia ou práticas enganosas." },
    { titulo: "DA APURAÇÃO E PAGAMENTO", texto: "A apuração ocorrerá mensalmente, com pagamento até o 10º (décimo) dia útil do mês subsequente, mediante emissão de documento fiscal quando aplicável." },
    { titulo: "DA VIGÊNCIA E RESCISÃO", texto: "Contrato por prazo indeterminado, podendo qualquer parte rescindir a qualquer tempo mediante aviso prévio de 15 dias." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "O AFILIADO obriga-se a observar a LGPD em qualquer captação ou tratamento de dados pessoais de leads." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  representacao_pj: [
    { titulo: "DO OBJETO", texto: "Contratação do REPRESENTANTE, pessoa jurídica, para atuar na intermediação de negócios para a CONTRATADA, sem vínculo empregatício, nos termos da Lei nº 4.886/65." },
    { titulo: "DO TERRITÓRIO", texto: "A representação será exercida no território descrito neste contrato, podendo ou não ser concedida em caráter de exclusividade." },
    { titulo: "DA COMISSÃO", texto: "O REPRESENTANTE fará jus à comissão definida neste contrato sobre os negócios efetivamente concluídos e pagos." },
    { titulo: "DA PRESTAÇÃO DE CONTAS", texto: "A CONTRATADA prestará contas mensalmente das vendas e comissões devidas, mediante extrato detalhado." },
    { titulo: "DA INDEPENDÊNCIA", texto: "O presente contrato não cria vínculo empregatício, societário ou de subordinação entre as partes, sendo o REPRESENTANTE responsável por seus próprios tributos e encargos." },
    { titulo: "DA VIGÊNCIA E RESCISÃO", texto: "Vigência conforme qualificação. A rescisão imotivada deverá ser precedida de aviso prévio de 30 (trinta) dias." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "O REPRESENTANTE obriga-se a manter sigilo das informações comerciais e a observar a LGPD." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  vendedor_pj: [
    { titulo: "DO OBJETO", texto: "Contratação do VENDEDOR PJ para realizar vendas dos cursos e serviços da CONTRATADA, mediante remuneração variável por desempenho." },
    { titulo: "DA COMISSÃO E METAS", texto: "O VENDEDOR receberá a comissão descrita neste contrato, podendo ser acrescida de bônus pelo cumprimento de metas definidas em anexo." },
    { titulo: "DA INDEPENDÊNCIA", texto: "Não há vínculo empregatício, sendo o VENDEDOR responsável por seus tributos, encargos e estrutura operacional." },
    { titulo: "DAS OBRIGAÇÕES", texto: "O VENDEDOR obriga-se a observar a política comercial, tabela de preços e diretrizes éticas da CONTRATADA." },
    { titulo: "DA RESCISÃO", texto: "A rescisão poderá ocorrer mediante aviso prévio de 30 (trinta) dias ou imediatamente em caso de descumprimento contratual." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "Aplicam-se os deveres de sigilo e tratamento adequado de dados pessoais conforme LGPD." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  parceria: [
    { titulo: "DO OBJETO", texto: "Estabelecimento de parceria estratégica entre as PARTES para cooperação na oferta de soluções educacionais, conforme escopo descrito." },
    { titulo: "DAS RESPONSABILIDADES", texto: "Cada PARTE assumirá as responsabilidades, entregas e contrapartidas descritas neste contrato e em seus anexos." },
    { titulo: "DA REMUNERAÇÃO / DIVISÃO DE RECEITAS", texto: "A divisão de receitas ou contrapartidas financeiras será regida conforme percentuais e regras descritas neste instrumento." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Os direitos sobre marcas, conteúdos e materiais preexistentes permanecem com sua respectiva titular, sendo a coautoria sobre criações conjuntas regulada em anexo." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "As PARTES obrigam-se ao sigilo das informações trocadas e à observância da LGPD." },
    { titulo: "DA VIGÊNCIA E RESCISÃO", texto: "Vigência conforme qualificação, rescisão mediante aviso prévio de 60 (sessenta) dias ou por descumprimento contratual." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  nda: [
    { titulo: "DO OBJETO", texto: "O presente acordo tem por objeto regular o tratamento de informações confidenciais trocadas entre as PARTES no contexto de avaliação ou execução de oportunidade comercial." },
    { titulo: "DAS INFORMAÇÕES CONFIDENCIAIS", texto: "Considera-se confidencial toda informação técnica, comercial, financeira, estratégica, operacional ou pessoal divulgada por uma PARTE à outra, em qualquer suporte." },
    { titulo: "DAS OBRIGAÇÕES", texto: "A PARTE receptora obriga-se a (i) manter sigilo absoluto; (ii) utilizar a informação somente para a finalidade autorizada; (iii) restringir o acesso apenas a pessoas com necessidade de conhecer." },
    { titulo: "DAS EXCEÇÕES", texto: "Não se considera confidencial a informação já pública, recebida licitamente de terceiros sem dever de sigilo ou divulgada por ordem judicial." },
    { titulo: "DO PRAZO", texto: "O dever de confidencialidade vigorará pelo prazo definido neste instrumento e permanecerá em vigor por 5 (cinco) anos após o término da relação entre as PARTES." },
    { titulo: "DAS PENALIDADES", texto: "O descumprimento das obrigações de confidencialidade ensejará multa e indenização por perdas e danos, sem prejuízo das demais sanções legais." },
    { titulo: "DA LGPD", texto: "As PARTES observarão a Lei nº 13.709/2018 no tratamento de dados pessoais eventualmente compartilhados." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  memorando: [
    { titulo: "DO OBJETO", texto: "Registro do entendimento prévio entre as PARTES quanto à intenção de cooperar nas iniciativas descritas neste memorando, sem caráter vinculante quanto a obrigações financeiras definitivas." },
    { titulo: "DAS LINHAS DE COOPERAÇÃO", texto: "As PARTES manifestam interesse em desenvolver as iniciativas elencadas no escopo, podendo formalizar contratos específicos para cada frente." },
    { titulo: "DA NÃO EXCLUSIVIDADE", texto: "Este memorando não confere exclusividade, salvo se expressamente indicado em cláusula específica." },
    { titulo: "DA CONFIDENCIALIDADE", texto: "As informações trocadas entre as PARTES no contexto deste memorando serão tratadas com sigilo." },
    { titulo: "DA VIGÊNCIA", texto: "Vigência conforme qualificação, podendo ser substituído por contrato definitivo." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  consultoria: [
    { titulo: "DO OBJETO", texto: "Prestação de serviços de consultoria educacional pela CONTRATADA, abrangendo diagnóstico, planejamento e acompanhamento das ações descritas no escopo." },
    { titulo: "DOS ENTREGÁVEIS", texto: "A CONTRATADA entregará os produtos e documentos previstos no escopo, conforme cronograma anexo." },
    { titulo: "DO VALOR E FORMA DE PAGAMENTO", texto: "Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor descrito neste instrumento, conforme forma de pagamento ajustada." },
    { titulo: "DA PROPRIEDADE INTELECTUAL", texto: "Os entregáveis específicos para a CONTRATANTE poderão ser por ela utilizados em sua operação interna, ressalvada a metodologia subjacente, que permanece da CONTRATADA." },
    { titulo: "DA CONFIDENCIALIDADE E LGPD", texto: "As partes obrigam-se ao sigilo e à observância da LGPD." },
    { titulo: "DA VIGÊNCIA E RESCISÃO", texto: "Vigência conforme qualificação, com rescisão mediante aviso prévio de 30 (trinta) dias." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca indicada na qualificação." },
  ],
  convenio_publico: [
    { titulo: "DO OBJETO", texto: "Convênio entre o ente público CONVENENTE e a CONTRATADA visando à oferta de capacitação profissional aos beneficiários indicados, nos termos da legislação aplicável." },
    { titulo: "DAS OBRIGAÇÕES DAS PARTES", texto: "Cada PARTE assumirá as obrigações descritas no plano de trabalho, parte integrante deste instrumento." },
    { titulo: "DOS RECURSOS FINANCEIROS", texto: "Os recursos serão repassados conforme cronograma de desembolso constante do plano de trabalho, com prestação de contas nos termos da legislação." },
    { titulo: "DA FISCALIZAÇÃO", texto: "O CONVENENTE poderá fiscalizar a execução do objeto, sendo a CONTRATADA obrigada a fornecer informações e relatórios." },
    { titulo: "DA VIGÊNCIA", texto: "Vigência conforme qualificação, observados os limites legais." },
    { titulo: "DA RESCISÃO", texto: "Aplicam-se as hipóteses de rescisão previstas na Lei nº 14.133/2021 e demais normas pertinentes." },
    { titulo: "DO FORO", texto: "Fica eleito o foro da Comarca da sede do CONVENENTE." },
  ],
  termo_adesao: [
    { titulo: "DO OBJETO", texto: "Adesão do ADERENTE às condições gerais ofertadas pela CONTRATADA para acesso aos serviços educacionais descritos neste termo." },
    { titulo: "DAS CONDIÇÕES GERAIS", texto: "O ADERENTE declara conhecer e concordar com as condições gerais de uso, política de privacidade e regulamento aplicáveis." },
    { titulo: "DO VALOR", texto: "Pelo serviço, o ADERENTE pagará o valor descrito neste termo, conforme forma de pagamento escolhida." },
    { titulo: "DA VIGÊNCIA", texto: "Vigência conforme qualificação." },
    { titulo: "DA RESCISÃO E ARREPENDIMENTO", texto: "Aplica-se o direito de arrependimento de 7 (sete) dias para contratações à distância, nos termos do CDC." },
    { titulo: "DA LGPD", texto: "O tratamento de dados pessoais observará a Lei nº 13.709/2018." },
    { titulo: "DO FORO", texto: "Fica eleito o foro do domicílio do ADERENTE, quando consumidor." },
  ],
  aditivo: [
    { titulo: "DO OBJETO", texto: "O presente termo aditivo tem por objeto promover alterações no contrato originário celebrado entre as partes, conforme cláusulas a seguir." },
    { titulo: "DAS ALTERAÇÕES", texto: "Ficam alteradas as cláusulas descritas neste termo, prevalecendo, no mais, todas as demais disposições do contrato originário." },
    { titulo: "DA RATIFICAÇÃO", texto: "As partes ratificam todas as demais cláusulas do contrato originário não modificadas por este aditivo." },
    { titulo: "DA VIGÊNCIA", texto: "Este aditivo passa a vigorar a partir da data de sua assinatura." },
    { titulo: "DO FORO", texto: "Mantém-se o foro originalmente eleito no contrato principal." },
  ],
};

export const getDefaultClauses = (tipo: string): ContractClause[] =>
  (DEFAULT_CLAUSES[tipo] || DEFAULT_CLAUSES.prestacao_servicos).map((c) => ({ ...c }));