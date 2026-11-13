/** Display helpers. Missing values render as "—", never as a made-up number. */
export const DASH = "—";

export function usd(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  if (opts.compact) return "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  if (n !== 0 && Math.abs(n) < 0.01) return "$" + smallNum(n);
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: n < 1 ? 6 : 2 });
}

/** 0.00000123 -> 0.0₅123 style subscript zeros for tiny meme prices. */
export function smallNum(n: number): string {
  const s = n.toFixed(20).replace(/0+$/, "");
  const m = s.match(/^0\.(0+)(\d{1,4})/);
  if (!m || m[1].length < 4) return n.toPrecision(4);
  const sub = String(m[1].length).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
  return `0.0${sub}${m[2]}`;
}

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

export function int(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return Math.round(n).toLocaleString("en-US");
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export const short = (a: string, n = 4) => (a && a.length > 2 * n + 2 ? `${a.slice(0, n + 2)}…${a.slice(-n)}` : a || DASH);

export function ago(iso: string | number, now = Date.now()): string {
  const t = typeof iso === "number" ? iso : Date.parse(iso);
  if (!Number.isFinite(t)) return DASH;
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const hhmmss = (iso: string | number) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? DASH : d.toISOString().slice(11, 19);
};
