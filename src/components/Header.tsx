"use client";

import { HOOD_CONFIG } from "@/hood.config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X } from "lucide-react";
import { CaButton } from "./Networks";

const SECTIONS = [
  { href: "/#pipeline", label: "How it works" },
  { href: "/#access", label: "Access" },
  { href: "/#token", label: `$${HOOD_CONFIG.project.ticker}` },
  { href: "/#monitor", label: "Monitor" },
];
const PAGES = [{ href: "/terminal", label: "Terminal" }];

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const item = (active: boolean) =>
    `px-2.5 py-1.5 text-[12px] uppercase tracking-[0.15em] transition-colors ${active ? "text-spray" : "text-smoke hover:text-spray"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-curb bg-asphalt/85 font-mono backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-sm font-bold tracking-[0.2em]" onClick={() => setOpen(false)}>
          <Mark />
          <span className="hidden text-chalk group-hover:text-spray min-[420px]:inline">HOOD<span className="text-spray">_</span>TERMINAL</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center lg:flex">
          {SECTIONS.map((n) => <a key={n.href} href={n.href} className={item(false)}>{n.label}</a>)}
          <span className="mx-2 h-4 w-px bg-curb" />
                    {PAGES.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} className={item(path === n.href)}>{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <CaButton />
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} />
          <button className="border border-curb p-2 text-chalk hover:border-spray hover:text-spray lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="grid grid-cols-2 gap-px border-t border-curb bg-curb lg:hidden">
          {[...SECTIONS, ...PAGES].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="bg-asphalt px-4 py-3 text-xs uppercase tracking-[0.2em] text-chalk hover:text-spray">
              <span className="text-spray">&gt; </span>{n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

/** HOOD logo. */
export const Mark = ({ size = 28 }: { size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/hood.svg" alt="" aria-hidden width={size} height={size} className="rounded-md" />
);
