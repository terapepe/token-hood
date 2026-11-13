"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Download, Copy, Check, ExternalLink, Monitor, Tablet, Smartphone, Loader2, CornerDownLeft, Square, Plus,
  Trash2, Maximize2, Minimize2, FileText, ChevronDown, ChevronUp, History, Columns2,
} from "lucide-react";
import type { Analysis } from "@/lib/ai";
import type { Dossier } from "@/lib/scan";
import { ACCESS_TTL_MS, accessMessage } from "@/lib/hood";

/* ---------------- types & storage ---------------- */

type Sig = { address: string; signature: string; ts: number };
type Line = { t: number; text: string; level: "in" | "ok" | "warn" | "err" | "sys" };
type Version = { id: number; html: string; label: string; at: number };
type Gate = { ok: boolean; balance: number | null; min: number; error?: string; aiReady?: boolean };
type Target = Pick<Dossier, "title" | "finalUrl" | "tech" | "colors" | "checks">;
type Project = { id: string; url: string; brief: string; createdAt: number; target: Target | null; analysis: Analysis | null; versions: Version[] };
type View = "analysis" | "code" | "preview" | "split";

const STORE = "hood-projects-v1";
const MAX_PROJECTS = 15;

function loadProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}
function saveProjects(list: Project[]) {
  let l = list.slice(0, MAX_PROJECTS);
  // Drop oldest projects until it fits browser storage.
  for (;;) {
    try {
      localStorage.setItem(STORE, JSON.stringify(l));
      return;
    } catch {
      if (l.length <= 1) return;
      l = l.slice(0, -1);
    }
  }
}

const PRESETS = [
  "Darker, premium, more whitespace",
  "Convert-focused: stronger hero + clear CTA",
  "Minimal Swiss style, bold typography",
  "Playful meme-coin vibe with neon accents",
  "Keep the brand colors, modernize layout",
];
const DEVICES = { desktop: { w: "100%", icon: Monitor }, tablet: { w: "820px", icon: Tablet }, mobile: { w: "390px", icon: Smartphone } } as const;

const now = () => Date.now();
const stamp = (t: number) => new Date(t).toISOString().slice(11, 19);
const hostOf = (u: string) => {
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return u || "site";
  }
};
const slimTarget = (d: Dossier): Target => ({ title: d.title, finalUrl: d.finalUrl, tech: d.tech, colors: d.colors, checks: d.checks });

/* ---------------- component ---------------- */

