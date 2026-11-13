import type { Dossier } from "./scan";

/** Claude API client (server only). Set ANTHROPIC_API_KEY; ANTHROPIC_MODEL is optional. */
const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
export const isAiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

export type Analysis = {
  summary: string;
  siteType: string;
  audience: string;
  structure: { section: string; purpose: string }[];
  palette: { hex: string; role: string }[];
  typography: { headings: string; body: string };
  strengths: string[];
  issues: { severity: "high" | "medium" | "low"; area: string; detail: string }[];
  scores: { design: number; ux: number; content: number; seo: number; accessibility: number };
  redesignPlan: string[];
};

const headers = () => ({
  "content-type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
  "anthropic-version": "2023-06-01",
});

const SAFETY = `Rules:
- Never build login, password, seed-phrase, private-key, wallet-connect or payment-card capture forms, and never present the page as the official site of a brand the user may not own. Contact/newsletter forms may post nowhere (action="#").
- Keep the analysed site's own text, structure and image URLs as content where useful, but write original code and an original visual design.
- No tracking scripts, no external JS. Google Fonts <link> is allowed.`;

function dossierText(d: Dossier): string {
  return JSON.stringify(d).slice(0, 60_000);
}

async function call(body: object): Promise<Response> {
  const res = await fetch(API, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(280_000) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI request failed (HTTP ${res.status}) ${t.slice(0, 200)}`);
  }
  return res;
}

/** Structured analysis of the scanned site. */
export async function analyzeSite(d: Dossier, brief: string): Promise<Analysis> {
  const res = await call({
    model: MODEL,
    max_tokens: 3000,
    system: `You are HOOD, a senior web designer and front-end auditor. Analyse a website from a scraped dossier and return ONLY a JSON object, no prose, with keys:
summary (2-3 sentences), siteType, audience, structure [{section, purpose}], palette [{hex, role}] (from dossier colors, max 6), typography {headings, body},
strengths [string] (max 5), issues [{severity: "high"|"medium"|"low", area, detail}] (max 8, concrete, based on the dossier),
scores {design, ux, content, seo, accessibility} (0-100 integers, your honest assessment),
redesignPlan [string] (5-8 concrete steps that apply the user's request).
Base every point on the dossier; if something cannot be known from it, say so instead of guessing.`,
    messages: [{ role: "user", content: `User request: ${brief || "(none — propose the best modern redesign)"}\n\nDossier:\n${dossierText(d)}` }],
  });
  const j = await res.json();
  const text: string = (j.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json) as Analysis;
}

/** Streams the generated single-file HTML as text deltas. */
export async function* generateSite(opts: { dossier?: Dossier; analysis?: Analysis; brief: string; previousHtml?: string }): AsyncGenerator<string> {
  const { dossier, analysis, brief, previousHtml } = opts;
  const system = `You are HOOD, an elite front-end engineer and designer. You output ONE complete, production-quality, self-contained HTML file (<!DOCTYPE html> … </html>) with all CSS in <style> and any JS in <script>.
Requirements: semantic HTML5, fully responsive (mobile → desktop), accessible (contrast, alt text, focus states, prefers-reduced-motion), SEO meta tags, fast (no frameworks), polished modern design with intentional typography, spacing and subtle motion.
Use the real content from the source site; never invent statistics, testimonials or prices — if a section needs content the source lacks, use clearly marked placeholders like [Your testimonial].
${SAFETY}
Output ONLY the HTML inside one \`\`\`html code block.`;

  const user = previousHtml
    ? `Revise this website according to the request. Return the full updated file.\n\nRequest: ${brief}\n\nCurrent file:\n\`\`\`html\n${previousHtml.slice(0, 120_000)}\n\`\`\``
    : `Redesign the analysed website.\n\nUser request: ${brief || "(none — modern, conversion-focused redesign)"}\n\nAnalysis:\n${JSON.stringify(analysis)}\n\nSource dossier:\n${dossier ? dossierText(dossier) : ""}`;

  const res = await call({ model: MODEL, max_tokens: 32000, stream: true, system, messages: [{ role: "user", content: user }] });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      let ev: { type?: string; delta?: { type?: string; text?: string }; error?: { message?: string } };
      try {
        ev = JSON.parse(line.slice(5));
      } catch {
        continue;
      }
      if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) yield ev.delta.text;
      if (ev.type === "error") throw new Error(`AI stream error: ${ev.error?.message ?? "unknown"}`);
    }
  }
}

/** Pulls the HTML document out of the model's reply. */
export function extractHtml(text: string): string {
  const fenced = text.match(/```html\s*([\s\S]*?)(```|$)/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/<!doctype html|<html/i);
  return start >= 0 ? body.slice(start) : body;
}
