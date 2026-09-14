/** Utilitários de CPF — máscara, validação de formato e dígitos verificadores. */

export const onlyDigits = (v: string) => (v ?? "").replace(/\D/g, "");

export const maskCpf = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
};

/** Esconde o CPF para exibição: ***.***.***-12 */
export const hideCpf = (v?: string | null) => {
  const d = onlyDigits(v ?? "");
  if (d.length !== 11) return "—";
  return `***.***.***-${d.slice(9)}`;
};

export const isValidCpf = (v: string) => {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
};
