"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import { HOOD_CONFIG } from "@/hood.config";
import { buyLink, caGroups, explorerToken, isSingle, listNets, type Net, type NetworkId } from "@/lib/networks";

const T = `$${HOOD_CONFIG.project.ticker}`;
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

// eslint-disable-next-line @next/next/no-img-element
export const NetIcon = ({ net, size = 18 }: { net: Net; size?: number }) => <img src={net.icon} alt="" width={size} height={size} className="shrink-0" />;

/** "Live on" row: one badge per shown network, MAIN pill on the main network in multi mode. */
export function NetworkBadges({ label = "LIVE ON" }: { label?: string }) {
  const nets = listNets();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <span className="tracking-[0.25em] text-smoke">{label}</span>
      {nets.map((n) => (
        <span key={n.id} className="flex items-center gap-1.5 border px-2 py-1 text-chalk" style={{ borderColor: n.primary && !isSingle() ? n.color : "#1C3325" }}>
          <NetIcon net={n} /> {n.short}
          {n.primary && !isSingle() && <span className="px-1 text-[9px] font-bold text-asphalt" style={{ background: n.color }}>MAIN</span>}
        </span>
      ))}
    </div>
  );
}

function CopyCa({ ca, label }: { ca: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { await navigator.clipboard.writeText(ca); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="btn-primary shrink-0 px-3 py-1.5 text-[11px]" aria-label={`${label}: ${ca}`}>
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? "Copied" : label}
    </button>
  );
}

/** One card per CA group (networks sharing a CA are merged) with Copy CA + explorer links. */
export function CaCards({ className = "" }: { className?: string }) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {caGroups().map(({ ca, nets }) => {
        const color = nets.length === 1 ? nets[0].color : "#39FF75";
        const tag = nets.map((n) => n.short).join("/");
        return (
          <div key={ca || nets[0].id} className="border bg-asphalt/70 p-3" style={{ borderColor: `${color}66`, boxShadow: `inset 3px 0 0 ${color}` }}>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {nets.map((n) => <span key={n.id} className="flex items-center gap-1 text-chalk"><NetIcon net={n} size={14} />{n.short}</span>)}
              <span className="ml-auto flex gap-3">
                {ca && nets.map((n) => <a key={n.id} href={explorerToken(n.id)} {...ext} className="text-smoke hover:text-spray">{nets.length > 1 ? n.short : "Explorer"} ↗</a>)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-[11px] text-spray">{ca || "TBA — not deployed yet"}</code>
              {ca && <CopyCa ca={ca} label={`Copy ${tag} CA`} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Header button: single CA → copies directly; several → dropdown of CA groups. */
export function CaButton() {
  const groups = caGroups();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const single = groups.length === 1;
  if (single && !groups[0].ca) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={async () => {
          if (single) {
            await navigator.clipboard.writeText(groups[0].ca);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } else setOpen((o) => !o);
        }}
        className="flex items-center gap-1.5 border border-curb px-2.5 py-2 text-[11px] uppercase tracking-wider text-chalk hover:border-spray hover:text-spray"
      >
        {done ? <Check size={13} /> : <Copy size={13} />}
        <span className="hidden sm:inline">{done ? "Copied" : single ? `Copy ${groups[0].nets[0].short} CA` : "Copy CA"}</span>
        {!single && <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(26rem,90vw)] border border-curb bg-asphalt p-2 shadow-glow">
          <CaCards />
        </div>
      )}
    </div>
  );
}

/** Network switcher for live data (multi mode only). */
export function NetTabs({ net, onChange }: { net: NetworkId; onChange: (n: NetworkId) => void }) {
  if (isSingle()) return null;
  return (
    <div className="flex flex-wrap border border-curb text-[11px]" role="tablist" aria-label="Network">
      {listNets().map((n) => (
        <button key={n.id} role="tab" aria-selected={net === n.id} onClick={() => onChange(n.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 uppercase tracking-wider transition-colors ${net === n.id ? "bg-forest text-chalk" : "text-smoke hover:text-chalk"}`}
          style={net === n.id ? { boxShadow: `inset 0 -2px 0 ${n.color}` } : undefined}>
          <NetIcon net={n} size={14} />{n.short}
        </button>
      ))}
    </div>
  );
}

/** Buy links: one per shown network with a CA. */
export function BuyLinks({ className = "btn-primary px-6 py-3", short = false, mainOnly = false }: { className?: string; short?: boolean; mainOnly?: boolean }) {
  const nets = listNets().filter((n) => buyLink(n.id) && (!mainOnly || n.primary));
  if (!nets.length) return null;
  if (nets.length === 1) return <a href={buyLink(nets[0].id)} {...ext} className={className}>&gt; Buy {T}{!isSingle() && !short ? ` on ${nets[0].short}` : ""}</a>;
  return (
    <>
      {nets.map((n) => (
        <a key={n.id} href={buyLink(n.id)} {...ext} className={className}><NetIcon net={n} size={16} /> Buy on {n.short}</a>
      ))}
    </>
  );
}

