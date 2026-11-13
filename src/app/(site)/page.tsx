import { HOOD_CONFIG } from "@/hood.config";
import { getSnapshot } from "@/lib/hood-data";
import { HOOD_MIN_HOLD } from "@/lib/hood";
import { explorerToken, getNet, isSingle, netNames, primaryId } from "@/lib/networks";
import { BuyLinks, CaCards, NetworkBadges } from "@/components/Networks";
import { isAiConfigured } from "@/lib/ai";
import { LiveProvider } from "@/components/terminal/live";
import { MatrixRain } from "@/components/terminal/MatrixRain";
import { BootSequence } from "@/components/terminal/BootSequence";
import { RevealObserver } from "@/components/terminal/Reveal";
import { BlockMonitor, DataStream, HeroReadout, TokenIntel } from "@/components/terminal/Dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

const PIPELINE: [string, string, string][] = [
  ["SCAN", "Fetches the live page: structure, copy, navigation, images, colors, fonts and tech stack.", "01"],
  ["ANALYZE", "Scores design, UX, content, SEO and accessibility and lists concrete issues with a plan.", "02"],
  ["REDESIGN", "Writes a brand-new responsive site that follows your brief, streamed live as code.", "03"],
  ["EXPORT", "Preview on desktop, tablet and mobile, ask for changes, download one ready-to-host HTML file.", "04"],
];

function SectionHead({ n, kicker, title, text }: { n: string; kicker: string; title: string; text?: string }) {
  return (
    <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="kicker">[{n}] // {kicker}</p>
        <h2 className="mt-3 text-3xl font-bold uppercase tracking-tight text-chalk sm:text-4xl">{title}</h2>
      </div>
      {text && <p className="max-w-md text-sm leading-relaxed text-smoke">{text}</p>}
    </div>
  );
}

