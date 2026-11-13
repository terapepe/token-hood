"use client";

import { useMemo, useState } from "react";
import type { Side } from "@/lib/hood-data";
import { NoSignal, Panel, SourceTag, useLive } from "./live";
import { PriceChart } from "./PriceChart";
import { ago, compact, hhmmss, int, pct, short, usd } from "./fmt";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/* ---------------- Data stream ticker (hero) ---------------- */

export function DataStream() {
  const { snap } = useLive();
  const m = snap.market.data, t = snap.token.data, c = snap.chain.data;
  const items: [string, string, boolean?][] = [
    ["HOOD/USD", usd(m?.priceUsd)],
    ["24H", pct(m?.change24h), (m?.change24h ?? 0) >= 0],
    ["MCAP", usd(m?.marketCap ?? m?.fdv, { compact: true })],
    ["LIQ", usd(m?.liquidityUsd, { compact: true })],
    ["VOL 24H", usd(m?.volume24h, { compact: true })],
    ["HOLDERS", int(t?.holders)],
    ["BLOCK", c?.latestBlock ? `#${int(c.latestBlock)}` : "—"],
    ["TX TODAY", compact(c?.txToday)],
  ];
  const row = items.map(([k, v, up]) => (
    <span key={k} className="flex shrink-0 items-center gap-2 px-6">
      <span className="text-smoke">{k}</span>
      <span className={up === undefined ? "text-chalk" : up ? "text-spray" : "text-alert"}>{v}</span>
      <span className="text-forest">///</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-curb bg-concrete/70 py-2.5 text-xs tabular-nums" aria-label="Live $HOOD data stream">
      <div className="ticker flex w-max">{row}{row}</div>
    </div>
  );
}

/* ---------------- 3. Token intelligence ---------------- */

export function TokenIntel() {
  const { snap, now } = useLive();
  const m = snap.market.data, t = snap.token.data;
  const buys = m?.buys24h ?? null, sells = m?.sells24h ?? null;
  const ratio = buys !== null && sells !== null && buys + sells > 0 ? (buys / (buys + sells)) * 100 : null;
  const tiles: [string, string, string?][] = [
    ["PRICE", usd(m?.priceUsd), pct(m?.change24h)],
    ["MARKET CAP", usd(m?.marketCap ?? null, { compact: true }), m?.marketCap == null && m?.fdv ? `FDV ${usd(m.fdv, { compact: true })}` : undefined],
    ["LIQUIDITY", usd(m?.liquidityUsd, { compact: true })],
    ["VOLUME 24H", usd(m?.volume24h, { compact: true })],
    ["HOLDERS", int(t?.holders)],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px border border-curb bg-curb sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([k, v, s]) => (
          <div key={k} className="group bg-concrete p-4 transition-colors hover:bg-forest/60">
            <p className="text-[10px] tracking-[0.25em] text-smoke">{k}</p>
            <p className="mt-2 truncate text-xl font-semibold tabular-nums text-chalk group-hover:text-spray sm:text-2xl">{v}</p>
            {s && <p className={`mt-1 text-xs tabular-nums ${s.startsWith("-") ? "text-alert" : s.startsWith("+") ? "text-spray" : "text-smoke"}`}>{s}{s.endsWith("%") ? " 24h" : ""}</p>}
          </div>
        ))}
        <div className="col-span-2 bg-concrete p-4 sm:col-span-1">
          <p className="text-[10px] tracking-[0.25em] text-smoke">BUYS / SELLS 24H</p>
          <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl"><span className="text-spray">{int(buys)}</span><span className="text-smoke"> / </span><span className="text-alert">{int(sells)}</span></p>
          {ratio !== null && <div className="mt-2 flex h-1.5"><div className="bg-spray" style={{ width: `${ratio}%` }} /><div className="flex-1 bg-alert/70" /></div>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-smoke">
        <SourceTag feed={snap.market} now={now} />
        {m?.pairUrl && <a href={m.pairUrl} {...ext} className="hover:text-spray">open pair{m.dex ? ` · ${m.dex}` : ""} ↗</a>}
      </div>
      <PriceChart now={now} />
    </div>
  );
}

/* ---------------- 4. Blockchain monitor ---------------- */

const SIDE_STYLE: Record<Side, string> = { buy: "text-spray border-spray/40", sell: "text-alert border-alert/40", transfer: "text-smoke border-curb" };

