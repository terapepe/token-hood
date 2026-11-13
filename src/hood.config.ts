/**
 * HOOD TERMINAL — site config. Edit this file on GitHub; Vercel redeploys automatically.
 * Secrets (ANTHROPIC_API_KEY, private RPC URLs) stay in Vercel environment variables, never here.
 */
export const HOOD_CONFIG = {
  project: {
    name: "HOOD",
    ticker: "HOOD",
    tagline: "AI web intelligence terminal",
  },

  /** Social links. Leave "" to hide. */
  social: {
    x: "https://x.com/token_HOOD",
    xHandle: "@token_HOOD",
    telegram: "",
    discord: "",
  },

  /** Platform that launched the token (optional, url "" = plain text). */
  deployer: { name: "Ponsfamily", url: "https://ponsfamily.com/launchpad/0x98184105c254948060132d2a7b39be94d36c77be" },

  /**
   * $HOOD contract addresses.
   *  address = CA shared by all EVM networks (Robinhood, Base, BSC)
   *  sol     = mint address on Solana
   * A network can override with its own `ca` below. "" = not deployed (shows "TBA").
   */
  token: {
    address: "0x98184105c254948060132d2a7b39be94d36c77be",
    sol: "",
  },

  /**
   * Network mode:
   *  "single" = only `singleNetwork` is shown — it is also the main network and sets the accent color
   *  "multi"  = all 4 networks, ordered by `multiOrder`; `primaryNetwork` is the default data view
   * Holder access counts $HOOD across every shown network of the connected wallet type (EVM or Solana).
   */
  mode: "single" as "single" | "multi",
  singleNetwork: "robinhood" as NetworkId,
  multiOrder: ["robinhood", "solana", "base", "bsc"] as NetworkId[],
  primaryNetwork: "robinhood" as NetworkId,

  /** AI terminal access. */
  access: {
    /** Minimum $HOOD (whole tokens, summed over shown networks) to use the terminal. */
    minHold: 100000,
    /** Fair-use limit per wallet. */
    runsPerHour: 10,
  },

  networks: {
    robinhood: {
      name: "Robinhood Chain",
      short: "Robinhood",
      type: "evm",
      chainId: 4663,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
      explorer: "https://robinhoodchain.blockscout.com",
      /** Blockscout v2 API → holders, transfers, chain stats. "" = not available. */
      blockscoutApi: "https://robinhoodchain.blockscout.com/api/v2",
      /** DexScreener / GeckoTerminal network ids. "" = match pairs not on another configured network. */
      dexscreenerId: "",
      geckoId: "",
      buyUrl: "https://app.uniswap.org/swap?chain=robinhood&outputCurrency={ca}",
      color: "#CCFF00",
      tagline: "Fast, low-fee L2 built for trading",
      icon: "/networks/robinhood.svg",
      ca: "",
    },
    solana: {
      name: "Solana",
      short: "Solana",
      type: "solana",
      chainId: 0,
      nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
      rpcUrls: ["https://api.mainnet-beta.solana.com"],
      explorer: "https://solscan.io",
      blockscoutApi: "",
      dexscreenerId: "solana",
      geckoId: "solana",
      buyUrl: "https://jup.ag/swap/SOL-{ca}",
      color: "#9945FF",
      tagline: "Lightning-fast and meme-native",
      icon: "/networks/solana.svg",
      ca: "",
    },
    base: {
      name: "Base",
      short: "Base",
      type: "evm",
      chainId: 8453,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://mainnet.base.org"],
      explorer: "https://basescan.org",
      blockscoutApi: "https://base.blockscout.com/api/v2",
      dexscreenerId: "base",
      geckoId: "base",
      buyUrl: "https://app.uniswap.org/swap?chain=base&outputCurrency={ca}",
      color: "#0052FF",
      tagline: "Onchain with the Base community",
      icon: "/networks/base.svg",
      ca: "",
    },
    bsc: {
      name: "BNB Smart Chain",
      short: "BSC",
      type: "evm",
      chainId: 56,
      nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
      rpcUrls: ["https://bsc-dataseed.bnbchain.org"],
      explorer: "https://bscscan.com",
      blockscoutApi: "",
      dexscreenerId: "bsc",
      geckoId: "bsc",
      buyUrl: "https://pancakeswap.finance/swap?outputCurrency={ca}&chain=bsc",
      color: "#F0B90B",
      tagline: "Degen energy on BNB Smart Chain",
      icon: "/networks/bsc.svg",
      ca: "",
    },
  },
};

export type NetworkId = "robinhood" | "solana" | "base" | "bsc";
