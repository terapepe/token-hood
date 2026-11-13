import Link from "next/link";
import { Feed } from "@/components/Feed";
import { TEMPLATES } from "@/lib/templates";
import { getHoodInfo } from "@/lib/hood-live";
import { getSnapshot } from "@/lib/hood-data";
import { listPages } from "@/lib/db";
import { buyUrl, explorerTokenUrl } from "@/lib/hood";
import { LiveProvider } from "@/components/terminal/live";
import { MatrixRain } from "@/components/terminal/MatrixRain";
import { BootSequence } from "@/components/terminal/BootSequence";
import { RevealObserver } from "@/components/terminal/Reveal";
import { BlockMonitor, CommandCenter, DataStream, HeroReadout, TokenIntel } from "@/components/terminal/Dashboard";
import { NetworkMap } from "@/components/terminal/NetworkMap";

export const dynamic = "force-dynamic";

const PRICE = TEMPLATES[0].priceHood;
const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

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
  const [info, snap, pages] = await Promise.all([getHoodInfo(), getSnapshot(), listPages().catch(() => [])]);
  const { symbol, contractAddress: ca, x, telegram, discord, deployer, isLive } = info;
  const community = telegram || discord || x.url;
  const builders = new Set(pages.map((p) => p.owner?.toLowerCase()).filter(Boolean)).size;
  const respect = pages.reduce((s, p) => s + (p.respect ?? 0), 0);

  const checks = [
    { label: "dexscreener/market", ok: snap.market.ok },
    { label: "blockscout/token", ok: snap.token.ok },
    { label: "blockscout/chain", ok: snap.chain.ok, detail: snap.chain.data?.latestBlock ? `#${snap.chain.data.latestBlock}` : undefined },
    { label: "blockscout/transfers", ok: snap.transfers.ok },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "HOOD TERMINAL",
    description: `Live $${symbol} data on Robinhood Chain and token websites paid in $${symbol}.`,
    url: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "tokenhood.online"}`,
    sameAs: [x.url, telegram, discord].filter(Boolean),
  };

  return (
    <LiveProvider initial={snap}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BootSequence checks={checks} ca={ca} />
      <MatrixRain />
      <div aria-hidden className="crt" />
      <RevealObserver />

      <main className="font-mono">
        {/* 1. SYSTEM BOOT / HERO */}
        <section id="boot" className="relative isolate overflow-hidden">
          <div aria-hidden data-parallax="0.25" className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24 lg:pt-20">
            <div>
              <p className="kicker flex items-center gap-2"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-spray" /> SYSTEM ONLINE · ROBINHOOD CHAIN</p>
              <h1 className="mt-6 text-[clamp(3.2rem,10vw,7.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em]">
                <span className="glitch text-spray glow-text" data-text={`$${symbol}`}>${symbol}</span>
                <br />
                <span className="text-chalk">TERMINAL</span>
              </h1>
              <p className="cursor mt-6 max-w-[46ch] text-base leading-relaxed text-chalk/80 sm:text-lg">
                Secret intelligence feed for the community token of Robinhood Chain. Every number on this screen is pulled live from the chain.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                {isLive && <a href={buyUrl(ca)} {...ext} className="btn-primary px-6 py-3">&gt; Buy ${symbol}</a>}
                <a href="#intel" className="btn px-6 py-3">Open intel</a>
                <Link href="/builder" className="btn px-6 py-3">Build a site</Link>
              </div>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-px border border-curb bg-curb text-[11px]">
                {[["CHAIN", info.chainName], ["DEPLOYER", deployer.name], ["SITE FEE", `${PRICE.toLocaleString()} $${symbol}`]].map(([k, v]) => (
                  <div key={k} className="bg-asphalt/80 p-3"><dt className="tracking-[0.2em] text-smoke">{k}</dt><dd className="mt-1 truncate text-chalk">{v}</dd></div>
                ))}
              </dl>
            </div>
            <HeroReadout symbol={symbol} />
          </div>
          <DataStream />
        </section>

        {/* 2. COMMAND CENTER */}
        <section id="command" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="02" kicker="COMMAND CENTER" title="Network & system status" text="Chain health, token dossier and a live activity log built from what actually changes between polls." />
          <div className="reveal"><CommandCenter info={info} /></div>
        </section>

        {/* 3. TOKEN INTELLIGENCE */}
        <section id="intel" className="border-y border-curb bg-concrete/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead n="03" kicker="TOKEN INTELLIGENCE" title="Market readout" text="Price, cap, liquidity and volume from DexScreener; holders from Blockscout; candles from GeckoTerminal." />
            <div className="reveal"><TokenIntel /></div>
          </div>
        </section>

        {/* 4. BLOCKCHAIN MONITOR */}
        <section id="monitor" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="04" kicker="BLOCKCHAIN MONITOR" title="Live transaction feed" text="Latest $HOOD transfers. Transfers out of a pool are buys, into a pool are sells." />
          <div className="reveal"><BlockMonitor /></div>
        </section>

        {/* 5. NETWORK MAP */}
        <section id="network" className="border-y border-curb bg-concrete/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHead n="05" kicker="NETWORK MAP" title="Who is moving $HOOD" text="Each node is a real wallet or pool, each packet a real transfer from the feed above." />
            <div className="reveal"><NetworkMap /></div>
          </div>
        </section>

        {/* 6. COMMUNITY */}
        <section id="community" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHead n="06" kicker="HOOD COMMUNITY" title="The hood builds" text={`Holders launch their own token sites here and pay once in $${symbol}.`} />
          <div className="reveal grid gap-4 lg:grid-cols-3">
            <div className="panel">
              <div className="panel-head"><span><span className="text-spray">▍</span>CHANNELS</span></div>
              <ul className="divide-y divide-curb text-sm">
                {[
                  { label: "X / Twitter", sub: x.handle, href: x.url },
                  telegram && { label: "Telegram", sub: "community chat", href: telegram },
                  discord && { label: "Discord", sub: "community server", href: discord },
                  isLive && { label: "Explorer", sub: "robinhoodchain.blockscout.com", href: explorerTokenUrl(ca) },
                  deployer.url && { label: "Launchpad", sub: deployer.name, href: deployer.url },
                ].filter((l): l is { label: string; sub: string; href: string } => Boolean(l)).map((l) => (
                  <li key={l.label}>
                    <a href={l.href} {...ext} className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-forest/50">
                      <span><span className="text-chalk group-hover:text-spray">{l.label}</span><span className="block text-xs text-smoke">{l.sub}</span></span>
                      <span className="text-smoke group-hover:translate-x-1 group-hover:text-spray">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel">
              <div className="panel-head"><span><span className="text-spray">▍</span>COMMUNITY STATS</span><span className="text-[10px] normal-case tracking-normal text-spray">live · tokenhood db</span></div>
              <dl className="grid grid-cols-2 gap-px bg-curb">
                {[["SITES LIVE", pages.length], ["BUILDERS", builders], ["HOOD RESPECT", respect], ["SITE FEE", PRICE]].map(([k, v]) => (
                  <div key={k as string} className="bg-concrete p-4"><dt className="text-[10px] tracking-[0.2em] text-smoke">{k}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-chalk">{Number(v).toLocaleString()}</dd></div>
                ))}
              </dl>
              <ol className="space-y-3 p-4 text-xs text-smoke">
                {["Pick a layout and colors", "Add your token, images and links", `Pay once in $${symbol} — live at its own address`].map((s, i) => (
                  <li key={s} className="flex gap-3"><span className="text-spray">0{i + 1}</span>{s}</li>
                ))}
              </ol>
              <div className="border-t border-curb p-4"><Link href="/builder" className="btn-primary w-full">Deploy your token site</Link></div>
            </div>
            <div className="panel">
              <div className="panel-head"><span><span className="text-spray">▍</span>NEW ON THE BLOCK</span><Link href="/feed" className="normal-case tracking-normal hover:text-spray">see all →</Link></div>
              <div className="p-3"><Feed limit={3} /></div>
            </div>
          </div>
        </section>

        {/* 7. ACCESS THE HOOD */}
        <section id="access" className="relative isolate overflow-hidden border-t border-curb py-28">
          <div aria-hidden className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-spray/10 blur-3xl" />
          <div className="reveal mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="kicker">[07] // ACCESS THE HOOD</p>
            <h2 className="mt-6 text-[clamp(2.6rem,8vw,6rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
              <span className="glitch text-chalk" data-text="Enter">Enter</span> <span className="text-spray glow-text">the hood</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-smoke">Clearance is one transaction away. Verify the contract before you trade.</p>
            <code className="mx-auto mt-6 block max-w-xl break-all border border-curb bg-asphalt/80 px-4 py-3 text-xs text-spray">{ca}</code>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              {isLive && <a href={buyUrl(ca)} {...ext} className="btn-primary px-8 py-4 text-base">&gt; Buy ${symbol}</a>}
              {isLive && <a href={explorerTokenUrl(ca)} {...ext} className="btn px-8 py-4 text-base">View contract</a>}
              <a href={community} {...ext} className="btn px-8 py-4 text-base">Join community</a>
            </div>
          </div>
        </section>
      </main>
    </LiveProvider>
  );
}