export function BlockMonitor() {
  const { snap, now } = useLive();
  const [filter, setFilter] = useState<"all" | Side>("all");
  const head = snap.chain.data?.latestBlock ?? null;
  const rows = useMemo(() => (snap.transfers.data ?? []).filter((x) => filter === "all" || x.side === filter), [snap.transfers.data, filter]);
  const hasPools = (snap.market.data?.pools.length ?? 0) > 0;

  return (
    <Panel title="TRANSACTION FEED · $HOOD TRANSFERS" right={<SourceTag feed={snap.transfers} now={now} />}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-curb px-4 py-2.5 text-xs">
        <div className="flex border border-curb" role="group" aria-label="Filter transactions">
          {(["all", "buy", "sell", "transfer"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`px-3 py-1 uppercase transition-colors ${filter === f ? "bg-spray text-asphalt" : "text-smoke hover:text-spray"}`}>{f}</button>
          ))}
        </div>
        {!hasPools && <span className="text-caution">pool address unknown — buy/sell tagging off, all rows shown as transfers</span>}
      </div>
      {!snap.transfers.ok ? <NoSignal what="Transfer feed" /> : rows.length === 0 ? (
        <p className="p-6 text-center text-xs text-smoke">No {filter === "all" ? "" : filter + " "}transfers in the latest window.</p>
      ) : (
        <div className="max-h-[30rem] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-xs tabular-nums">
            <thead className="sticky top-0 bg-concrete text-[10px] tracking-[0.2em] text-smoke">
              <tr className="border-b border-curb">
                {["TIME", "TYPE", "AMOUNT", "FROM", "TO", "STATUS", "TX"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-curb/70">
              {rows.map((x) => {
                const conf = head && x.block ? head - x.block : null;
                return (
                  <tr key={x.hash + x.from + x.to} className="row-in transition-colors hover:bg-forest/40">
                    <td className="px-4 py-2 text-smoke" title={x.timestamp}>{hhmmss(x.timestamp)} <span className="text-forest">·</span> {ago(x.timestamp, now)}</td>
                    <td className="px-4 py-2"><span className={`border px-1.5 py-0.5 uppercase ${SIDE_STYLE[x.side]}`}>{x.side}</span></td>
                    <td className="px-4 py-2 text-chalk">{compact(x.amount)}</td>
                    <td className="px-4 py-2"><a href={`${snap.explorer}/address/${x.from}`} {...ext} className="text-chalk/80 hover:text-spray">{short(x.from)}</a></td>
                    <td className="px-4 py-2"><a href={`${snap.explorer}/address/${x.to}`} {...ext} className="text-chalk/80 hover:text-spray">{short(x.to)}</a></td>
                    <td className="px-4 py-2 text-spray">✓ CONFIRMED{conf !== null && conf >= 0 && <span className="text-smoke"> · {int(conf)} conf</span>}</td>
                    <td className="px-4 py-2"><a href={`${snap.explorer}/tx/${x.hash}`} {...ext} className="text-smoke hover:text-spray">{short(x.hash, 5)} ↗</a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Hero readout (radar + live numbers) ---------------- */

export function HeroReadout({ symbol }: { symbol: string }) {
  const { snap, now } = useLive();
  const m = snap.market.data, t = snap.token.data;
  const up = (m?.change24h ?? 0) >= 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <svg viewBox="0 0 400 400" aria-hidden className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="rg"><stop offset="0" stopColor="#39FF75" stopOpacity=".18" /><stop offset="1" stopColor="#39FF75" stopOpacity="0" /></radialGradient>
          <linearGradient id="sw" x1="0" x2="1"><stop offset="0" stopColor="#39FF75" stopOpacity="0" /><stop offset="1" stopColor="#39FF75" stopOpacity=".35" /></linearGradient>
        </defs>
        <circle cx="200" cy="200" r="196" fill="url(#rg)" />
        {[60, 110, 160, 196].map((r) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#39FF75" strokeOpacity={r === 196 ? 0.5 : 0.14} />)}
        <line x1="4" x2="396" y1="200" y2="200" stroke="#39FF75" strokeOpacity=".12" />
        <line y1="4" y2="396" x1="200" x2="200" stroke="#39FF75" strokeOpacity=".12" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i * 5 * Math.PI) / 180, r1 = i % 6 ? 190 : 182;
          return <line key={i} x1={200 + Math.cos(a) * r1} y1={200 + Math.sin(a) * r1} x2={200 + Math.cos(a) * 196} y2={200 + Math.sin(a) * 196} stroke="#39FF75" strokeOpacity=".45" />;
        })}
        <g className="motion-safe:animate-[spin_6s_linear_infinite]" style={{ transformOrigin: "200px 200px" }}>
          <path d="M200,200 L396,200 A196,196 0 0,0 370,102 Z" fill="url(#sw)" />
        </g>
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hood.svg" alt={`$${symbol} logo`} width={160} height={160} className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_24px_rgba(57,255,117,.45)]" />
      <div className="absolute left-0 top-[6%] border border-curb bg-asphalt/85 px-3 py-2 text-[11px] backdrop-blur">
        <p className="tracking-[0.2em] text-smoke">PRICE</p>
        <p className="text-base tabular-nums text-chalk">{usd(m?.priceUsd)}</p>
        <p className={`tabular-nums ${up ? "text-spray" : "text-alert"}`}>{pct(m?.change24h)}</p>
      </div>
      <div className="absolute right-0 top-[20%] border border-curb bg-asphalt/85 px-3 py-2 text-[11px] backdrop-blur">
        <p className="tracking-[0.2em] text-smoke">HOLDERS</p>
        <p className="text-base tabular-nums text-chalk">{int(t?.holders)}</p>
      </div>
      <div className="absolute bottom-[6%] left-[4%] border border-curb bg-asphalt/85 px-3 py-2 text-[11px] backdrop-blur">
        <p className="tracking-[0.2em] text-smoke">LIQUIDITY</p>
        <p className="text-base tabular-nums text-chalk">{usd(m?.liquidityUsd, { compact: true })}</p>
      </div>
      <div className="absolute bottom-[14%] right-0 border border-curb bg-asphalt/85 px-3 py-2 text-[11px] backdrop-blur">
        <SourceTag feed={snap.market} now={now} />
      </div>
    </div>
  );
}
