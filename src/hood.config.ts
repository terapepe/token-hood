
export const HOOD_CONFIG = {
  project: {
    name: "HOOD",
    ticker: "HOOD",
    tagline: "AI web intelligence terminal",
  },
  social: {
    x: "https://x.com/TokenhoodOnline",
    xHandle: "@TokenhoodOnline",
    telegram: "",
    discord: "",
  },

  deployer: { name: "", url: "" },
  token: {
    address: "0x9032191d1b570d33bfa95a9ff78f639e105ad801",
    sol: "",
  },

  mode: "single" as "single" | "multi",
  singleNetwork: "base" as NetworkId,
  multiOrder: ["robinhood", "solana", "base", "bsc"] as NetworkId[],
  primaryNetwork: "robinhood" as NetworkId,

  /** AI terminal access. */
  access: {
    minHold: 30000,
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
