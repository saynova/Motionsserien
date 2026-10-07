// Browser-side professional Excel (.xlsx) builder. exceljs is loaded lazily on click.
export type XlsxColumn = { header: string; width: number };

export async function downloadXlsx(opts: {
  fileName: string;
  sheetName: string;
  title: string;
  subtitle: string;
  columns: XlsxColumn[];
  rows: (string | number)[][];
  /** index of column holding Paid/Unpaid, for colouring */
  paymentCol?: number;
}) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Motionsserien";
  wb.created = new Date();
  const ws = wb.addWorksheet(opts.sheetName, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const n = opts.columns.length;
  ws.columns = opts.columns.map((c) => ({ width: c.width }));
  const font = "Arial";

  ws.mergeCells(1, 1, 1, n);
  const t = ws.getCell(1, 1);
  t.value = opts.title;
  t.font = { name: font, size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B3FD8" } };
  t.alignment = { vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, n);
  const s = ws.getCell(2, 1);
  s.value = opts.subtitle;
  s.font = { name: font, size: 10, italic: true, color: { argb: "FF555B66" } };
  s.alignment = { indent: 1 };

  const head = ws.getRow(4);
  opts.columns.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: font, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF23262F" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  head.height = 22;

  const thin = { style: "thin" as const, color: { argb: "FFDADDE3" } };
  opts.rows.forEach((r, ri) => {
    const row = ws.getRow(5 + ri);
    r.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : v;
      cell.font = { name: font, size: 10 };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
      cell.alignment = { vertical: "middle", wrapText: true };
      if (ri % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F7FB" } };
      if (ci === opts.paymentCol) {
        const paid = String(v).toLowerCase() === "paid";
        cell.font = { name: font, size: 10, bold: true, color: { argb: paid ? "FF15803D" : "FFB91C1C" } };
      }
    });
  });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + opts.rows.length, column: n } };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const stockholm = (iso: string) =>
  new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });

/** "2026-10-20T23:59" (Stockholm local) → readable */
export function formatDeadline(v: string | null | undefined) {
  if (!v) return "";
  const [d, t] = v.split("T");
  const parsed = new Date(`${d}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  // Explicit parts keep browser and server ICU punctuation identical for SSR.
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const date = `${weekdays[parsed.getUTCDay()]}, ${parsed.getUTCDate()} ${months[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
  return t ? `${date}, ${t}` : date;
}
