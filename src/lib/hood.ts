import { HOOD_CONFIG } from "@/hood.config";

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online";

/** Minimum $HOOD (whole tokens) to use the AI terminal — set in hood.config.ts. */
export const HOOD_MIN_HOLD = HOOD_CONFIG.access.minHold;

export type WalletKind = "evm" | "solana";

/** Message signed to prove wallet ownership; timestamped so it can't be replayed later. */
export const accessMessage = (address: string, ts: number) =>
  `HOOD TERMINAL access\nWallet: ${/^0x/i.test(address) ? address.toLowerCase() : address}\nTime: ${ts}`;
export const ACCESS_TTL_MS = 30 * 60 * 1000;
