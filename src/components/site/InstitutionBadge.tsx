export type Instituicao = "U" | "FL" | "M" | "U/FL";

export const INSTITUICAO_LABEL: Record<Instituicao, string> = {
  U: "Unicorp",
  FL: "Faculdade LA",
  M: "Multplick",
  "U/FL": "Unicorp e Faculdade LA",
};

export const InstitutionBadge = ({ value, size = "md" }: { value?: string | null; size?: "sm" | "md" }) => {
  const v = (value ?? "FL") as Instituicao;
  const dim = size === "sm" ? "h-6 min-w-6 text-[10px]" : "h-8 min-w-8 text-xs";
  const cls =
    v === "U" ? "bg-inst-unicorp" : v === "FL" ? "bg-inst-la" : v === "M" ? "bg-inst-multplick" : "bg-inst-ambas";
  return (
    <span
      title={INSTITUICAO_LABEL[v]}
      className={`${dim} ${cls} inline-flex items-center justify-center rounded-full px-2 font-extrabold text-primary-foreground shadow ring-2 ring-background`}
    >
      {v}
    </span>
  );
};
