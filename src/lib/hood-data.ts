import { HOOD_CONFIG } from "@/hood.config";
import { getNet, listNets, primaryId, tokenAddress, type Net, type NetworkId } from "./networks";

/**
 * Live $HOOD data per network (hood.config.ts). Every value comes from a public API:
 *  - Blockscout (when the network has `blockscoutApi`): holders, supply, transfers, chain stats, blocks
 *  - DexScreener: price, liquidity, volume, market cap, pools
 *  - GeckoTerminal: OHLCV candles for the chart (and market fallback)
 * Nothing is invented: when a source fails, its block comes back with ok:false and the UI says so.
 */

export type Feed<T> = { ok: boolean; data: T | null; source: string; error?: string; at: number };

export type Market = {
  priceUsd: number | null;
  change24h: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  fdv: number | null;
  marketCap: number | null;
  buys24h: number | null;
  sells24h: number | null;
  dex: string | null;
  pairUrl: string | null;
  /** Pool / pair contracts trading $HOOD (used to tag transfers as buy or sell). */
  pools: string[];
};

export type TokenStats = { name: string; symbol: string; holders: number | null; totalSupply: number | null; decimals: number };

export type ChainStats = {
  latestBlock: number | null;
  avgBlockTimeMs: number | null;
  txToday: number | null;
  totalTx: number | null;
  totalAddresses: number | null;
  gasGwei: number | null;
  utilization: number | null;
  blocks: { height: number; timestamp: string; txs: number; gasUsed: number | null }[];
};

export type Side = "buy" | "sell" | "transfer";
export type Transfer = { hash: string; from: string; to: string; amount: number; timestamp: string; block: number | null; side: Side; method: string | null };

/** [unix seconds, open, high, low, close, volume USD] */
export type Candle = [number, number, number, number, number, number];
export type Timeframe = "15m" | "1h" | "4h" | "1d";

export type Snapshot = {
  net: NetworkId;
  ca: string;
  isLive: boolean;
  explorer: string;
  market: Feed<Market>;
  token: Feed<TokenStats>;
  chain: Feed<ChainStats>;
  transfers: Feed<Transfer[]>;
  fetchedAt: number;
};

