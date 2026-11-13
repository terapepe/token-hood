import { createPublicClient, erc20Abi, formatUnits, http, isAddress, verifyMessage, type Hex } from "viem";
import { ed25519 } from "@noble/curves/ed25519";
import bs58 from "bs58";
import { HOOD_CONFIG } from "@/hood.config";
import { ACCESS_TTL_MS, HOOD_MIN_HOLD, accessMessage, type WalletKind } from "./hood";
import { evmChains, listNets, tokenAddress, type Net } from "./networks";

export type NetBalance = { net: string; short: string; balance: number | null; error?: string };
export type Access =
  | { ok: true; address: string; kind: WalletKind; balance: number; breakdown: NetBalance[] }
  | { ok: false; status: number; error: string; balance?: number; breakdown?: NetBalance[] };

/** Server RPC override per network: RPC_URL_ROBINHOOD, RPC_URL_BASE, RPC_URL_BSC, RPC_URL_SOLANA. */
const rpcFor = (n: Net) => process.env[`RPC_URL_${n.id.toUpperCase()}`] || n.rpcUrls[0];

async function evmBalance(n: Net, owner: Hex): Promise<number> {
  const chain = evmChains().find((c) => c.id === n.chainId)!;
  const client = createPublicClient({ chain, transport: http(rpcFor(n)) });
  const ca = tokenAddress(n.id) as Hex;
  const [raw, dec] = await Promise.all([
    client.readContract({ address: ca, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    client.readContract({ address: ca, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return Number(formatUnits(raw, dec));
}

async function solBalance(n: Net, owner: string): Promise<number> {
  const res = await fetch(rpcFor(n), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner", params: [owner, { mint: tokenAddress(n.id) }, { encoding: "jsonParsed" }] }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message ?? "RPC error");
  return (j.result?.value ?? []).reduce((s: number, a: any) => s + Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? 0), 0);
}

/** $HOOD held by the wallet on every shown network of its type (with a CA). */
export async function hoodBalances(kind: WalletKind, address: string): Promise<NetBalance[]> {
  const nets = listNets().filter((n) => n.type === kind && tokenAddress(n.id));
  return Promise.all(
    nets.map(async (n) => {
      try {
        const balance = kind === "evm" ? await evmBalance(n, address as Hex) : await solBalance(n, address);
        return { net: n.id, short: n.short, balance };
      } catch (e) {
        return { net: n.id, short: n.short, balance: null, error: e instanceof Error ? e.message.slice(0, 80) : "read failed" };
      }
    }),
  );
}

function verifySolana(address: string, message: string, signature: string): boolean {
  try {
    return ed25519.verify(bs58.decode(signature), new TextEncoder().encode(message), bs58.decode(address));
  } catch {
    return false;
  }
}

/** Holder gate: fresh valid signature AND summed balance >= minHold (hood.config.ts). */
export async function checkAccess(input: { address?: string; signature?: string; ts?: number; kind?: WalletKind }): Promise<Access> {
  const { address, signature, ts } = input;
  const kind: WalletKind = input.kind === "solana" ? "solana" : "evm";
  if (!listNets().some((n) => n.type === kind)) return { ok: false, status: 400, error: `${kind === "evm" ? "EVM" : "Solana"} wallets are not used on this site.` };
  if (!address || !signature || !ts) return { ok: false, status: 401, error: "Connect your wallet and sign the access message." };
  if (kind === "evm" && !isAddress(address)) return { ok: false, status: 400, error: "Invalid wallet address." };
  if (Math.abs(Date.now() - ts) > ACCESS_TTL_MS) return { ok: false, status: 401, error: "Access signature expired. Sign again." };

  const message = accessMessage(address, ts);
  const valid = kind === "evm"
    ? await verifyMessage({ address: address as Hex, message, signature: signature as Hex }).catch(() => false)
    : verifySolana(address, message, signature);
  if (!valid) return { ok: false, status: 401, error: "Signature does not match this wallet." };

  const breakdown = await hoodBalances(kind, address);
  if (!breakdown.length) return { ok: false, status: 503, error: `$${HOOD_CONFIG.project.ticker} contract is not set for these networks yet.` };
  if (breakdown.every((b) => b.balance === null)) return { ok: false, status: 503, error: "Could not read your balance from the network RPC. Try again.", breakdown };
  const balance = breakdown.reduce((s, b) => s + (b.balance ?? 0), 0);
  if (balance < HOOD_MIN_HOLD)
    return { ok: false, status: 403, balance, breakdown, error: `Hold at least ${HOOD_MIN_HOLD.toLocaleString()} $${HOOD_CONFIG.project.ticker} to use the terminal (wallet holds ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}).` };
  return { ok: true, address, kind, balance, breakdown };
}

/** Best-effort per-wallet limiter (per server instance). */
const hits = new Map<string, number[]>();
export function rateLimit(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= HOOD_CONFIG.access.runsPerHour) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}
