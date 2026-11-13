import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { robinhood } from "viem/chains";
import type { Chain } from "viem";
import { evmChains } from "./networks";

/** EVM networks shown by hood.config.ts (falls back to Robinhood Chain so wagmi always has a chain). */
const chains = (evmChains().length ? evmChains() : [robinhood]) as [Chain, ...Chain[]];

export const wagmiConfig = getDefaultConfig({
  appName: "HOOD TERMINAL",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "demo",
  chains,
  transports: Object.fromEntries(chains.map((c) => [c.id, http()])),
  ssr: true,
});
