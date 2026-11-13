"use client";

import { HOOD_CONFIG } from "@/hood.config";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle, Feed, Timeframe } from "@/lib/hood-data";
import { SourceTag } from "./live";
import { compact, usd } from "./fmt";

type ChartFeed = Feed<{ candles: Candle[]; pool: string; network: string }>;
const TFS: Timeframe[] = ["15m", "1h", "4h", "1d"];
const H = 380;
const VOL_H = 60;
const PAD = { l: 8, r: 78, t: 16, b: 26 };

/** Interactive OHLCV chart (GeckoTerminal). Candles or line, crosshair readout, volume bars. */
export function PriceChart({ now, net }: { now: number; net: string }) {
  const [tf, setTf] = useState<Timeframe>("1h");
  const [mode, setMode] = useState<"candle" | "line">("candle");
  const [feed, setFeed] = useState<ChartFeed | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(900);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let stop = false;
    const load = () =>
      fetch(`/api/hood/chart?tf=${tf}&net=${net}`)
        .then((r) => r.json())
        .then((j: ChartFeed) => !stop && setFeed(j))
        .catch(() => !stop && setFeed({ ok: false, data: null, source: "geckoterminal", error: "unreachable", at: Date.now() }));
    setFeed(null);
    load();
    const id = setInterval(load, 60_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [tf, net]);

  const candles = feed?.data?.candles ?? [];
  const geo = useMemo(() => {
    if (!candles.length) return null;
    const lo = Math.min(...candles.map((c) => c[3]));
    const hi = Math.max(...candles.map((c) => c[2]));
    const span = hi - lo || hi || 1;
    const vmax = Math.max(...candles.map((c) => c[5])) || 1;
    const plotW = w - PAD.l - PAD.r;
    const priceH = H - PAD.t - PAD.b - VOL_H;
    const step = plotW / candles.length;
    const x = (i: number) => PAD.l + i * step + step / 2;
    const y = (p: number) => PAD.t + (1 - (p - (lo - span * 0.05)) / (span * 1.1)) * priceH;
    const ticks = Array.from({ length: 5 }, (_, i) => lo + (span * i) / 4);
    return { lo, hi, vmax, step, x, y, ticks, priceH };
  }, [candles, w]);

  const sel = hover !== null ? candles[hover] : candles[candles.length - 1];
  const first = candles[0];
  const change = sel && first ? ((sel[4] - first[1]) / first[1]) * 100 : null;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    const i = Math.floor((px - PAD.l) / geo.step);
    setHover(i >= 0 && i < candles.length ? i : null);
  }

  return (
    <div className="panel">
      <div className="panel-head flex-wrap">
        <span><span className="text-spray">▍</span>PRICE FEED · ${HOOD_CONFIG.project.ticker}/USD</span>
        <div className="flex items-center gap-3">
          {feed && <SourceTag feed={feed} now={now} />}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-4">
        <div>
          <p className="text-3xl font-semibold tabular-nums text-chalk glow-text sm:text-4xl">{sel ? usd(sel[4]) : "—"}</p>
          <p className="mt-1 text-xs tabular-nums text-smoke">
            {sel ? (
              <>
                {new Date(sel[0] * 1000).toISOString().replace("T", " ").slice(0, 16)} UTC · O {usd(sel[1])} H {usd(sel[2])} L {usd(sel[3])} · VOL {usd(sel[5], { compact: true })}
                {change !== null && <span className={change >= 0 ? "text-spray" : "text-alert"}> · {change >= 0 ? "+" : ""}{change.toFixed(2)}% range</span>}
              </>
            ) : "awaiting candles"}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="flex border border-curb" role="group" aria-label="Timeframe">
            {TFS.map((t) => (
              <button key={t} onClick={() => setTf(t)} aria-pressed={tf === t}
                className={`px-3 py-1.5 uppercase transition-colors ${tf === t ? "bg-spray text-asphalt" : "text-smoke hover:text-spray"}`}>{t}</button>
            ))}
          </div>
          <div className="flex border border-curb" role="group" aria-label="Chart type">
            {(["candle", "line"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                className={`px-3 py-1.5 uppercase transition-colors ${mode === m ? "bg-forest text-spray" : "text-smoke hover:text-spray"}`}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      <div ref={wrap} className="relative mt-2 w-full">
        {!feed && <div className="flex items-center justify-center text-xs text-smoke" style={{ height: H }}><span className="cursor">LOADING CANDLES</span></div>}
        {feed && !geo && (
          <div className="flex flex-col items-center justify-center gap-1 text-center text-xs text-smoke" style={{ height: H }}>
            <span className="text-caution">[ NO CHART FEED ]</span>
            <span>{feed.ok ? "No trades recorded in this window." : `GeckoTerminal has no OHLCV for $${HOOD_CONFIG.project.ticker} yet (${feed.error}).`}</span>
            <span>The chart stays empty instead of showing simulated prices.</span>
          </div>
        )}
        {geo && (
          <svg viewBox={`0 0 ${w} ${H}`} width={w} height={H} className="block w-full touch-none select-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`$${HOOD_CONFIG.project.ticker} price chart, ${tf} candles`}>
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#39FF75" stopOpacity=".28" />
                <stop offset="1" stopColor="#39FF75" stopOpacity="0" />
              </linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            {geo.ticks.map((p) => (
              <g key={p}>
                <line x1={PAD.l} x2={w - PAD.r} y1={geo.y(p)} y2={geo.y(p)} stroke="#14251B" strokeDasharray="2 4" />
                <text x={w - PAD.r + 8} y={geo.y(p) + 4} fill="#6E8F7A" fontSize="10" fontFamily="var(--font-jetbrains)">{usd(p)}</text>
              </g>
            ))}
            {/* volume */}
            {candles.map((c, i) => {
              const vh = (c[5] / geo.vmax) * (VOL_H - 8);
              return <rect key={`v${c[0]}`} x={geo.x(i) - geo.step * 0.35} width={Math.max(1, geo.step * 0.7)} y={H - PAD.b - vh} height={vh} fill={c[4] >= c[1] ? "#39FF75" : "#FF4D5E"} opacity=".22" />;
            })}
            {mode === "line" ? (
              <>
                <path d={`M${geo.x(0)},${geo.y(candles[0][4])} ${candles.map((c, i) => `L${geo.x(i)},${geo.y(c[4])}`).join(" ")} L${geo.x(candles.length - 1)},${PAD.t + geo.priceH} L${geo.x(0)},${PAD.t + geo.priceH}Z`} fill="url(#area)" />
                <path d={candles.map((c, i) => `${i ? "L" : "M"}${geo.x(i)},${geo.y(c[4])}`).join(" ")} fill="none" stroke="#39FF75" strokeWidth="1.6" filter="url(#glow)" />
              </>
            ) : (
              candles.map((c, i) => {
                const up = c[4] >= c[1];
                const col = up ? "#39FF75" : "#FF4D5E";
                const top = geo.y(Math.max(c[1], c[4]));
                const bh = Math.max(1, Math.abs(geo.y(c[1]) - geo.y(c[4])));
                return (
                  <g key={c[0]}>
                    <line x1={geo.x(i)} x2={geo.x(i)} y1={geo.y(c[2])} y2={geo.y(c[3])} stroke={col} strokeWidth="1" opacity=".8" />
                    <rect x={geo.x(i) - geo.step * 0.32} width={Math.max(1, geo.step * 0.64)} y={top} height={bh} fill={up ? col : "#050806"} stroke={col} strokeWidth="1" />
                  </g>
                );
              })
            )}
            {/* last price marker */}
            {(() => {
              const last = candles[candles.length - 1];
              const ly = geo.y(last[4]);
              return (
                <g>
                  <line x1={PAD.l} x2={w - PAD.r} y1={ly} y2={ly} stroke="#39FF75" strokeOpacity=".5" strokeDasharray="4 3" />
                  <rect x={w - PAD.r + 2} y={ly - 9} width={PAD.r - 4} height={18} fill="#39FF75" />
                  <text x={w - PAD.r + 6} y={ly + 4} fill="#050806" fontSize="10" fontWeight="700" fontFamily="var(--font-jetbrains)">{usd(last[4])}</text>
                </g>
              );
            })()}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#D9FBE4" strokeOpacity=".35" />
                <line x1={PAD.l} x2={w - PAD.r} y1={geo.y(candles[hover][4])} y2={geo.y(candles[hover][4])} stroke="#D9FBE4" strokeOpacity=".25" />
                <circle cx={geo.x(hover)} cy={geo.y(candles[hover][4])} r="3.5" fill="#39FF75" />
              </g>
            )}
            <text x={PAD.l} y={H - 8} fill="#6E8F7A" fontSize="10" fontFamily="var(--font-jetbrains)">{new Date(candles[0][0] * 1000).toISOString().slice(0, 10)}</text>
            <text x={w - PAD.r} y={H - 8} textAnchor="end" fill="#6E8F7A" fontSize="10" fontFamily="var(--font-jetbrains)">{new Date(candles[candles.length - 1][0] * 1000).toISOString().slice(0, 16).replace("T", " ")}</text>
            <text x={w - PAD.r} y={H - PAD.b - VOL_H + 12} textAnchor="end" fill="#6E8F7A" fontSize="9" fontFamily="var(--font-jetbrains)">VOL max {compact(geo.vmax)}</text>
          </svg>
        )}
      </div>
    </div>
  );
}