export function TerminalApp({ minHold }: { minHold: number }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [sig, setSig] = useState<Sig | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [checking, setChecking] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [pid, setPid] = useState<string | null>(null);
  const project = projects.find((p) => p.id === pid) ?? null;
  const [active, setActive] = useState<number | null>(null);
  const current = project?.versions.find((v) => v.id === active) ?? project?.versions.at(-1) ?? null;

  const [url, setUrl] = useState("");
  const [brief, setBrief] = useState("");
  const [revise, setRevise] = useState("");
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ t: 0, level: "sys", text: "HOOD AI TERMINAL ready. Paste a URL, describe the redesign, press RUN (Ctrl/⌘+Enter)." }]);
  const [code, setCode] = useState("");
  const [view, setView] = useState<View>("analysis");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [copied, setCopied] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [full, setFull] = useState(false);
  const [sideTab, setSideTab] = useState<"new" | "history">("new");

  const logRef = useRef<HTMLOListElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const log = useCallback((text: string, level: Line["level"] = "ok") => setLines((l) => [...l.slice(-300), { t: now(), text, level }]), []);

  useEffect(() => setProjects(loadProjects()), []);
  useEffect(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), [lines, consoleOpen]);
  useEffect(() => {
    if (running) codeRef.current?.scrollTo({ top: codeRef.current.scrollHeight });
  }, [code, running]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, []);

  const updateProject = useCallback((id: string, fn: (p: Project) => Project) => {
    setProjects((list) => {
      const next = list.map((p) => (p.id === id ? fn(p) : p));
      saveProjects(next);
      return next;
    });
  }, []);

  /* ----- access ----- */

  const verify = useCallback(async (s: Sig) => {
    setChecking(true);
    try {
      const r = await fetch("/api/terminal/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
      const j: Gate = await r.json();
      setGate(j);
      if (j.ok) log(`ACCESS GRANTED · holding ${Math.floor(j.balance ?? 0).toLocaleString()} $HOOD`);
      else log(`ACCESS DENIED · ${j.error}`, "err");
      if (j.aiReady === false) log("AI engine offline: server has no ANTHROPIC_API_KEY.", "warn");
    } catch {
      log("Access check failed (network).", "err");
    } finally {
      setChecking(false);
    }
  }, [log]);

  useEffect(() => {
    setGate(null);
    if (!address) return setSig(null);
    try {
      const s: Sig = JSON.parse(sessionStorage.getItem("hood-sig") ?? "null");
      if (s && s.address === address.toLowerCase() && now() - s.ts < ACCESS_TTL_MS - 60_000) {
        setSig(s);
        verify(s);
        return;
      }
    } catch {}
    setSig(null);
  }, [address, verify]);

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

  const unlocked = Boolean(sig && gate?.ok && gate.aiReady !== false);
  const lockReason = !isConnected
    ? `Connect a wallet holding ≥ ${minHold.toLocaleString()} $HOOD.`
    : !sig ? "Verify you hold $HOOD (free signature, no transaction)."
    : checking ? "Checking balance on Robinhood Chain…"
    : gate && !gate.ok ? gate.error
    : gate?.aiReady === false ? "AI engine offline (server key missing)." : null;

  /* ----- run pipeline ----- */

  async function run(mode: "new" | "revise") {
    if (!sig || running || !unlocked) return;
    if (mode === "new" && !url.trim()) return log("Enter a website URL first.", "warn");
    if (mode === "revise" && (!revise.trim() || !current || !project)) return;

    let id = project?.id ?? "";
    const label = mode === "new" ? "initial build" : revise.trim().slice(0, 48);
    if (mode === "new") {
      id = `p${now()}`;
      const p: Project = { id, url: url.trim(), brief: brief.trim(), createdAt: now(), target: null, analysis: null, versions: [] };
      setProjects((l) => {
        const next = [p, ...l];
        saveProjects(next);
        return next;
      });
      setPid(id);
      setActive(null);
      setView("analysis");
    } else setView("code");

    const payload: Sig & { url?: string; brief: string; previousHtml?: string } = mode === "new" ? { ...sig, url: url.trim(), brief: brief.trim() } : { ...sig, brief: revise.trim(), previousHtml: current!.html };
    log(mode === "new" ? `hood scan ${payload.url}${payload.brief ? ` --brief "${payload.brief}"` : ""}` : `hood revise v${current!.id} "${payload.brief}"`, "in");

    setRunning(true);
    setCode("");
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/terminal/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: ac.signal });
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
          else if (ev.type === "dossier") updateProject(id, (p) => ({ ...p, target: slimTarget(ev.data) }));
          else if (ev.type === "analysis") updateProject(id, (p) => ({ ...p, analysis: ev.data }));
          else if (ev.type === "code") {
            if (!gotCode) {
              gotCode = true;
              setView((v) => (v === "split" ? v : "code"));
            }
            setCode((c) => c + ev.delta);
          } else if (ev.type === "done") {
            updateProject(id, (p) => ({ ...p, versions: [...p.versions, { id: (p.versions.at(-1)?.id ?? 0) + 1, html: ev.html, label, at: now() }] }));
            setActive(null); // null = latest version
            setView((v) => (v === "split" ? v : "preview"));
            setRevise("");
          } else if (ev.type === "error") throw new Error(ev.error);
        }
      }
    } catch (e) {
      if (ac.signal.aborted) log("Run stopped by user.", "warn");
      else log(`ERROR · ${e instanceof Error ? e.message : "run failed"}`, "err");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  /* ----- outputs ----- */

  const fileName = useMemo(() => `hood-${hostOf(project?.url ?? "").replace(/[^a-z0-9.-]/gi, "")}-v${current?.id ?? 1}.html`, [project, current]);

  function saveBlob(content: string, name: string, type: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const download = () => current && saveBlob(current.html, fileName, "text/html");
  const openTab = () => current && window.open(URL.createObjectURL(new Blob([current.html], { type: "text/html" })), "_blank", "noopener");
  async function copy() {
    if (!current) return;
    await navigator.clipboard.writeText(current.html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function exportReport() {
    if (!project?.analysis) return;
    const a = project.analysis;
    const md = [
      `# HOOD analysis — ${project.target?.title || project.url}`,
      `URL: ${project.target?.finalUrl ?? project.url}  \nDate: ${new Date(project.createdAt).toISOString().slice(0, 10)}  \nBrief: ${project.brief || "—"}`,
      `## Summary\n${a.summary}\n\nType: ${a.siteType} · Audience: ${a.audience}`,
      `## Scores (AI assessment)\n${Object.entries(a.scores ?? {}).map(([k, v]) => `- ${k}: ${v}/100`).join("\n")}`,
      `## Strengths\n${(a.strengths ?? []).map((s) => `- ${s}`).join("\n")}`,
      `## Issues\n${(a.issues ?? []).map((i) => `- **${i.severity}** · ${i.area}: ${i.detail}`).join("\n")}`,
      `## Palette\n${(a.palette ?? []).map((p) => `- ${p.hex} — ${p.role}`).join("\n")}\n\nHeadings: ${a.typography?.headings} · Body: ${a.typography?.body}`,
      `## Redesign plan\n${(a.redesignPlan ?? []).map((s, n) => `${n + 1}. ${s}`).join("\n")}`,
    ].join("\n\n");
    saveBlob(md, `hood-report-${hostOf(project.url)}.md`, "text/markdown");
  }
  function openProject(p: Project) {
    setPid(p.id);
    setActive(p.versions.at(-1)?.id ?? null);
    setUrl(p.url);
    setBrief(p.brief);
    setCode("");
    setView(p.versions.length ? "preview" : "analysis");
    setSideTab("new");
  }
  function removeProject(id: string) {
    setProjects((l) => {
      const next = l.filter((p) => p.id !== id);
      saveProjects(next);
      return next;
    });
    if (pid === id) setPid(null);
  }
  function newProject() {
    setPid(null);
    setActive(null);
    setUrl("");
    setBrief("");
    setCode("");
    setView("analysis");
    setSideTab("new");
  }

  const shownCode = running ? code : current?.html ?? code;

  /* ----- render ----- */

  const preview = current ? (
    <div className="flex h-full justify-center overflow-auto bg-forest/30 p-3">
      <iframe title="Redesign preview" srcDoc={current.html} sandbox="allow-scripts allow-popups" style={{ width: DEVICES[device].w }} className="h-full max-w-full border border-curb bg-white" />
    </div>
  ) : <Empty text={running ? "Building… preview appears when the file is complete." : "Preview appears when a build is ready."} />;

  const codeView = (
    <pre ref={codeRef} className="h-full overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-chalk/85">
      {shownCode || <span className="text-smoke">Generated code streams here.</span>}
      {running && <span className="cursor" />}
    </pre>
  );

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col font-mono lg:h-[calc(100dvh-4rem)] lg:flex-row">
      {/* ===== Sidebar ===== */}
      <aside className="flex shrink-0 flex-col border-b border-curb bg-concrete/80 lg:w-[22rem] lg:border-b-0 lg:border-r">
        {/* Access */}
        <div className="space-y-3 border-b border-curb p-4">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${unlocked ? "pulse-dot bg-spray" : "bg-caution"}`} />
              <span className="tracking-[0.2em] text-smoke">ACCESS</span>
              <span className={unlocked ? "text-spray" : "text-caution"}>{unlocked ? "GRANTED" : "LOCKED"}</span>
            </span>
            <span className="text-smoke">min {minHold.toLocaleString()} $HOOD</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectButton chainStatus="none" showBalance={false} accountStatus="address" />
            {isConnected && !unlocked && (
              <button onClick={signIn} disabled={checking} className="btn-primary px-3 py-2 text-xs">{checking && <Loader2 size={14} className="animate-spin" />}Verify holder</button>
            )}
          </div>
          {unlocked && <p className="text-[11px] text-smoke">Balance <span className="text-spray">{Math.floor(gate!.balance ?? 0).toLocaleString()} $HOOD</span> · session 30 min</p>}
          {lockReason && <p className="text-[11px] text-caution">{lockReason}</p>}
        </div>

        {/* Side tabs */}
        <div className="flex border-b border-curb text-[11px]">
          {([["new", "New scan", Plus], ["history", `Projects (${projects.length})`, History]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => setSideTab(k)} aria-pressed={sideTab === k}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 uppercase tracking-wider ${sideTab === k ? "bg-forest text-spray" : "text-smoke hover:text-chalk"}`}><I size={13} />{l}</button>
          ))}
        </div>

        {sideTab === "new" ? (
          <form className="flex-1 space-y-3 overflow-y-auto p-4" onSubmit={(e) => { e.preventDefault(); run("new"); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run("new"); } }}>
            <label className="block">
              <span className="text-[10px] tracking-[0.25em] text-smoke">TARGET URL</span>
              <div className="mt-1.5 flex items-center border border-curb bg-asphalt focus-within:border-spray">
                <span className="pl-3 text-spray">$</span>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" inputMode="url" autoComplete="url"
                  className="w-full bg-transparent px-2 py-2.5 text-sm text-chalk placeholder:text-chalk/30 focus:outline-none" />
              </div>
            </label>
            <label className="block">
              <span className="flex justify-between text-[10px] tracking-[0.25em] text-smoke"><span>REDESIGN BRIEF</span><span>{brief.length}/2000</span></span>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} maxLength={2000}
                placeholder="Style, sections to add or remove, tone, colors, language…" className="input mt-1.5 resize-y text-sm" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button type="button" key={p} onClick={() => setBrief((b) => (b ? `${b}. ${p}` : p))} className="border border-curb px-2 py-1 text-[10px] text-smoke transition-colors hover:border-spray hover:text-spray">+ {p}</button>
              ))}
            </div>
            {running ? (
              <button type="button" onClick={stop} className="btn w-full border-alert py-3 text-alert hover:border-alert hover:text-alert"><Square size={14} /> Stop</button>
            ) : (
              <button type="submit" disabled={!unlocked} className="btn-primary w-full py-3">&gt; RUN HOOD</button>
            )}
            <p className="text-[10px] text-smoke">Ctrl/⌘ + Enter to run · public sites only · 1–3 min per build</p>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <button onClick={newProject} className="flex w-full items-center gap-2 border-b border-curb px-4 py-3 text-xs text-spray hover:bg-forest/50"><Plus size={14} /> New project</button>
            {projects.length === 0 && <p className="p-4 text-xs text-smoke">No projects yet. Builds are saved in this browser.</p>}
            <ul className="divide-y divide-curb">
              {projects.map((p) => (
                <li key={p.id} className={`group flex items-start gap-2 px-4 py-3 ${p.id === pid ? "bg-forest/60" : "hover:bg-forest/30"}`}>
                  <button onClick={() => openProject(p)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs text-chalk">{p.target?.title || hostOf(p.url)}</p>
                    <p className="truncate text-[10px] text-smoke">{hostOf(p.url)} · {p.versions.length} version{p.versions.length === 1 ? "" : "s"} · {new Date(p.createdAt).toLocaleDateString()}</p>
                    {p.target?.colors?.length ? <div className="mt-1.5 flex gap-0.5">{p.target.colors.slice(0, 6).map((c) => <span key={c.value} className="h-2.5 w-2.5" style={{ background: c.value }} />)}</div> : null}
                  </button>
                  <button onClick={() => removeProject(p.id)} aria-label="Delete project" className="p-1 text-smoke opacity-0 hover:text-alert group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* ===== Workspace ===== */}
      <section className={`flex min-w-0 flex-1 flex-col ${full ? "fixed inset-0 z-[65] bg-asphalt" : ""}`}>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-curb bg-asphalt/80 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-chalk">{project ? project.target?.title || hostOf(project.url) : "No project"}</p>
            <p className="truncate text-[10px] text-smoke">{project ? `${project.target?.finalUrl ?? project.url}${project.target?.tech?.length ? ` · ${project.target.tech.join(", ")}` : ""}` : "Run a scan to start"}</p>
          </div>
          <div className="flex border border-curb text-[11px]" role="tablist">
            {([["analysis", "Analysis"], ["code", "Code"], ["preview", "Preview"], ["split", "Split"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={`flex items-center gap-1 px-2.5 py-1.5 uppercase tracking-wider transition-colors ${view === k ? "bg-spray text-asphalt" : "text-smoke hover:text-spray"}`}>{k === "split" && <Columns2 size={12} />}{l}</button>
            ))}
          </div>
          {(view === "preview" || view === "split") && (
            <div className="flex border border-curb">
              {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => {
                const I = DEVICES[d].icon;
                return <button key={d} aria-label={d} aria-pressed={device === d} onClick={() => setDevice(d)} className={`p-1.5 ${device === d ? "text-spray" : "text-smoke hover:text-chalk"}`}><I size={15} /></button>;
              })}
            </div>
          )}
          {project && project.versions.length > 0 && (
            <select value={current?.id ?? ""} onChange={(e) => setActive(Number(e.target.value))} className="border border-curb bg-asphalt px-2 py-1.5 text-[11px] text-chalk" aria-label="Version">
              {project.versions.map((v) => <option key={v.id} value={v.id}>v{v.id} · {v.label}</option>)}
            </select>
          )}
          <button onClick={() => setFull((f) => !f)} aria-label={full ? "Exit full screen" : "Full screen"} className="border border-curb p-1.5 text-smoke hover:text-spray">{full ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        </div>

        {/* Content */}
        <div className="relative min-h-[28rem] flex-1 overflow-hidden bg-asphalt/40">
          {view === "analysis" && <AnalysisView project={project} running={running} />}
          {view === "code" && codeView}
          {view === "preview" && preview}
          {view === "split" && (
            <div className="grid h-full grid-rows-2 lg:grid-cols-2 lg:grid-rows-1">
              <div className="min-h-0 border-b border-curb lg:border-b-0 lg:border-r">{codeView}</div>
              <div className="min-h-0">{preview}</div>
            </div>
          )}
        </div>

        {/* Actions + revise */}
        {current && (
          <div className="flex flex-col gap-2 border-t border-curb p-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              <button onClick={download} className="btn-primary px-3 py-2 text-xs"><Download size={14} /> .html</button>
              <button onClick={copy} className="btn px-3 py-2 text-xs">{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}</button>
              <button onClick={openTab} className="btn px-3 py-2 text-xs"><ExternalLink size={14} /> Open</button>
              {project?.analysis && <button onClick={exportReport} className="btn px-3 py-2 text-xs"><FileText size={14} /> Report</button>}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); run("revise"); }} className="flex flex-1 items-center border border-curb bg-asphalt focus-within:border-spray">
              <span className="whitespace-nowrap pl-3 text-xs text-spray">revise v{current.id} $</span>
              <input value={revise} onChange={(e) => setRevise(e.target.value)} maxLength={2000} disabled={running} placeholder="e.g. full-screen hero, add pricing, switch to light theme"
                className="w-full min-w-0 bg-transparent px-2 py-2.5 text-xs text-chalk placeholder:text-chalk/30 focus:outline-none" />
              {running ? (
                <button type="button" onClick={stop} aria-label="Stop" className="px-3 text-alert"><Square size={15} /></button>
              ) : (
                <button type="submit" disabled={!revise.trim() || !unlocked} aria-label="Send revision" className="px-3 text-spray disabled:opacity-40"><CornerDownLeft size={16} /></button>
              )}
            </form>
          </div>
        )}

        {/* Console */}
        <div className="border-t border-curb bg-concrete/80">
          <button onClick={() => setConsoleOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] tracking-[0.25em] text-smoke hover:text-chalk">
            <span className="flex items-center gap-2">CONSOLE {running && <Loader2 size={11} className="animate-spin text-spray" />}</span>
            {consoleOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          {consoleOpen && (
            <ol ref={logRef} aria-live="polite" className="h-40 overflow-y-auto px-3 pb-2 text-[11px] leading-5">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 tabular-nums text-smoke">{l.t ? stamp(l.t) : "--:--:--"}</span>
                  <span className={{ in: "text-chalk", ok: "text-spray", warn: "text-caution", err: "text-alert", sys: "text-smoke" }[l.level]}>{l.level === "in" ? "> " : ""}{l.text}</span>
                </li>
              ))}
              {running && <li className="cursor text-smoke" />}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- analysis view ---------------- */

function Empty({ text }: { text: string }) {
  return <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-smoke">{text}</div>;
}

function Score({ k, v }: { k: string; v: number }) {
  const c = v >= 75 ? "bg-spray" : v >= 50 ? "bg-caution" : "bg-alert";
  return (
    <div className="border border-curb bg-concrete p-3">
      <div className="flex items-baseline justify-between"><span className="text-[10px] tracking-[0.2em] text-smoke">{k.toUpperCase()}</span><span className="text-xl tabular-nums text-chalk">{v}</span></div>
      <div className="mt-2 h-1.5 bg-forest"><div className={`h-full ${c} transition-[width] duration-700`} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} /></div>
    </div>
  );
}

function AnalysisView({ project: p, running }: { project: Project | null; running: boolean }) {
  if (!p) return <Empty text="Run a scan to see HOOD's analysis, or open a saved project." />;
  const t = p.target, a = p.analysis;
  if (!t && !a) return <Empty text={running ? "Scanning target…" : "No analysis for this project."} />;
  const sev = { high: "text-alert border-alert/40", medium: "text-caution border-caution/40", low: "text-smoke border-curb" };
  const checks = t?.checks;
  return (
    <div className="absolute inset-0 overflow-auto p-4 text-xs sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {t && (
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="kicker">TARGET</p>
              <p className="mt-2 text-lg text-chalk">{t.title || t.finalUrl}</p>
              <p className="text-smoke">{t.finalUrl}</p>
              {t.colors.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{t.colors.slice(0, 12).map((c) => <span key={c.value} title={`${c.value} ×${c.count}`} className="h-6 w-6 border border-curb" style={{ background: c.value }} />)}</div>}
            </div>
            {checks && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] md:min-w-64">
                {([["HTML", `${checks.htmlKB} KB`], ["HTTPS", checks.https ? "yes" : "no"], ["Viewport", checks.viewportMeta ? "yes" : "missing"], ["H1", checks.h1Count], ["Images", checks.images], ["No alt", checks.imagesMissingAlt], ["Meta desc", checks.hasMetaDescription ? "yes" : "missing"], ["OpenGraph", checks.hasOpenGraph ? "yes" : "missing"]] as [string, string | number | boolean][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-curb py-1"><dt className="text-smoke">{k}</dt><dd className={v === "missing" || v === "no" ? "text-caution" : "text-chalk"}>{String(v)}</dd></div>
                ))}
              </dl>
            )}
          </div>
        )}
        {!a ? <p className="cursor text-smoke">Analyzing</p> : (
          <>
            <div>
              <p className="kicker">SUMMARY</p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-chalk/90">{a.summary}</p>
              <p className="mt-2 text-smoke">Type: {a.siteType} · Audience: {a.audience}</p>
            </div>
            {a.scores && (
              <div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{Object.entries(a.scores).map(([k, v]) => <Score key={k} k={k} v={Number(v)} />)}</div>
                <p className="mt-2 text-[10px] text-smoke">Scores are HOOD&apos;s AI assessment of the scanned page.</p>
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-2">
              {a.issues?.length > 0 && (
                <div>
                  <p className="kicker">ISSUES</p>
                  <ul className="mt-3 space-y-2">
                    {a.issues.map((i, n) => (
                      <li key={n} className="flex gap-2"><span className={`h-fit shrink-0 border px-1.5 uppercase ${sev[i.severity] ?? sev.low}`}>{i.severity}</span><span><span className="text-chalk">{i.area}:</span> <span className="text-smoke">{i.detail}</span></span></li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-6">
                {a.strengths?.length > 0 && (
                  <div>
                    <p className="kicker">STRENGTHS</p>
                    <ul className="mt-3 space-y-1.5">{a.strengths.map((s, n) => <li key={n} className="flex gap-2"><span className="text-spray">+</span><span className="text-chalk/90">{s}</span></li>)}</ul>
                  </div>
                )}
                {a.palette?.length > 0 && (
                  <div>
                    <p className="kicker">PALETTE · TYPE</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {a.palette.map((c) => <span key={c.hex + c.role} className="flex items-center gap-1.5 border border-curb px-2 py-1"><span className="h-3 w-3" style={{ background: c.hex }} />{c.hex} <span className="text-smoke">{c.role}</span></span>)}
                    </div>
                    {a.typography && <p className="mt-2 text-smoke">Headings: {a.typography.headings} · Body: {a.typography.body}</p>}
                  </div>
                )}
              </div>
            </div>
            {a.redesignPlan?.length > 0 && (
              <div>
                <p className="kicker">REDESIGN PLAN</p>
                <ol className="mt-3 grid gap-2 md:grid-cols-2">{a.redesignPlan.map((s, n) => <li key={n} className="flex gap-3 border border-curb bg-concrete p-3"><span className="text-spray">{String(n + 1).padStart(2, "0")}</span><span className="text-chalk/90">{s}</span></li>)}</ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
