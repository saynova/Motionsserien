// Server-only: CSV (Excel) and PDF exports of one-day registrations.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type ExportRow = {
  team_name: string;
  player1_name: string;
  player2_name: string;
  email: string;
  phone: string;
  status: string;
  level?: string;
  category?: string;
  payment_status?: string;
  created_at: string;
};

export type ExportMeta = { name: string; eventDate: string; venue: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });

const STATUS: Record<string, string> = { approved: "Approved", pending: "Pending", rejected: "Rejected" };
const LEVEL = (v?: string) => (v === "advanced" ? "Advanced" : "Intermediate");
const CAT = (r: ExportRow) => (r.category === "women" ? "Women" : `Men - ${LEVEL(r.level)}`);
const PAY = (v?: string) => (v === "paid" ? "Paid" : "Unpaid");

export function buildCsv(rows: ExportRow[]): string {
  const head = ["#", "Registered (Stockholm)", "Team", "Player 1", "Player 2", "Email", "Phone", "Category", "Payment", "Status"];
...
    [String(i + 1), fmt(r.created_at), r.team_name, r.player1_name, r.player2_name, r.email, r.phone, CAT(r), PAY(r.payment_status), STATUS[r.status] ?? r.status]
      .map(esc)
      .join(";"),
  );
  // sep= line + BOM so Excel opens columns and å/ä/ö correctly
  return "\uFEFFsep=;\n" + [head.join(";"), ...lines].join("\n");
}

function safe(v: string) {
  return v.replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

export async function buildPdf(rows: ExportRow[], meta: ExportMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 841.89, H = 595.28, M = 36; // A4 landscape
  const brand = rgb(0.29, 0.32, 0.85), dark = rgb(0.14, 0.15, 0.2), grey = rgb(0.42, 0.44, 0.48), band = rgb(0.965, 0.968, 0.985);
  const cols = [
    { label: "#", w: 22 }, { label: "TEAM", w: 120 }, { label: "PLAYER 1", w: 105 }, { label: "PLAYER 2", w: 105 },
    { label: "EMAIL", w: 150 }, { label: "PHONE", w: 82 }, { label: "CATEGORY", w: 70 }, { label: "PAYMENT", w: 54 }, { label: "REGISTERED", w: 62 },
  ];
  const fit = (t: string, f: PDFFont, s: number, w: number) => {
    let v = safe(t);
    if (f.widthOfTextAtSize(v, s) <= w) return v;
    while (v.length && f.widthOfTextAtSize(v + "...", s) > w) v = v.slice(0, -1);
    return v + "...";
  };
  let page: PDFPage = doc.addPage([W, H]);
  let y = 0;
  const header = (first: boolean) => {
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: brand });
    page.drawText(fit(meta.name || "One-day tournament", bold, first ? 20 : 12, W - 2 * M), { x: M, y: H - 40, size: first ? 20 : 12, font: bold, color: dark });
    y = H - 40;
    if (first) {
      const sub = [meta.eventDate && `Date: ${meta.eventDate.replace("T", " ")}`, meta.venue && `Venue: ${meta.venue}`, `Generated: ${fmt(new Date().toISOString())}`].filter(Boolean).join("   ·   ");
      page.drawText(fit(sub, font, 10, W - 2 * M), { x: M, y: y - 18, size: 10, font, color: grey });
      y -= 30;
      const c = (s: string) => rows.filter((r) => r.status === s).length;
      const stats: [string, number][] = [["Total", rows.length], ["Approved", c("approved")], ["Pending", c("pending")], ["Rejected", c("rejected")]];
      let x = M;
      for (const [l, n] of stats) {
        page.drawRectangle({ x, y: y - 46, width: 120, height: 40, color: band, borderColor: rgb(0.85, 0.86, 0.9), borderWidth: 0.6 });
        page.drawText(String(n), { x: x + 10, y: y - 30, size: 16, font: bold, color: brand });
        page.drawText(l.toUpperCase(), { x: x + 10, y: y - 42, size: 7, font: bold, color: grey });
        x += 130;
      }
      y -= 62;
    } else y -= 16;
  };
  const ensure = (h: number) => {
    if (y - h < 40) { page = doc.addPage([W, H]); header(false); }
  };
  header(true);
  const sections: [string, string][] = [["approved", "Approved teams"], ["pending", "Pending review"], ["rejected", "Rejected"]];
  for (const [key, title] of sections) {
    const list = rows.filter((r) => r.status === key);
    if (!list.length) continue;
    ensure(60);
    page.drawRectangle({ x: M, y: y - 20, width: W - 2 * M, height: 20, color: dark });
    page.drawText(`${title.toUpperCase()}  (${list.length})`, { x: M + 8, y: y - 14, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 20;
    const drawHead = () => {
      let x = M + 6;
      page.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 16, color: band });
      for (const col of cols) { page.drawText(col.label, { x, y: y - 11, size: 7, font: bold, color: grey }); x += col.w; }
      y -= 16;
    };
    drawHead();
    list.forEach((r, i) => {
      if (y - 18 < 40) { page = doc.addPage([W, H]); header(false); drawHead(); }
      if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 18, color: rgb(0.985, 0.986, 0.995) });
      const vals = [String(i + 1), r.team_name, r.player1_name, r.player2_name, r.email, r.phone, CAT(r), PAY(r.payment_status), fmt(r.created_at)];
      let x = M + 6;
      vals.forEach((v, ci) => {
        const f = ci === 1 ? bold : font;
        page.drawText(fit(v, f, 8.5, cols[ci]!.w - 6), { x, y: y - 12, size: 8.5, font: f, color: dark });
        x += cols[ci]!.w;
      });
      page.drawLine({ start: { x: M, y: y - 18 }, end: { x: W - M, y: y - 18 }, thickness: 0.4, color: rgb(0.88, 0.89, 0.92) });
      y -= 18;
    });
    y -= 14;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Motionsserien · Confidential - contains contact details`, { x: M, y: 20, size: 7.5, font, color: grey });
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - M - 60, y: 20, size: 7.5, font, color: grey });
  });
  return doc.save();
}
