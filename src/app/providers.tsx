"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useState, type ReactNode } from "react";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#39FF75", accentColorForeground: "#050806", borderRadius: "none" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
