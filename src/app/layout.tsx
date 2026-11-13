import type { Metadata, Viewport } from "next";
import { Anton, Bricolage_Grotesque, IBM_Plex_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Anton + Bricolage are used by token sites; JetBrains Mono + IBM Plex Mono by HOOD TERMINAL.
const display = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const body = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-body" });
const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const plex = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex", display: "swap" });

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online";
const DESC = "HOOD TERMINAL — live $HOOD intelligence on Robinhood Chain: price, liquidity, holders, on-chain transactions and the Tokenhood site builder paid in $HOOD.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT}`),
  title: { default: "HOOD TERMINAL — $HOOD on Robinhood Chain", template: "%s | HOOD TERMINAL" },
  description: DESC,
  keywords: ["HOOD", "$HOOD", "Robinhood Chain", "meme token", "Tokenhood", "token website builder", "crypto terminal"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "HOOD TERMINAL", title: "HOOD TERMINAL — $HOOD on Robinhood Chain", description: DESC, url: "/", images: ["/hood.jpg"] },
  twitter: { card: "summary_large_image", title: "HOOD TERMINAL", description: DESC, images: ["/hood.jpg"] },
};
export const viewport: Viewport = { themeColor: "#050806" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${jet.variable} ${plex.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
