export function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const brlCsv = (cents?: number | null) => ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
export const dateCsv = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR") : "");