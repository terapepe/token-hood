import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jet = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const plex = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex", display: "swap" });

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online";
const TITLE = "HOOD TERMINAL — AI website analysis & redesign";
const DESC = "Paste any URL. HOOD's AI analyses the design, UX and SEO, then generates a redesigned, downloadable website to your brief. Access for $HOOD holders on Robinhood Chain.";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT}`),
  title: { default: TITLE, template: "%s | HOOD TERMINAL" },
  description: DESC,
  keywords: ["HOOD", "$HOOD", "AI website redesign", "website analysis", "AI web designer", "Robinhood Chain", "HOOD TERMINAL"],
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/hood.svg", type: "image/svg+xml" }] },
  openGraph: { type: "website", siteName: "HOOD TERMINAL", title: TITLE, description: DESC, url: "/", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC, images: ["/og.png"] },
};
export const viewport: Viewport = { themeColor: "#050806" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jet.variable} ${plex.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
