// Server-only helpers that read visitor metadata from the current request.
import { getRequest } from "@tanstack/react-start/server";

export type VisitorMeta = {
  ip: string;
  userAgent: string;
  device: string;
  os: string;
  browser: string;
  country: string;
  city: string;
  referrer: string;
  isBot: boolean;
};

function parseUserAgent(ua: string): { device: string; os: string; browser: string; isBot: boolean } {
  const s = ua.toLowerCase();
  const isBot = /bot|crawler|spider|crawling|preview|monitor|headless|curl|wget|python-requests/.test(s);

  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s);
  const mobile = /iphone|ipod|android.*mobile|windows phone|blackberry|mobile/.test(s);
  const device = tablet ? "Tablet" : mobile ? "Phone" : "Computer";

  let os = "Unknown";
  if (s.includes("windows nt")) os = "Windows";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ipod")) os = "iOS";
  else if (s.includes("mac os x")) os = "macOS";
  else if (s.includes("cros")) os = "ChromeOS";
  else if (s.includes("linux")) os = "Linux";

  let browser = "Unknown";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("samsungbrowser")) browser = "Samsung Internet";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("chrome") || s.includes("crios")) browser = "Chrome";
  else if (s.includes("safari")) browser = "Safari";

  return { device, os, browser, isBot };
}

export function readVisitorMeta(): VisitorMeta {
  const request = getRequest();
  const headers = request.headers;
  const header = (name: string) => headers.get(name) ?? "";

  const forwarded = header("x-forwarded-for");
  const ip =
    (forwarded.split(",")[0] ?? "").trim() ||
    header("cf-connecting-ip") ||
    header("x-real-ip") ||
    "";

  const userAgent = header("user-agent").slice(0, 400);
  const { device, os, browser, isBot } = parseUserAgent(userAgent);

  return {
    ip,
    userAgent,
    device,
    os,
    browser,
    country: header("cf-ipcountry") || header("x-vercel-ip-country") || "",
    city: header("cf-ipcity") || header("x-vercel-ip-city") || "",
    referrer: header("referer").slice(0, 300),
    isBot: isBot || !userAgent,
  };
}

export function describeVisitor(): { ip: string; userAgent: string; device: string; location: string } {
  const meta = readVisitorMeta();
  const device = [meta.device, meta.os, meta.browser].filter(Boolean).join(" · ");
  const location = [meta.city, meta.country].filter(Boolean).join(", ");
  return { ip: meta.ip, userAgent: meta.userAgent, device, location };
}