const DEXSCREENER = "https://api.dexscreener.com";
const GECKO = "https://api.geckoterminal.com/api/v2";
/** Extra pool addresses (comma-separated) if a DEX isn't indexed by DexScreener. */
const EXTRA_POOLS = (process.env.HOOD_POOL_ADDRESSES ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Network ids used by DexScreener/GeckoTerminal for the *other* configured networks (to exclude). */
const otherIds = (n: Net, key: "dexscreenerId" | "geckoId") =>
  new Set(listNets().concat(Object.keys(HOOD_CONFIG.networks).map((k) => getNet(k)!)).filter((x) => x.id !== n.id).map((x) => x[key]).filter(Boolean));
/** Pair/pool belongs to network n: exact id when configured, else "not another configured network". */
const onNet = (n: Net, key: "dexscreenerId" | "geckoId", id: string) => (n[key] ? id === n[key] : !otherIds(n, key).has(id));
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

async function getJson<T = any>(url: string, revalidate = 15): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function feed<T>(source: string, fn: () => Promise<T>): Promise<Feed<T>> {
  try {
    return { ok: true, data: await fn(), source, at: Date.now() };
  } catch (e) {
    return { ok: false, data: null, source, error: e instanceof Error ? e.message : "unreachable", at: Date.now() };
  }
}

/* ---------------- Market ---------------- */

type GtPool = { network: string; address: string; attrs: any };

/** Finds the deepest GeckoTerminal pool where $HOOD is the base token. Cached 10 min. */
async function geckoPool(n: Net, CA: string): Promise<GtPool | null> {
  const j = await getJson(`${GECKO}/search/pools?query=${CA}`, 600);
  const pools: GtPool[] = (j?.data ?? [])
    .filter((p: any) => same(String(p?.relationships?.base_token?.data?.id ?? "").split("_").pop() ?? "", CA))
    .map((p: any) => {
      const id = String(p.id);
      const cut = id.lastIndexOf("_");
      return { network: id.slice(0, cut), address: String(p.attributes?.address ?? id.slice(cut + 1)), attrs: p.attributes ?? {} };
    })
    .filter((p: GtPool) => onNet(n, "geckoId", p.network))
    .sort((a: GtPool, b: GtPool) => (num(b.attrs.reserve_in_usd) ?? 0) - (num(a.attrs.reserve_in_usd) ?? 0));
  return pools[0] ?? null;
}

async function dexscreenerMarket(n: Net, CA: string): Promise<Market> {
  const j = await getJson(`${DEXSCREENER}/latest/dex/tokens/${CA}`);
  const pairs: any[] = (j?.pairs ?? []).filter(
    (p: any) => onNet(n, "dexscreenerId", String(p?.chainId ?? "")) && (same(String(p?.baseToken?.address ?? ""), CA) || same(String(p?.quoteToken?.address ?? ""), CA)),
  );
  if (!pairs.length) throw new Error("no pairs indexed");
  pairs.sort((a, b) => (num(b?.liquidity?.usd) ?? 0) - (num(a?.liquidity?.usd) ?? 0));
  const top = pairs[0];
  const isBase = same(String(top.baseToken?.address ?? ""), CA);
  const sum = (k: "buys" | "sells") => pairs.reduce((s, p) => s + (num(p?.txns?.h24?.[k]) ?? 0), 0);
  return {
    priceUsd: isBase ? num(top.priceUsd) : null,
    change24h: isBase ? num(top.priceChange?.h24) : null,
    liquidityUsd: pairs.reduce((s, p) => s + (num(p?.liquidity?.usd) ?? 0), 0) || null,
    volume24h: pairs.reduce((s, p) => s + (num(p?.volume?.h24) ?? 0), 0),
    fdv: num(top.fdv),
    marketCap: num(top.marketCap),
    buys24h: sum("buys"),
    sells24h: sum("sells"),
    dex: top.dexId ?? null,
    pairUrl: top.url ?? null,
    pools: [...new Set([...pairs.map((p) => String(p.pairAddress ?? "").toLowerCase()).filter(Boolean), ...EXTRA_POOLS])],
  };
}

async function geckoMarket(n: Net, CA: string): Promise<Market> {
  const p = await geckoPool(n, CA);
  if (!p) throw new Error("no pools indexed");
  const a = p.attrs;
  return {
    priceUsd: num(a.base_token_price_usd),
    change24h: num(a.price_change_percentage?.h24),
    liquidityUsd: num(a.reserve_in_usd),
    volume24h: num(a.volume_usd?.h24),
    fdv: num(a.fdv_usd),
    marketCap: num(a.market_cap_usd),
    buys24h: num(a.transactions?.h24?.buys),
    sells24h: num(a.transactions?.h24?.sells),
    dex: null,
    pairUrl: `https://www.geckoterminal.com/${p.network}/pools/${p.address}`,
    pools: [...new Set([p.address.toLowerCase(), ...EXTRA_POOLS])],
  };
}

async function getMarket(n: Net, CA: string): Promise<Feed<Market>> {
  const d = await feed("dexscreener", () => dexscreenerMarket(n, CA));
  if (d.ok) return d;
  const g = await feed("geckoterminal", () => geckoMarket(n, CA));
  return g.ok ? g : { ...d, error: `dexscreener: ${d.error}; geckoterminal: ${g.error}` };
}

/* ---------------- Blockscout ---------------- */

const noBlockscout = <T,>(): Feed<T> => ({ ok: false, data: null, source: "explorer", error: "not available on this network", at: Date.now() });

const getToken = (BLOCKSCOUT: string, CA: string) =>
  feed<TokenStats>("blockscout", async () => {
    const t = await getJson(`${BLOCKSCOUT}/tokens/${CA}`, 60);
    const decimals = num(t.decimals) ?? 18;
    const supply = t.total_supply ? Number(BigInt(t.total_supply) / 10n ** BigInt(Math.max(decimals - 6, 0))) / 10 ** Math.min(decimals, 6) : null;
    return {
      name: t.name ?? HOOD_CONFIG.project.name,
      symbol: t.symbol ?? HOOD_CONFIG.project.ticker,
      holders: num(t.holders_count ?? t.holders),
      totalSupply: supply,
      decimals,
    };
  });

const getChain = (BLOCKSCOUT: string) =>
  feed<ChainStats>("blockscout", async () => {
    const [s, b] = await Promise.all([getJson(`${BLOCKSCOUT}/stats`, 10), getJson(`${BLOCKSCOUT}/main-page/blocks`, 5).catch(() => [])]);
    const blocks = (Array.isArray(b) ? b : b?.items ?? []).slice(0, 6).map((x: any) => ({
      height: Number(x.height),
      timestamp: String(x.timestamp),
      txs: num(x.transactions_count ?? x.transaction_count ?? x.tx_count) ?? 0,
      gasUsed: num(x.gas_used),
    }));
    return {
      latestBlock: blocks[0]?.height ?? num(s.total_blocks),
      avgBlockTimeMs: num(s.average_block_time),
      txToday: num(s.transactions_today),
      totalTx: num(s.total_transactions),
      totalAddresses: num(s.total_addresses),
      gasGwei: num(s.gas_prices?.average?.price ?? s.gas_prices?.average),
      utilization: num(s.network_utilization_percentage),
      blocks,
    };
  });

function toAmount(value: string | undefined, decimals: number): number {
  if (!value) return 0;
  try {
    const v = BigInt(value);
    const scale = 10n ** BigInt(Math.max(decimals - 4, 0));
    return Number(v / scale) / 10 ** Math.min(decimals, 4);
  } catch {
    return 0;
  }
}

const getTransfers = (BLOCKSCOUT: string, CA: string, pools: string[]) =>
  feed<Transfer[]>("blockscout", async () => {
    const j = await getJson(`${BLOCKSCOUT}/tokens/${CA}/transfers`, 5);
    const poolSet = new Set(pools.map((p) => p.toLowerCase()));
    return (j?.items ?? []).slice(0, 40).map((t: any): Transfer => {
      const from = String(t.from?.hash ?? "").toLowerCase();
      const to = String(t.to?.hash ?? "").toLowerCase();
      const side: Side = poolSet.has(from) ? "buy" : poolSet.has(to) ? "sell" : "transfer";
      return {
        hash: String(t.transaction_hash ?? t.tx_hash ?? ""),
        from,
        to,
        amount: toAmount(t.total?.value, num(t.total?.decimals) ?? 18),
        timestamp: String(t.timestamp ?? ""),
        block: num(t.block_number ?? t.block),
        side,
        method: t.method ?? null,
      };
    });
  });

/* ---------------- Public API ---------------- */

const noCa = <T,>(): Feed<T> => ({ ok: false, data: null, source: "config", error: "contract not set", at: Date.now() });

/** Snapshot for one network (default: main network). */
export async function getSnapshot(netId?: string | null): Promise<Snapshot> {
  const n = getNet(netId && listNets().some((x) => x.id === netId) ? netId : primaryId())!;
  const CA = tokenAddress(n.id);
  const BS = (process.env[`BLOCKSCOUT_API_${n.id.toUpperCase()}`] || n.blockscoutApi || "").replace(/\/$/, "");
  const base = { net: n.id, ca: CA, isLive: Boolean(CA), explorer: n.explorer, fetchedAt: Date.now() };
  if (!CA) return { ...base, market: noCa(), token: noCa(), chain: BS ? await getChain(BS) : noBlockscout(), transfers: noCa() };
  const [market, token, chain] = await Promise.all([getMarket(n, CA), BS ? getToken(BS, CA) : noBlockscout<TokenStats>(), BS ? getChain(BS) : noBlockscout<ChainStats>()]);
  const transfers = BS ? await getTransfers(BS, CA, market.data?.pools ?? EXTRA_POOLS) : noBlockscout<Transfer[]>();
  return { ...base, market, token, chain, transfers };
}

const TF: Record<Timeframe, { path: string; aggregate: number; limit: number }> = {
  "15m": { path: "minute", aggregate: 15, limit: 96 },
  "1h": { path: "hour", aggregate: 1, limit: 168 },
  "4h": { path: "hour", aggregate: 4, limit: 180 },
  "1d": { path: "day", aggregate: 1, limit: 180 },
};

export async function getCandles(tf: Timeframe, netId?: string | null): Promise<Feed<{ candles: Candle[]; pool: string; network: string }>> {
  const n = getNet(netId && listNets().some((x) => x.id === netId) ? netId : primaryId())!;
  const CA = tokenAddress(n.id);
  return feed("geckoterminal", async () => {
    if (!CA) throw new Error("contract not set");
    const p = await geckoPool(n, CA);
    if (!p) throw new Error("no pool indexed for chart");
    const c = TF[tf];
    const j = await getJson(
      `${GECKO}/networks/${p.network}/pools/${p.address}/ohlcv/${c.path}?aggregate=${c.aggregate}&limit=${c.limit}&currency=usd&token=base`,
      tf === "15m" ? 60 : 300,
    );
    const list: Candle[] = (j?.data?.attributes?.ohlcv_list ?? [])
      .map((r: any[]) => r.map(Number) as Candle)
      .filter((r: Candle) => r.every(Number.isFinite))
      .sort((a: Candle, b: Candle) => a[0] - b[0]);
    return { candles: list, pool: p.address, network: p.network };
  });
}
