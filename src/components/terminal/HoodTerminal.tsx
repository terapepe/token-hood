"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Download, Copy, Check, ExternalLink, Monitor, Tablet, Smartphone, Loader2, CornerDownLeft } from "lucide-react";
import type { Analysis } from "@/lib/ai";
import type { Dossier } from "@/lib/scan";
import { ACCESS_TTL_MS, accessMessage } from "@/lib/hood";

type Sig = { address: string; signature: string; ts: number };
type Line = { t: number; text: string; level: "in" | "ok" | "warn" | "err" | "sys" };
type Version = { id: number; html: string; label: string };
type Gate = { ok: boolean; balance: number | null; min: number; error?: string; aiReady?: boolean };

const PRESETS = [
  "Darker, premium, more whitespace",
  "Convert-focused: stronger hero + clear CTA",
  "Minimal Swiss style, bold typography",
  "Playful meme-coin vibe with neon accents",
];
const DEVICES = { desktop: { w: "100%", icon: Monitor }, tablet: { w: "820px", icon: Tablet }, mobile: { w: "390px", icon: Smartphone } } as const;

const now = () => Date.now();
const stamp = (t: number) => new Date(t).toISOString().slice(11, 19);

export function HoodTerminal({ minHold }: { minHold: number }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [sig, setSig] = useState<Sig | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [checking, setChecking] = useState(false);

  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [revise, setRevise] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ t: 0, level: "sys", text: "HOOD AI TERMINAL ready. Paste a URL, describe the redesign, press RUN." }]);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [code, setCode] = useState("");
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [tab, setTab] = useState<"preview" | "code" | "analysis">("analysis");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLOListElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  const log = (text: string, level: Line["level"] = "ok") => setLines((l) => [...l, { t: now(), text, level }]);
  const current = versions.find((v) => v.id === active) ?? null;

  // Restore a still-valid signature for this wallet.
  useEffect(() => {
    setGate(null);
    if (!address) return setSig(null);
    try {
      const s: Sig = JSON.parse(sessionStorage.getItem("hood-sig") ?? "null");
      if (s && s.address === address.toLowerCase() && now() - s.ts < ACCESS_TTL_MS - 60_000) {
        setSig(s);
        verify(s);
      } else setSig(null);
    } catch {
      setSig(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), [lines]);
  useEffect(() => {
    if (tab === "code" && running) codeRef.current?.scrollTo({ top: codeRef.current.scrollHeight });
  }, [code, tab, running]);

  async function verify(s: Sig) {
    setChecking(true);
    try {
      const r = await fetch("/api/terminal/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
      const j: Gate = await r.json();
      setGate(j);
      if (j.ok) log(`ACCESS GRANTED · holding ${Math.floor(j.balance ?? 0).toLocaleString()} $HOOD`);
      else log(`ACCESS DENIED · ${j.error}`, "err");
    } catch {
      log("Access check failed (network).", "err");
    } finally {
      setChecking(false);
    }
  }

  async function signIn() {
    if (!address) return;
    const ts = now();
    try {
      const signature = await signMessageAsync({ message: accessMessage(address, ts) });
      const s = { address: address.toLowerCase(), signature, ts };
      sessionStorage.setItem("hood-sig", JSON.stringify(s));
      setSig(s);
      await verify(s);
    } catch {
      log("Signature cancelled.", "warn");
    }
  }

  async function run(mode: "new" | "revise") {
    if (!sig || running) return;
    const payload: Sig & { url?: string; brief: string; previousHtml?: string } =
      mode === "new" ? { ...sig, url: url.trim(), brief: brief.trim() } : { ...sig, brief: revise.trim(), previousHtml: current?.html };
    if (mode === "new" && !payload.url) return log("Enter a website URL first.", "warn");
    if (mode === "revise" && !revise.trim()) return;
    setRunning(true);
    setCode("");
    if (mode === "new") {
      setDossier(null);
      setAnalysis(null);
      setTab("analysis");
    } else setTab("code");
    log(mode === "new" ? `hood scan ${payload.url}${payload.brief ? ` --brief "${payload.brief}"` : ""}` : `hood revise "${payload.brief}"`, "in");

    try {
      const res = await fetch("/api/terminal/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let gotCode = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const ev = JSON.parse(buf.slice(0, i));
          buf = buf.slice(i + 1);
          if (ev.type === "log") log(ev.text, ev.text.startsWith("WARN") ? "warn" : "ok");
          else if (ev.type === "dossier") setDossier(ev.data);
          else if (ev.type === "analysis") setAnalysis(ev.data);
          else if (ev.type === "code") {
            if (!gotCode) {
              gotCode = true;
              setTab("code");
            }
            setCode((c) => c + ev.delta);
          } else if (ev.type === "done") {
            const id = (versions.at(-1)?.id ?? 0) + 1;
            setVersions((v) => [...v, { id, html: ev.html, label: mode === "new" ? "initial build" : payload.brief!.slice(0, 40) }]);
            setActive(id);
            setTab("preview");
            setRevise("");
          } else if (ev.type === "error") throw new Error(ev.error);
        }
      }
    } catch (e) {
      log(`ERROR · ${e instanceof Error ? e.message : "run failed"}`, "err");
    } finally {
      setRunning(false);
    }
  }

  const fileName = useMemo(() => {
    const host = (() => {
      try {
        return new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
      } catch {
        return "site";
      }
    })();
    return `hood-${host.replace(/[^a-z0-9.-]/gi, "")}-v${active ?? 1}.html`;
  }, [url, active]);

  function download() {
    if (!current) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([current.html], { type: "text/html" }));
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function openTab() {
    if (!current) return;
    window.open(URL.createObjectURL(new Blob([current.html], { type: "text/html" })), "_blank", "noopener");
  }
  async function copy() {
    if (!current) return;
    await navigator.clipboard.writeText(current.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const unlocked = Boolean(sig && gate?.ok);
  const lockReason = !isConnected ? "Connect a wallet holding $HOOD." : !sig ? "Sign the access message (free, no transaction)." : checking ? "Checking balance…" : gate && !gate.ok ? gate.error : gate?.aiReady === false ? "AI engine offline (server key missing)." : null;

  return (
    <div className="panel overflow-hidden">
      {/* Access bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-curb bg-asphalt/60 px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${unlocked ? "pulse-dot bg-spray" : "bg-caution"}`} />
          <span className="tracking-[0.2em] text-smoke">ACCESS</span>
          <span className={unlocked ? "text-spray" : "text-caution"}>{unlocked ? `GRANTED · ${Math.floor(gate!.balance ?? 0).toLocaleString()} $HOOD` : `LOCKED · hold ≥ ${minHold.toLocaleString()} $HOOD`}</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && !unlocked && (
            <button onClick={signIn} disabled={checking} className="btn-primary px-4 py-2 text-xs">{checking ? <Loader2 size={14} className="animate-spin" /> : null}Verify holder</button>
          )}
          <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Left: command + log */}
        <div className="flex flex-col border-b border-curb lg:border-b-0 lg:border-r">
          <form className="space-y-3 border-b border-curb p-4" onSubmit={(e) => { e.preventDefault(); run("new"); }}>
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] text-smoke">TARGET URL</span>
              <div className="mt-1.5 flex items-center border border-curb bg-asphalt focus-within:border-spray">
                <span className="pl-3 text-spray">$</span>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" inputMode="url" autoComplete="url"
                  className="w-full bg-transparent px-2 py-2.5 text-sm text-chalk placeholder:text-chalk/30 focus:outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] text-smoke">REDESIGN BRIEF</span>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} maxLength={2000}
                placeholder="What should HOOD change? Style, sections to add, tone, colors…" className="input mt-1.5 resize-y text-sm" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button type="button" key={p} onClick={() => setBrief(p)} className="border border-curb px-2 py-1 text-[10px] text-smoke transition-colors hover:border-spray hover:text-spray">{p}</button>
              ))}
            </div>
            <button type="submit" disabled={!unlocked || running} className="btn-primary w-full py-3">
              {running ? <><Loader2 size={16} className="animate-spin" /> RUNNING</> : "> RUN HOOD"}
            </button>
            {lockReason && <p className="text-[11px] text-caution">{lockReason}</p>}
          </form>
          <ol ref={logRef} aria-live="polite" className="h-64 overflow-y-auto p-4 text-[11px] leading-6 lg:h-auto lg:min-h-[18rem] lg:flex-1">
            {lines.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-smoke">{l.t ? stamp(l.t) : "--:--:--"}</span>
                <span className={{ in: "text-chalk", ok: "text-spray", warn: "text-caution", err: "text-alert", sys: "text-smoke" }[l.level]}>{l.level === "in" ? "> " : ""}{l.text}</span>
              </li>
            ))}
            {running && <li className="cursor text-smoke" />}
          </ol>
        </div>

        {/* Right: output */}
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-curb px-3 py-2">
            <div className="flex border border-curb text-xs" role="tablist">
              {(["analysis", "code", "preview"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 uppercase tracking-wider transition-colors ${tab === t ? "bg-spray text-asphalt" : "text-smoke hover:text-spray"}`}>{t}</button>
              ))}
            </div>
            {tab === "preview" && (
              <div className="flex border border-curb">
                {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => {
                  const I = DEVICES[d].icon;
                  return <button key={d} aria-label={d} aria-pressed={device === d} onClick={() => setDevice(d)} className={`p-1.5 ${device === d ? "text-spray" : "text-smoke hover:text-chalk"}`}><I size={15} /></button>;
                })}
              </div>
            )}
            {versions.length > 0 && (
              <select value={active ?? ""} onChange={(e) => setActive(Number(e.target.value))} className="border border-curb bg-asphalt px-2 py-1.5 text-xs text-chalk" aria-label="Version">
                {versions.map((v) => <option key={v.id} value={v.id}>v{v.id} · {v.label}</option>)}
              </select>
            )}
          </div>

          <div className="relative min-h-[32rem] flex-1 bg-asphalt/40">
            {tab === "analysis" && <AnalysisView analysis={analysis} dossier={dossier} running={running} />}
            {tab === "code" && (
              <pre ref={codeRef} className="absolute inset-0 overflow-auto p-4 text-[11px] leading-5 text-chalk/85">
                {code || current?.html || <span className="text-smoke">Generated code streams here.</span>}
                {running && <span className="cursor" />}
              </pre>
            )}
            {tab === "preview" && (
              current ? (
                <div className="absolute inset-0 flex justify-center overflow-auto bg-forest/30 p-3">
                  <iframe title="Redesign preview" srcDoc={current.html} sandbox="allow-scripts" style={{ width: DEVICES[device].w }} className="h-full min-h-[30rem] max-w-full border border-curb bg-white" />
                </div>
              ) : <Empty text="Preview appears when the build is ready." />
            )}
          </div>

          {current && (
            <div className="space-y-3 border-t border-curb p-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={download} className="btn-primary px-4 py-2 text-xs"><Download size={14} /> Download .html</button>
                <button onClick={copy} className="btn px-4 py-2 text-xs">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy code"}</button>
                <button onClick={openTab} className="btn px-4 py-2 text-xs"><ExternalLink size={14} /> Open</button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); run("revise"); }} className="flex items-center border border-curb bg-asphalt focus-within:border-spray">
                <span className="pl-3 text-xs text-spray">revise $</span>
                <input value={revise} onChange={(e) => setRevise(e.target.value)} maxLength={2000} placeholder="e.g. make the hero full-screen, add a pricing section"
                  className="w-full bg-transparent px-2 py-2.5 text-xs text-chalk placeholder:text-chalk/30 focus:outline-none" />
                <button type="submit" disabled={running || !revise.trim()} aria-label="Send revision" className="px-3 text-spray disabled:opacity-40"><CornerDownLeft size={16} /></button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-smoke">{text}</div>;
}

function Score({ k, v }: { k: string; v: number }) {
  const c = v >= 75 ? "bg-spray" : v >= 50 ? "bg-caution" : "bg-alert";
  return (
    <div>
      <div className="flex justify-between text-[10px] tracking-[0.2em] text-smoke"><span>{k.toUpperCase()}</span><span className="text-chalk">{v}</span></div>
      <div className="mt-1 h-1.5 bg-forest"><div className={`h-full ${c} transition-[width] duration-700`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div>
    </div>
  );
}

function AnalysisView({ analysis: a, dossier: d, running }: { analysis: Analysis | null; dossier: Dossier | null; running: boolean }) {
  if (!a && !d) return <Empty text={running ? "Scanning target…" : "Run a scan to see HOOD's analysis of the site."} />;
  const sev = { high: "text-alert border-alert/40", medium: "text-caution border-caution/40", low: "text-smoke border-curb" };
  return (
    <div className="absolute inset-0 overflow-auto p-4 text-xs">
      {d && (
        <div className="mb-4 border border-curb p-3">
          <p className="text-[10px] tracking-[0.25em] text-smoke">TARGET</p>
          <p className="mt-1 truncate text-sm text-chalk">{d.title || d.finalUrl}</p>
          <p className="truncate text-smoke">{d.finalUrl} · {d.tech.join(", ") || "stack unknown"}</p>
          {d.colors.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">{d.colors.slice(0, 10).map((c) => <span key={c.value} title={c.value} className="h-5 w-5 border border-curb" style={{ background: c.value }} />)}</div>
          )}
        </div>
      )}
      {!a ? <p className="cursor text-smoke">Analyzing</p> : (
        <div className="space-y-5">
          <div>
            <p className="kicker">SUMMARY</p>
            <p className="mt-2 leading-relaxed text-chalk/90">{a.summary}</p>
            <p className="mt-2 text-smoke">Type: {a.siteType} · Audience: {a.audience}</p>
          </div>
          {a.scores && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.entries(a.scores).map(([k, v]) => <Score key={k} k={k} v={Number(v)} />)}
              <p className="text-[10px] text-smoke sm:col-span-2 xl:col-span-3">Scores are HOOD's AI assessment of the scanned page.</p>
            </div>
          )}
          {a.issues?.length > 0 && (
            <div>
              <p className="kicker">ISSUES</p>
              <ul className="mt-2 space-y-1.5">
                {a.issues.map((i, n) => (
                  <li key={n} className="flex gap-2"><span className={`h-fit shrink-0 border px-1.5 uppercase ${sev[i.severity] ?? sev.low}`}>{i.severity}</span><span><span className="text-chalk">{i.area}:</span> <span className="text-smoke">{i.detail}</span></span></li>
                ))}
              </ul>
            </div>
          )}
          {a.palette?.length > 0 && (
            <div>
              <p className="kicker">PALETTE · TYPE</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.palette.map((p) => <span key={p.hex + p.role} className="flex items-center gap-1.5 border border-curb px-2 py-1"><span className="h-3 w-3" style={{ background: p.hex }} />{p.hex} <span className="text-smoke">{p.role}</span></span>)}
              </div>
              {a.typography && <p className="mt-2 text-smoke">Headings: {a.typography.headings} · Body: {a.typography.body}</p>}
            </div>
          )}
          {a.redesignPlan?.length > 0 && (
            <div>
              <p className="kicker">REDESIGN PLAN</p>
              <ol className="mt-2 space-y-1">{a.redesignPlan.map((s, n) => <li key={n} className="flex gap-2"><span className="text-spray">{String(n + 1).padStart(2, "0")}</span><span className="text-chalk/90">{s}</span></li>)}</ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
