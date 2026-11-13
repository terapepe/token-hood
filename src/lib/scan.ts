import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

/**
 * Fetches a public website and extracts a compact "dossier" (structure, content, palette, fonts,
 * tech hints, quality checks) that the AI uses for analysis and redesign.
 * Private / internal addresses are refused (SSRF protection), redirects are re-checked each hop.
 */

const MAX_HTML = 2_000_000;
const MAX_CSS = 400_000;
const UA = "Mozilla/5.0 (compatible; HOOD-Terminal/1.0; +https://tokenhood.online)";

export type Dossier = {
  url: string;
  finalUrl: string;
  status: number;
  title: string;
  description: string;
  lang: string;
  ogImage: string | null;
  favicon: string | null;
  headings: { level: number; text: string }[];
  nav: { text: string; href: string }[];
  ctas: string[];
  sections: { tag: string; id: string; heading: string; text: string }[];
  images: { src: string; alt: string }[];
  forms: { fields: string[]; action: string }[];
  colors: { value: string; count: number }[];
  fonts: string[];
  tech: string[];
  checks: Record<string, string | number | boolean>;
  text: string;
};

function privateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http(s) URLs are supported.");
  if (u.username || u.password) throw new Error("URLs with credentials are not allowed.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("That address is not public.");
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map((r) => r.address);
  if (!ips.length || ips.some(privateIp)) throw new Error("That address is not public.");
}

async function safeFetch(raw: string, limit: number, accept = "text/html,*/*"): Promise<{ res: Response; body: string; url: string }> {
  let url = new URL(raw);
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url);
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept }, signal: AbortSignal.timeout(12_000), cache: "no-store" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    const reader = res.body?.getReader();
    let body = "";
    if (reader) {
      const dec = new TextDecoder();
      let size = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        body += dec.decode(value, { stream: true });
        if (size > limit) {
          await reader.cancel();
          break;
        }
      }
    }
    return { res, body, url: url.toString() };
  }
  throw new Error("Too many redirects.");
}

export function normalizeUrl(input: string): string {
  const s = input.trim();
  const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  if (!u.hostname.includes(".")) throw new Error("Enter a full domain, e.g. example.com");
  return u.toString();
}

const clean = (s: string, n = 200) => s.replace(/\s+/g, " ").trim().slice(0, n);
const COLOR_RE = /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\([^)]{5,40}\)|hsla?\([^)]{5,40}\)/gi;

