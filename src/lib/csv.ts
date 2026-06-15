export type Card = { spanish: string; german: string };

function escapeField(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function cardsToCsv(cards: Card[]): string {
  const bom = "\uFEFF";
  return (
    bom +
    cards
      .map((c) => `${escapeField(c.spanish)};${escapeField(c.german)}`)
      .join("\n")
  );
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
