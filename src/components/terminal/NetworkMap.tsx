"use client";

import { useMemo, useState } from "react";
import { NoSignal, Panel, SourceTag, useLive } from "./live";
import { compact, int, short } from "./fmt";

const W = 800, H = 520, CX = W / 2, CY = H / 2;
const MAX_NODES = 30;

type Node = { id: string; x: number; y: number; r: number; kind: "pool" | "wallet"; vol: number; buys: number; sells: number };

/**
 * Who moved $HOOD recently: every node is a real address from the latest transfers,
 * every line a real transfer. Pools sit at the core; packets flow along the edges.
 */
export function NetworkMap() {
  const { snap, now } = useLive();
  const [hover, setHover] = useState<Node | null>(null);
  const transfers = snap.transfers.data ?? [];
  const pools = useMemo(() => new Set((snap.market.data?.pools ?? []).map((p) => p.toLowerCase())), [snap.market.data]);

  const { nodes, edges, wallets } = useMemo(() => {
    const vol = new Map<string, { vol: number; buys: number; sells: number }>();
    const bump = (a: string, amt: number, side: string) => {
      const v = vol.get(a) ?? { vol: 0, buys: 0, sells: 0 };
      v.vol += amt;
      if (side === "buy") v.buys++;
      if (side === "sell") v.sells++;
      vol.set(a, v);
    };
    for (const t of transfers) {
      bump(t.from, t.amount, t.side);
      bump(t.to, t.amount, t.side);
    }
    const poolIds = [...vol.keys()].filter((a) => pools.has(a));
    const walletIds = [...vol.keys()].filter((a) => !pools.has(a) && !/^0x0{40}$/.test(a)).sort((a, b) => vol.get(b)!.vol - vol.get(a)!.vol).slice(0, MAX_NODES);
    const maxVol = Math.max(1, ...walletIds.map((a) => vol.get(a)!.vol));
    const inner = Math.min(10, walletIds.length);
    const nodes = new Map<string, Node>();
    poolIds.forEach((id, i) => {
      const a = (i / Math.max(1, poolIds.length)) * Math.PI * 2;
      const rr = poolIds.length > 1 ? 34 : 0;
      nodes.set(id, { id, x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr, r: 16, kind: "pool", ...vol.get(id)! });
    });
    walletIds.forEach((id, i) => {
      const ring = i < inner ? 0 : 1;
      const k = ring ? i - inner : i;
      const n = ring ? walletIds.length - inner : inner;
      const a = (k / n) * Math.PI * 2 + (ring ? 0.3 : -Math.PI / 2);
      const R = ring ? 225 : 135;
      const v = vol.get(id)!;
      nodes.set(id, { id, x: CX + Math.cos(a) * R * 1.45, y: CY + Math.sin(a) * R * 0.92, r: 4 + 7 * Math.sqrt(v.vol / maxVol), kind: "wallet", ...v });
    });
    const edges = transfers
      .map((t, i) => ({ i, a: nodes.get(t.from), b: nodes.get(t.to), side: t.side, key: t.hash + t.from + t.to }))
      .filter((e): e is { i: number; a: Node; b: Node; side: typeof e.side; key: string } => Boolean(e.a && e.b));
    return { nodes: [...nodes.values()], edges, wallets: walletIds.length };
  }, [transfers, pools]);

  const buys = transfers.filter((t) => t.side === "buy").length;
  const sells = transfers.filter((t) => t.side === "sell").length;
  const color = (s: string) => (s === "buy" ? "#39FF75" : s === "sell" ? "#FF4D5E" : "#6E8F7A");

  return (
    <Panel title="NETWORK MAP · LIVE FLOW OF $HOOD" right={<SourceTag feed={snap.transfers} now={now} />}>
      {!snap.transfers.ok ? <NoSignal what="Network map" /> : (
        <div className="grid lg:grid-cols-[1fr_15rem]">
          <div className="relative overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Network of ${wallets} wallets and ${edges.length} recent $HOOD transfers`}>
              <defs>
                <radialGradient id="core"><stop offset="0" stopColor="#39FF75" stopOpacity=".35" /><stop offset="1" stopColor="#39FF75" stopOpacity="0" /></radialGradient>
                <filter id="nglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <linearGradient id="sweep" x1="0" x2="1"><stop offset="0" stopColor="#39FF75" stopOpacity="0" /><stop offset="1" stopColor="#39FF75" stopOpacity=".25" /></linearGradient>
              </defs>
              {[135, 225].map((R) => <ellipse key={R} cx={CX} cy={CY} rx={R * 1.45} ry={R * 0.92} fill="none" stroke="#14251B" strokeDasharray="3 6" />)}
              <circle cx={CX} cy={CY} r="120" fill="url(#core)" />
              <g style={{ transformOrigin: `${CX}px ${CY}px` }} className="motion-safe:animate-[spin_8s_linear_infinite]">
                <path d={`M${CX},${CY} L${CX + 330},${CY} A330,330 0 0,0 ${CX + 330 * Math.cos(-0.5)},${CY + 330 * Math.sin(-0.5)} Z`} fill="url(#sweep)" opacity=".5" />
              </g>
              {edges.map((e) => {
                const mx = (e.a.x + e.b.x) / 2 + (e.b.y - e.a.y) * 0.12;
                const my = (e.a.y + e.b.y) / 2 - (e.b.x - e.a.x) * 0.12;
                const d = `M${e.a.x},${e.a.y} Q${mx},${my} ${e.b.x},${e.b.y}`;
                const dim = hover && hover.id !== e.a.id && hover.id !== e.b.id;
                return (
                  <g key={e.key} opacity={dim ? 0.12 : 1}>
                    <path d={d} fill="none" stroke={color(e.side)} strokeOpacity=".28" strokeWidth="1" />
                    <circle r="2.4" fill={color(e.side)} filter="url(#nglow)">
                      <animateMotion dur={`${2.4 + (e.i % 5) * 0.5}s`} begin={`${(e.i % 9) * 0.35}s`} repeatCount="indefinite" path={d} />
                    </circle>
                  </g>
                );
              })}
              {nodes.map((n) => (
                <g key={n.id} className="cursor-pointer" onPointerEnter={() => setHover(n)} onPointerLeave={() => setHover(null)}
                  onClick={() => window.open(`${snap.explorer}/address/${n.id}`, "_blank", "noopener")}>
                  {n.kind === "pool" ? (
                    <>
                      <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="#39FF75" strokeOpacity=".4" className="motion-safe:animate-ping" style={{ transformOrigin: `${n.x}px ${n.y}px`, animationDuration: "2.5s" }} />
                      <circle cx={n.x} cy={n.y} r={n.r} fill="#050806" stroke="#39FF75" strokeWidth="2" filter="url(#nglow)" />
                      <text x={n.x} y={n.y + 3.5} textAnchor="middle" fill="#39FF75" fontSize="9" fontWeight="700" fontFamily="var(--font-jetbrains)">POOL</text>
                    </>
                  ) : (
                    <circle cx={n.x} cy={n.y} r={n.r} fill={n.buys > n.sells ? "#39FF75" : n.sells > n.buys ? "#FF4D5E" : "#6E8F7A"} fillOpacity={hover?.id === n.id ? 1 : 0.75} filter="url(#nglow)" />
                  )}
                </g>
              ))}
              {!nodes.some((n) => n.kind === "pool") && (
                <text x={CX} y={CY + 4} textAnchor="middle" fill="#39FF75" fontSize="14" fontWeight="700" fontFamily="var(--font-jetbrains)">$HOOD</text>
              )}
            </svg>
            {hover && (
              <div className="pointer-events-none absolute left-3 top-3 border border-spray/50 bg-asphalt/90 px-3 py-2 text-[11px] leading-5">
                <p className="text-spray">{hover.kind === "pool" ? "LIQUIDITY POOL" : "WALLET"} {short(hover.id, 6)}</p>
                <p className="text-smoke">moved {compact(hover.vol)} HOOD · {hover.buys} buys · {hover.sells} sells</p>
              </div>
            )}
          </div>
          <aside className="space-y-3 border-t border-curb p-4 text-xs lg:border-l lg:border-t-0">
            {([
              ["WALLETS ON MAP", int(wallets)],
              ["TRANSFERS", int(transfers.length)],
              ["BUYS", int(buys)],
              ["SELLS", int(sells)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-curb pb-2"><span className="text-smoke">{k}</span><span className="tabular-nums text-chalk">{v}</span></div>
            ))}
            <ul className="space-y-1.5 pt-2 text-[11px] text-smoke">
              <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-spray" />net buyer / buy flow</li>
              <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-alert" />net seller / sell flow</li>
              <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-smoke" />wallet-to-wallet transfer</li>
              <li className="pt-2">Node size = $HOOD moved in the latest {transfers.length} transfers. Click a node to open it on the explorer.</li>
            </ul>
          </aside>
        </div>
      )}
    </Panel>
  );
}
