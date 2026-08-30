# Substituir Universal → Faculdade LA nas páginas de cursos técnicos

**Estimativa: ~1–2 créditos** (edição de código/texto + recorte local da logo, sem geração de imagem por IA).

## Escopo

Apenas as páginas `/curso-regular` e `/curso-por-competencia`. Todo o resto do site Multplick (cores, menu global, outras páginas) permanece intocado. Nada de links externos nem menção a "parceria" — venda 100% B2C.

## 1. Logo da Faculdade LA (custo zero)

- Recortar a logo "LA EDUCAÇÃO" do print enviado via PIL (edição local, sem IA)
- Salvar como asset CDN em `src/assets/la-educacao-logo.png.asset.json`
- Usar no box da certificadora nas duas páginas

## 2. Substituição completa de conteúdo (CursoPorCompetencia.tsx e CursoRegular.tsx)

- Remover todas as menções a "Colégio Técnico Universal" / "Universal"
- **Box da certificadora**:
  - Título: "Faculdade LA (Grupo LA Educação)"
  - Descrição oficial: cursos cadastrados no SISTEC-MEC, Portaria MEC nº 1.074 de 25/10/2024 (DOU 29/10/2024), Portaria MEC nº 1.378 para EaD com nota máxima, validade nacional, registro profissional (CFT, CRT, COREN, CREA)
  - Botão: "Falar com Consultor no WhatsApp" (verde)
- **Headline principal**: "Valide sua experiência profissional e receba o diploma técnico com validade nacional — sem precisar cursar do zero o que você já domina."
- Manter os planos atuais: Técnico Regular R$ 99,99 (12x) e Tecnólogo R$ 119,90 (24x)

## 3. Grid de 4 cards de benefícios

Manter design e ícones, atualizar textos:
1. ⏱ **Emissão Ágil** — processo ágil após validação documental da experiência
2. 🏅 **Consulta no SISTEC/MEC** — diploma cadastrado no sistema oficial do governo federal
3. ⚖️ **LDB — Art. 41 (Lei 9.394/96)** — base legal da certificação por competência
4. 📈 **Aproveite sua Experiência** — valide anos trabalhados e conquiste registro profissional

## 4. Rodapé institucional (só nessas 2 páginas)

Texto em fonte pequena: "Todos os direitos reservados à Faculdade LA. CNPJ: 36.131.612/0001-60. Cursos técnicos e superiores emitidos em conformidade com as diretrizes do MEC e do SISTEC. Comercializado por revendedor autorizado do Grupo LA Educação."

## 5. Paleta de cores LA (escopo local)

- Azul-marinho escuro nos fundos/heros/cards principais dessas páginas
- Rosa/magenta da marca LA como cor de apoio (badges, destaques)
- CTAs de WhatsApp em verde chamativo
- Nada disso afeta o tema global da Multplick

## Detalhes técnicos

- Arquivos: `src/pages/CursoRegular.tsx`, `src/pages/CursoPorCompetencia.tsx` (reescrita de conteúdo), novo asset `la-educacao-logo.png.asset.json`
- Cores aplicadas via classes inline locais (hex), sem tocar em `index.css`
- Verificação: typecheck + captura de tela das duas páginas no preview
