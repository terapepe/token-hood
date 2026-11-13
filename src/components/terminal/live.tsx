"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Feed, Snapshot, Transfer } from "@/lib/hood-data";
import { ago, compact, short } from "./fmt";

export type LogLine = { id: string; t: number; level: "ok" | "info" | "buy" | "sell" | "warn"; text: string };

type Live = { snap: Snapshot; log: LogLine[]; now: number; polling: boolean };
const Ctx = createContext<Live | null>(null);

const POLL_MS = 20_000;

/** Polls /api/hood and derives a system-activity log from real changes between snapshots. */
export function LiveProvider({ initial, children }: { initial: Snapshot; children: React.ReactNode }) {
  const [snap, setSnap] = useState(initial);
  const [log, setLog] = useState<LogLine[]>(() => bootLog(initial));
  const [now, setNow] = useState(() => initial.fetchedAt);
  const [polling, setPolling] = useState(false);
  const prev = useRef(initial);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let stop = false;
    async function poll() {
      if (document.hidden) return;
      setPolling(true);
      try {
        const t0 = performance.now();
        const next: Snapshot = await fetch("/api/hood", { cache: "no-store" }).then((r) => r.json());
        if (stop) return;
        const lines = diff(prev.current, next, Math.round(performance.now() - t0));
        prev.current = next;
        setSnap(next);
        if (lines.length) setLog((l) => [...lines, ...l].slice(0, 60));
      } catch {
        setLog((l) => [{ id: `e${Date.now()}`, t: Date.now(), level: "warn" as const, text: "SYNC FAILED · /api/hood unreachable, retrying" }, ...l].slice(0, 60));
      } finally {
        setPolling(false);
      }
    }
    const id = setInterval(poll, POLL_MS);
    const onVis = () => !document.hidden && poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      clearInterval(id);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <Ctx.Provider value={{ snap, log, now, polling }}>{children}</Ctx.Provider>;
}

export function useLive(): Live {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive outside LiveProvider");
  return v;
}

const feedLine = (name: string, f: Feed<unknown>, t: number): LogLine => ({
  id: `${name}${f.at}`,
  t,
  level: f.ok ? "ok" : "warn",
  text: f.ok ? `FEED ${name.toUpperCase()} · ${f.source} · OK` : `FEED ${name.toUpperCase()} · ${f.source} · NO SIGNAL (${f.error ?? "error"})`,
});

function txLine(x: Transfer, t: number): LogLine {
  const lvl = x.side === "buy" ? "buy" : x.side === "sell" ? "sell" : "info";
  const who = x.side === "buy" ? short(x.to) : short(x.from);
  return { id: `tx${x.hash}${x.from}${x.to}`, t, level: lvl, text: `${x.side.toUpperCase()} ${compact(x.amount)} HOOD · ${who}` };
}

function bootLog(s: Snapshot): LogLine[] {
  const t = s.fetchedAt;
  const lines: LogLine[] = [
    feedLine("market", s.market, t),
    feedLine("token", s.token, t),
    feedLine("chain", s.chain, t),
    feedLine("transfers", s.transfers, t),
  ];
  if (s.chain.data?.latestBlock) lines.unshift({ id: `b${s.chain.data.latestBlock}`, t, level: "info", text: `HEAD BLOCK #${s.chain.data.latestBlock.toLocaleString()}` });
  for (const x of (s.transfers.data ?? []).slice(0, 6).reverse()) lines.unshift({ ...txLine(x, Date.parse(x.timestamp) || t), text: `${txLine(x, t).text} · ${ago(x.timestamp, t)}` });
  return lines;
}

function diff(a: Snapshot, b: Snapshot, ms: number): LogLine[] {
  const t = Date.now();
  const out: LogLine[] = [];
  const seen = new Set((a.transfers.data ?? []).map((x) => x.hash + x.from + x.to));
  for (const x of (b.transfers.data ?? []).filter((x) => !seen.has(x.hash + x.from + x.to)).reverse()) out.unshift(txLine(x, t));
  const ha = a.chain.data?.latestBlock, hb = b.chain.data?.latestBlock;
  if (hb && hb !== ha) out.unshift({ id: `b${hb}`, t, level: "info", text: `HEAD BLOCK #${hb.toLocaleString()}${ha ? ` (+${hb - ha})` : ""}` });
  for (const k of ["market", "token", "chain", "transfers"] as const) {
    if (a[k].ok !== b[k].ok) out.unshift(feedLine(k, b[k], t));
  }
  out.push({ id: `s${t}`, t, level: "ok", text: `SYNC OK · ${ms}ms` });
  return out;
}

/** "● LIVE · source · 12s ago" or "○ NO SIGNAL" — every panel says where its numbers come from. */
export function SourceTag({ feed, now }: { feed: Feed<unknown>; now: number }) {
  return feed.ok ? (
    <span className="flex items-center gap-1.5 normal-case tracking-normal text-[11px]" title={`Live data from ${feed.source}`}>
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-spray" />
      <span className="text-spray">LIVE</span>
      <span className="text-smoke">· {feed.source} · {ago(feed.at, now)}</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5 normal-case tracking-normal text-[11px] text-caution" title={feed.error}>
      <span className="h-1.5 w-1.5 rounded-full border border-caution" /> NO SIGNAL · {feed.source}
    </span>
  );
}

export function Panel({ title, right, className = "", children, id }: { title: string; right?: React.ReactNode; className?: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className={`panel ${className}`}>
      <div className="panel-head">
        <span><span className="text-spray">▍</span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Shown in place of numbers when a source is down. */
export function NoSignal({ what }: { what: string }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-1 p-6 text-center text-xs text-smoke">
      <span className="text-caution">[ NO SIGNAL ]</span>
      <span>{what} unavailable — no data is shown rather than estimated.</span>
    </div>
  );
}
