import { robinhood } from "viem/chains";
import type { Hex } from "viem";
import { HOOD_INFO } from "./hood-info";

/** Chain where $HOOD lives. */
export const HOOD_CHAIN = robinhood;

/** RPC for the HOOD chain (falls back to the chain's public RPC). */
export const HOOD_RPC_PUBLIC = process.env.NEXT_PUBLIC_RPC_URL || undefined;
export const HOOD_RPC_SERVER = process.env.RPC_URL || HOOD_RPC_PUBLIC;

const UNISWAP_CHAIN = "robinhood";
export const uniswapUrl = (ca: string) => `https://app.uniswap.org/swap?chain=${UNISWAP_CHAIN}&outputCurrency=${ca}`;
export const explorerTokenUrl = (ca: string) => `${HOOD_CHAIN.blockExplorers.default.url}/token/${ca}`;

/** Optional override for the Buy button: NEXT_PUBLIC_SWAP_URL with {ca} as the token placeholder. */
const SWAP_URL = process.env.NEXT_PUBLIC_SWAP_URL || "";
export const buyUrl = (ca: string) => (SWAP_URL ? SWAP_URL.replaceAll("{ca}", ca) : uniswapUrl(ca));

const isCA = (a?: string) => Boolean(a && /^0x[0-9a-fA-F]{40}$/.test(a));
const ZERO = "0x0000000000000000000000000000000000000000" as Hex;

/** $HOOD contract: NEXT_PUBLIC_HOOD_TOKEN_ADDRESS, else lib/hood-info.ts. */
export const HOOD_TOKEN_ADDRESS = (isCA(process.env.NEXT_PUBLIC_HOOD_TOKEN_ADDRESS)
  ? process.env.NEXT_PUBLIC_HOOD_TOKEN_ADDRESS
  : isCA(HOOD_INFO.contractAddress) ? HOOD_INFO.contractAddress : ZERO) as Hex;

/** Minimum $HOOD a wallet must hold to use the AI terminal (whole tokens). */
export const HOOD_MIN_HOLD = Number(process.env.NEXT_PUBLIC_HOOD_MIN_HOLD ?? 100000);

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online";

/** Message signed to prove wallet ownership; timestamped so it can't be replayed later. */
export const accessMessage = (address: string, ts: number) =>
  `HOOD TERMINAL access\nWallet: ${address.toLowerCase()}\nTime: ${ts}`;
export const ACCESS_TTL_MS = 30 * 60 * 1000;
