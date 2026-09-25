// Allowlist HTML sanitizer for admin-written rich-text emails (edge-safe, no DOM).

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "span", "mark", "a",
  "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "div",
]);
const VOID = new Set(["br"]);
const ALLOWED_CSS = new Set([
  "color", "background-color", "font-size", "text-align", "font-weight",
  "font-style", "text-decoration",
]);

function escapeText(value: string) {
  return value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cleanStyle(raw: string) {
  return raw
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .map((decl) => {
      const idx = decl.indexOf(":");
      if (idx < 0) return null;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if (!ALLOWED_CSS.has(prop)) return null;
      if (!/^[#a-zA-Z0-9.,%()\s-]+$/.test(val) || /url|expression/i.test(val)) return null;
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join("; ");
}

function attr(attrs: string, name: string) {
  const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3] ?? "") : null;
}

export function sanitizeEmailHtml(input: string): string {
  const src = input.replace(/<(script|style|iframe|object)[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "");
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*)>/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out += escapeText(src.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[1] === "/";
    const tag = (m[2] ?? "").toLowerCase();
    const rawAttrs = m[3] ?? "";
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (closing) {
      if (!VOID.has(tag)) out += `</${tag}>`;
      continue;
    }
    let attrs = "";
    const style = attr(rawAttrs, "style");
    if (style) {
      const clean = cleanStyle(style);
      if (clean) attrs += ` style="${clean.replace(/"/g, "&quot;")}"`;
    }
    if (tag === "a") {
      const href = (attr(rawAttrs, "href") ?? "").trim();
      if (/^(https?:|mailto:)/i.test(href)) {
        attrs += ` href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer"`;
      }
    }
    out += `<${tag}${attrs}>`;
  }
  out += escapeText(src.slice(last));
  return out;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-3]|div|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const looksLikeHtml = (value: string) => /^\s*<[a-z]/i.test(value);
