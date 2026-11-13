import Link from "next/link";
import type { HoodInfo } from "@/lib/hood-live";
import { buyUrl, explorerTokenUrl } from "@/lib/hood";
import { CopyButton } from "./CopyButton";
import { Mark } from "./Header";

const NAV = [
  { href: "/#intel", label: "Token intel" },
  { href: "/#monitor", label: "Tx monitor" },
  { href: "/builder", label: "Build a site" },
  { href: "/feed", label: "Feed" },
];

export function Footer({ info }: { info: HoodInfo }) {
  const { name, symbol, contractAddress, chainName, deployer, x, telegram, isLive: isHoodLive } = info;
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  const link = "text-smoke transition-colors hover:text-spray";

  return (
    <footer className="border-t border-curb bg-asphalt font-mono text-xs">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto_auto] md:gap-20">
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-[0.2em] text-chalk"><Mark /><span>HOOD<span className="text-spray">_</span>TERMINAL</span></Link>
          <p className="mt-4 leading-relaxed text-smoke">Live ${symbol} intelligence on {chainName}. Token websites paid once in ${symbol}.</p>
          <p className="mt-3 text-[11px] text-smoke/80">Data: Blockscout, DexScreener, GeckoTerminal. Nothing here is financial advice.</p>
        </div>
        <nav aria-label="Footer" className="uppercase tracking-[0.15em]">
          <ul className="space-y-2.5">{NAV.map((n) => <li key={n.href}><Link href={n.href} className={link}>&gt; {n.label}</Link></li>)}</ul>
        </nav>
        <ul className="space-y-2.5 uppercase tracking-[0.15em]">
          <li><a href={x.url} {...ext} className={link}>&gt; X {x.handle}</a></li>
          {telegram && <li><a href={telegram} {...ext} className={link}>&gt; Telegram</a></li>}
          {isHoodLive && <li><a href={buyUrl(contractAddress)} {...ext} className={link}>&gt; Buy ${symbol}</a></li>}
          {isHoodLive && <li><a href={explorerTokenUrl(contractAddress)} {...ext} className={link}>&gt; Explorer</a></li>}
        </ul>
      </div>
      <div className="border-t border-curb">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-smoke sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span>${symbol} CA</span>
            <code className="break-all text-spray/90">{contractAddress}</code>
            {isHoodLive && <CopyButton value={contractAddress} className="border border-curb text-chalk" />}
          </div>
          <p className="shrink-0">
            © {new Date().getFullYear()} {name} · deployed by{" "}
            {deployer.url ? <a href={deployer.url} {...ext} className="text-chalk/80 hover:text-spray">{deployer.name}</a> : <span className="text-chalk/80">{deployer.name}</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