export async function scanWebsite(input: string): Promise<Dossier> {
  const url = normalizeUrl(input);
  const { res, body: html, url: finalUrl } = await safeFetch(url, MAX_HTML);
  if (!res.ok) throw new Error(`Site answered HTTP ${res.status}.`);
  if (!/html/i.test(res.headers.get("content-type") ?? "html")) throw new Error("That URL is not an HTML page.");

  const $ = cheerio.load(html);
  const abs = (h?: string) => {
    try {
      return h ? new URL(h, finalUrl).toString() : "";
    } catch {
      return "";
    }
  };

  // Stylesheets (first 4) for palette + fonts
  const cssLinks = $('link[rel="stylesheet"]').map((_, el) => abs($(el).attr("href"))).get().filter(Boolean);
  const inlineCss = $("style").map((_, el) => $(el).text()).get().join("\n") + "\n" + $("[style]").map((_, el) => $(el).attr("style")).get().join(";");
  const external = await Promise.all(
    cssLinks.filter((h) => !/fonts\.googleapis/.test(h)).slice(0, 4).map((h) => safeFetch(h, MAX_CSS, "text/css,*/*").then((r) => (r.res.ok ? r.body : "")).catch(() => "")),
  );
  const css = inlineCss + "\n" + external.join("\n");

  const colorCount = new Map<string, number>();
  for (const m of css.match(COLOR_RE) ?? []) {
    let c = m.toLowerCase().replace(/\s+/g, "");
    if (/^#[0-9a-f]{3}$/.test(c)) c = "#" + [...c.slice(1)].map((x) => x + x).join("");
    colorCount.set(c, (colorCount.get(c) ?? 0) + 1);
  }
  const fonts = new Set<string>();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) fonts.add(clean(m[1].split(",")[0].replace(/["']/g, ""), 60));
  cssLinks.filter((h) => /fonts\.googleapis/.test(h)).forEach((h) => new URL(h).searchParams.getAll("family").forEach((f) => fonts.add(f.split(":")[0].replace(/\+/g, " "))));

  const tech = new Set<string>();
  const gen = $('meta[name="generator"]').attr("content");
  if (gen) tech.add(clean(gen, 60));
  const scripts = $("script[src]").map((_, el) => $(el).attr("src")).get().join(" ");
  if (/_next\//.test(scripts + html.slice(0, 50000))) tech.add("Next.js");
  if (/wp-content|wp-includes/.test(html)) tech.add("WordPress");
  if (/cdn\.shopify|Shopify\./.test(html)) tech.add("Shopify");
  if (/framer\.com|framerusercontent/.test(html)) tech.add("Framer");
  if (/webflow/.test(html)) tech.add("Webflow");
  if (/wix\.com|wixstatic/.test(html)) tech.add("Wix");
  if (/tailwind/.test(html)) tech.add("Tailwind CSS");
  if (/react/i.test(scripts)) tech.add("React");

  const imgs = $("img");
  const checks = {
    htmlKB: Math.round(html.length / 1024),
    viewportMeta: $('meta[name="viewport"]').length > 0,
    https: finalUrl.startsWith("https://"),
    h1Count: $("h1").length,
    images: imgs.length,
    imagesMissingAlt: imgs.filter((_, el) => !$(el).attr("alt")).length,
    scripts: $("script").length,
    stylesheets: cssLinks.length,
    hasOpenGraph: $('meta[property^="og:"]').length > 0,
    hasMetaDescription: Boolean($('meta[name="description"]').attr("content")),
    likelyClientRendered: $("body").text().replace(/\s+/g, "").length < 400,
  };

  const headings = $("h1,h2,h3").map((_, el) => ({ level: Number(el.tagName[1]), text: clean($(el).text(), 140) })).get().filter((h) => h.text).slice(0, 40);
  const nav = $("nav a, header a").map((_, el) => ({ text: clean($(el).text(), 40), href: abs($(el).attr("href")) })).get().filter((l) => l.text).slice(0, 30);
  const ctas = [...new Set($("button, a.btn, a.button, a[class*='btn'], a[class*='button'], [role=button]").map((_, el) => clean($(el).text(), 40)).get().filter(Boolean))].slice(0, 20);
  const forms = $("form").map((_, el) => ({
    action: abs($(el).attr("action")),
    fields: $(el).find("input,select,textarea").map((_, f) => $(f).attr("type") || f.tagName).get().slice(0, 12),
  })).get().slice(0, 5);
  const images = imgs.map((_, el) => ({ src: abs($(el).attr("src") || $(el).attr("data-src")), alt: clean($(el).attr("alt") ?? "", 100) })).get().filter((i) => i.src && !i.src.startsWith("data:")).slice(0, 24);

  $("script,style,noscript,svg,iframe,template").remove();
  const sections = $("header, nav, main > section, body > section, section, footer").map((_, el) => ({
    tag: el.tagName,
    id: $(el).attr("id") ?? "",
    heading: clean($(el).find("h1,h2,h3").first().text(), 120),
    text: clean($(el).text(), 400),
  })).get().filter((s) => s.text).slice(0, 24);

  return {
    url,
    finalUrl,
    status: res.status,
    title: clean($("title").first().text(), 160),
    description: clean($('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "", 300),
    lang: $("html").attr("lang") ?? "",
    ogImage: abs($('meta[property="og:image"]').attr("content")) || null,
    favicon: abs($('link[rel~="icon"]').attr("href")) || null,
    headings,
    nav,
    ctas,
    sections,
    images,
    forms,
    colors: [...colorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([value, count]) => ({ value, count })),
    fonts: [...fonts].filter((f) => f && !/inherit|initial|var\(/.test(f)).slice(0, 8),
    tech: [...tech],
    checks,
    text: clean($("body").text(), 9000),
  };
}
