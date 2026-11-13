import { createPublicClient, erc20Abi, formatUnits, http, isAddress, verifyMessage, type Hex } from "viem";
import { ACCESS_TTL_MS, HOOD_CHAIN, HOOD_MIN_HOLD, HOOD_RPC_SERVER, HOOD_TOKEN_ADDRESS, accessMessage } from "./hood";

const client = createPublicClient({ chain: HOOD_CHAIN, transport: http(HOOD_RPC_SERVER) });

export type Access = { ok: true; address: Hex; balance: number } | { ok: false; status: number; error: string; balance?: number };

/** On-chain $HOOD balance (whole tokens) read from Robinhood Chain. */
export async function hoodBalance(address: Hex): Promise<number> {
  const [raw, decimals] = await Promise.all([
    client.readContract({ address: HOOD_TOKEN_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
    client.readContract({ address: HOOD_TOKEN_ADDRESS, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return Number(formatUnits(raw, decimals));
}

/** Holder gate: valid fresh signature from the wallet AND balance >= HOOD_MIN_HOLD. */
export async function checkAccess(input: { address?: string; signature?: string; ts?: number }): Promise<Access> {
  const { address, signature, ts } = input;
  if (!address || !isAddress(address) || !signature || !ts) return { ok: false, status: 401, error: "Connect your wallet and sign the access message." };
  if (Math.abs(Date.now() - ts) > ACCESS_TTL_MS) return { ok: false, status: 401, error: "Access signature expired. Sign again." };
  const valid = await verifyMessage({ address, message: accessMessage(address, ts), signature: signature as Hex }).catch(() => false);
  if (!valid) return { ok: false, status: 401, error: "Signature does not match this wallet." };
  let balance: number;
  try {
    balance = await hoodBalance(address);
  } catch {
    return { ok: false, status: 503, error: "Could not read your $HOOD balance from Robinhood Chain. Try again." };
  }
  if (balance < HOOD_MIN_HOLD)
    return { ok: false, status: 403, balance, error: `Hold at least ${HOOD_MIN_HOLD.toLocaleString()} $HOOD to use the terminal (wallet holds ${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}).` };
  return { ok: true, address, balance };
}

/** Best-effort per-wallet limiter (per server instance). */
const hits = new Map<string, number[]>();
const LIMIT = Number(process.env.HOOD_RUNS_PER_HOUR ?? 10);
export function rateLimit(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (list.length >= LIMIT) return false;
  list.push(now);
  hits.set(key, list);
  return true;
}
