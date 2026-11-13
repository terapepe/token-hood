import { checkAccess, rateLimit } from "@/lib/access";
import { analyzeSite, extractHtml, generateSite, isAiConfigured } from "@/lib/ai";
import { scanWebsite } from "@/lib/scan";

export const maxDuration = 300;

type Body = { address?: string; signature?: string; ts?: number; kind?: "evm" | "solana"; url?: string; brief?: string; previousHtml?: string };

/**
 * HOOD pipeline, streamed as NDJSON events:
 *  {type:"log",text} · {type:"dossier",data} · {type:"analysis",data} · {type:"code",delta} · {type:"done",html} · {type:"error",error}
 * New run: url (+ brief). Revision: previousHtml + brief.
 */
export async function POST(req: Request) {
  const body: Body = await req.json().catch(() => ({}));
  const brief = String(body.brief ?? "").slice(0, 2000);
  const json = (status: number, error: string) => Response.json({ error }, { status });

  if (!isAiConfigured) return json(503, "AI engine offline: ANTHROPIC_API_KEY is not set on the server.");
  if (!body.url && !body.previousHtml) return json(400, "Enter a website URL.");
  if (body.previousHtml && !brief) return json(400, "Describe the change you want.");
  const access = await checkAccess(body);
  if (!access.ok) return json(access.status, access.error);
  if (!rateLimit(access.address.toLowerCase())) return json(429, "Rate limit reached for this wallet. Try again within the hour.");

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o: object) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const log = (text: string) => send({ type: "log", text });
      try {
        log(`ACCESS OK · ${access.address.slice(0, 6)}…${access.address.slice(-4)} · ${Math.floor(access.balance).toLocaleString()} HOOD`);
        let raw = "";
        if (body.previousHtml) {
          log("REVISION MODE · applying request to current build");
          for await (const d of generateSite({ brief, previousHtml: body.previousHtml })) {
            raw += d;
            send({ type: "code", delta: d });
          }
        } else {
          log(`SCAN ${body.url}`);
          const dossier = await scanWebsite(body.url!);
          log(`FETCHED ${dossier.finalUrl} · HTTP ${dossier.status} · ${dossier.checks.htmlKB}KB · ${dossier.headings.length} headings · ${dossier.colors.length} colors · ${dossier.tech.join(", ") || "stack unknown"}`);
          if (dossier.checks.likelyClientRendered) log("WARN · page renders mostly in JavaScript — visible content may be limited");
          send({ type: "dossier", data: dossier });
          log("ANALYZE · structure, palette, UX, SEO, accessibility");
          const analysis = await analyzeSite(dossier, brief);
          send({ type: "analysis", data: analysis });
          log(`ANALYSIS COMPLETE · ${analysis.issues?.length ?? 0} issues · plan ${analysis.redesignPlan?.length ?? 0} steps`);
          log("REDESIGN · writing single-file HTML");
          for await (const d of generateSite({ dossier, analysis, brief })) {
            raw += d;
            send({ type: "code", delta: d });
          }
        }
        const html = extractHtml(raw);
        if (!/<\/html>/i.test(html)) log("WARN · output may be truncated");
        log(`BUILD READY · ${Math.round(html.length / 1024)}KB`);
        send({ type: "done", html });
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "Pipeline failed." });
      } finally {
        ctrl.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