export default async function Home() {
  const snap = await getSnapshot();
  const { project, social } = HOOD_CONFIG;
  const symbol = project.ticker;
  const { x, telegram, discord } = social;
  const community = telegram || discord || x;
  const main = getNet(primaryId())!;
  const ca = snap.ca;

  const checks = [
    { label: "ai/design-engine", ok: isAiConfigured },
    { label: "dexscreener/market", ok: snap.market.ok },
    { label: "blockscout/token", ok: snap.token.ok },
    { label: `${main.id}/chain`, ok: snap.chain.ok, detail: snap.chain.data?.latestBlock ? `#${snap.chain.data.latestBlock}` : undefined },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HOOD TERMINAL",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: "AI terminal that analyses any website and generates a redesigned, downloadable HTML site.",
    url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online"}`,
    sameAs: [x, telegram, discord].filter(Boolean),
  };

  return (
    <LiveProvider initial={snap}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BootSequence checks={checks} ca={ca || "TBA"} />
      <MatrixRain opacity={0.14} />
      <div aria-hidden className="crt" />
      <RevealObserver />

      <main className="font-mono">
        {/* 1. HERO */}
        <section id="boot" className="relative isolate overflow-hidden">
          <div aria-hidden data-parallax="0.25" className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-20">
            <div>
              <p className="kicker flex items-center gap-2"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-spray" /> AI WEB INTELLIGENCE · POWERED BY ${symbol}</p>
              <h1 className="mt-6 text-[clamp(3.2rem,10vw,7.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em]">
                <span className="glitch text-spray glow-text" data-text={`$${symbol}`}>${symbol}</span>
                <br />
                <span className="text-chalk">TERMINAL</span>
              </h1>
              <p className="cursor mt-6 max-w-[48ch] text-base leading-relaxed text-chalk/80 sm:text-lg">
                Paste any URL. HOOD dissects its design, UX and SEO, then ships a redesigned website built to your brief — ready to download.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/terminal" className="btn-primary px-6 py-3">&gt; Launch terminal</Link>
                <BuyLinks className="btn px-6 py-3" mainOnly />
                <a href="#pipeline" className="btn px-6 py-3">How it works</a>
              </div>
              {isSingle() && main.tagline && <p className="mt-6 text-sm" style={{ color: main.color }}>{main.name} · {main.tagline}</p>}
              <div className="mt-5"><NetworkBadges /></div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-px border border-curb bg-curb text-[11px]">
                {[["ACCESS", `≥ ${HOOD_MIN_HOLD.toLocaleString()} $${symbol}`], ["OUTPUT", "1 HTML file"], ["ENGINE", isAiConfigured ? "online" : "offline"]].map(([k, v]) => (
                  <div key={k} className="bg-asphalt/80 p-3"><dt className="tracking-[0.2em] text-smoke">{k}</dt><dd className={`mt-1 truncate ${v === "offline" ? "text-caution" : "text-chalk"}`}>{v}</dd></div>
                ))}
              </dl>
            </div>
            <HeroReadout symbol={symbol} />
          </div>
          <DataStream />
        </section>

        {/* 2. PIPELINE */}
        <section id="pipeline" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="02" kicker="PIPELINE" title="From URL to new website" text="Four stages, run live in the terminal. You see every step, the analysis and the code as it is written." />
          <ol className="reveal grid gap-px border border-curb bg-curb md:grid-cols-4">
            {PIPELINE.map(([t, d, n], i) => (
              <li key={t} className="group relative bg-concrete p-6 transition-colors hover:bg-forest/50">
                <p className="text-[11px] text-smoke">STAGE {n}</p>
                <p className="mt-3 text-2xl font-bold tracking-wider text-spray glow-text">{t}</p>
                <p className="mt-3 text-sm leading-relaxed text-smoke">{d}</p>
                {i < PIPELINE.length - 1 && <span aria-hidden className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-spray md:block">▶</span>}
              </li>
            ))}
          </ol>
        </section>

        {/* 3. TERMINAL CTA */}
        <section id="terminal" className="border-y border-curb bg-concrete/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead n="03" kicker="HOOD AI TERMINAL" title="Run a redesign" text="The terminal runs as its own workspace: projects, versions, split code/preview, report export." />
            <div className="reveal panel grid overflow-hidden md:grid-cols-[1.2fr_1fr]">
              <div className="border-b border-curb p-5 text-[12px] leading-7 md:border-b-0 md:border-r">
                <p className="text-smoke">hood@terminal:~$</p>
                <p className="text-chalk">&gt; hood scan example.com --brief &quot;darker, premium, stronger CTA&quot;</p>
                <p className="text-spray">SCAN · structure, copy, palette, fonts, stack</p>
                <p className="text-spray">ANALYZE · design · ux · content · seo · a11y</p>
                <p className="text-spray">REDESIGN · streaming single-file HTML</p>
                <p className="text-spray">BUILD READY · preview · revise · download</p>
                <p className="cursor text-smoke" />
              </div>
              <div className="flex flex-col justify-center gap-4 p-6">
                <ul className="space-y-2 text-sm text-smoke">
                  <li><span className="text-spray">▸</span> Saved projects &amp; version history</li>
                  <li><span className="text-spray">▸</span> Code · preview · split view, 3 device sizes</li>
                  <li><span className="text-spray">▸</span> Chat-style revisions, stop anytime</li>
                  <li><span className="text-spray">▸</span> Download .html + analysis report</li>
                </ul>
                <Link href="/terminal" className="btn-primary py-3">&gt; Open terminal</Link>
                <p className="text-[11px] text-smoke">Requires ≥ {HOOD_MIN_HOLD.toLocaleString()} ${symbol} in the connected wallet.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. ACCESS */}
        <section id="access" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="04" kicker="ACCESS PROTOCOL" title="Holders only" />
          <div className="reveal grid gap-4 md:grid-cols-3">
            {[
              ["HOLD", `Keep at least ${HOOD_MIN_HOLD.toLocaleString()} $${symbol} in your wallet. Nothing is spent — the terminal only checks your balance.`],
              ["SIGN", "Sign a short access message. It is free, sends no transaction and expires after 30 minutes."],
              ["RUN", `Your balance is read on-chain (${netNames()}) on every run. Fair-use limit applies per wallet.`],
            ].map(([k, v], i) => (
              <div key={k} className="panel p-6">
                <p className="text-[11px] text-smoke">0{i + 1}</p>
                <p className="mt-2 text-xl font-bold tracking-wider text-chalk">{k}</p>
                <p className="mt-3 text-sm leading-relaxed text-smoke">{v}</p>
              </div>
            ))}
          </div>
          <div className="reveal mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <CaCards />
            <div className="flex flex-wrap gap-2 lg:flex-col"><BuyLinks className="btn-primary px-4 py-2 text-xs" short /></div>
          </div>
        </section>

        {/* 5. TOKEN */}
        <section id="token" className="border-y border-curb bg-concrete/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead n="05" kicker="TOKEN INTELLIGENCE" title={`$${symbol} market readout`} text="Price, cap, liquidity and volume from DexScreener; holders from Blockscout; candles from GeckoTerminal." />
            <div className="reveal"><TokenIntel /></div>
          </div>
        </section>

        {/* 6. MONITOR */}
        <section id="monitor" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="06" kicker="BLOCKCHAIN MONITOR" title="Live transaction feed" text={`Latest $${symbol} transfers. Out of a pool = buy, into a pool = sell.`} />
          <div className="reveal"><BlockMonitor /></div>
        </section>

        {/* 7. FINAL */}
        <section className="relative isolate overflow-hidden border-t border-curb py-28">
          <div aria-hidden className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-spray/10 blur-3xl" />
          <div className="reveal mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="kicker">[07] // ACCESS THE HOOD</p>
            <h2 className="mt-6 text-[clamp(2.6rem,8vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
              <span className="glitch text-chalk" data-text="Enter">Enter</span> <span className="text-spray glow-text">the hood</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-smoke">Hold ${symbol}, unlock the terminal, rebuild the web.</p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <BuyLinks className="btn-primary px-8 py-4 text-base" />
              {explorerToken(main.id) && <a href={explorerToken(main.id)} {...ext} className="btn px-8 py-4 text-base">View contract</a>}
              <a href={community} {...ext} className="btn px-8 py-4 text-base">Join community</a>
            </div>
          </div>
        </section>
      </main>
    </LiveProvider>
  );
}
