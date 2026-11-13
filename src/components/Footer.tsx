import Link from "next/link";
import { HOOD_CONFIG } from "@/hood.config";
import { buyLink, explorerToken, listNets, netNames } from "@/lib/networks";
import { CaCards } from "./Networks";
import { Mark } from "./Header";

const NAV = [
  { href: "/terminal", label: "AI terminal" },
  { href: "/#access", label: "Access" },
  { href: "/#token", label: "Token intel" },
  { href: "/#monitor", label: "Tx monitor" },
];

export function Footer() {
  const { project, social, deployer } = HOOD_CONFIG;
  const T = `$${project.ticker}`;
  const ext = { target: "_blank", rel: "noopener noreferrer" } as const;
  const link = "text-smoke transition-colors hover:text-spray";
  const nets = listNets();

  return (
    <footer className="border-t border-curb bg-asphalt font-mono text-xs">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto_auto_minmax(0,26rem)] lg:gap-14">
        <div className="max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-[0.2em] text-chalk"><Mark /><span>{project.name}<span className="text-spray">_</span>TERMINAL</span></Link>
          <p className="mt-4 leading-relaxed text-smoke">AI terminal that analyses websites and ships redesigned code. Powered by {T} on {netNames()}.</p>
          <div className="mt-4 flex gap-2">
            {nets.map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n.id} src={n.icon} alt={n.name} title={n.name} width={22} height={22} />
            ))}
          </div>
          <p className="mt-4 text-[11px] text-smoke/80">AI: Claude. Data: Blockscout, DexScreener, GeckoTerminal. Nothing here is financial advice.</p>
        </div>
        <nav aria-label="Footer" className="uppercase tracking-[0.15em]">
          <ul className="space-y-2.5">{NAV.map((n) => <li key={n.href}><Link href={n.href} className={link}>&gt; {n.label}</Link></li>)}</ul>
        </nav>
        <ul className="space-y-2.5 uppercase tracking-[0.15em]">
          {social.x && <li><a href={social.x} {...ext} className={link}>&gt; X {social.xHandle}</a></li>}
          {social.telegram && <li><a href={social.telegram} {...ext} className={link}>&gt; Telegram</a></li>}
          {social.discord && <li><a href={social.discord} {...ext} className={link}>&gt; Discord</a></li>}
          {nets.filter((n) => buyLink(n.id)).map((n) => <li key={n.id}><a href={buyLink(n.id)} {...ext} className={link}>&gt; Buy {nets.length > 1 ? `on ${n.short}` : T}</a></li>)}
          {nets.length === 1 && explorerToken(nets[0].id) && <li><a href={explorerToken(nets[0].id)} {...ext} className={link}>&gt; Explorer</a></li>}
        </ul>
        <CaCards />
      </div>
      <div className="border-t border-curb">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-smoke sm:px-6 md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} {project.name}</p>
          <p>
            Deployed by{" "}
            {deployer.url ? <a href={deployer.url} {...ext} className="text-chalk/80 hover:text-spray">{deployer.name}</a> : <span className="text-chalk/80">{deployer.name}</span>}
          </p>
        </div>
      </div>
    </footer>
  );
}
