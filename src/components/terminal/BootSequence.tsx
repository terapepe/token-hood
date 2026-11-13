"use client";

import { useEffect, useState } from "react";

export type BootCheck = { label: string; ok: boolean; detail?: string };

/**
 * Terminal boot overlay. Status lines reflect the real result of the first data fetch.
 * Shown once per browser session; any key / click skips it.
 */
export function BootSequence({ checks, ca }: { checks: BootCheck[]; ca: string }) {
  const [show, setShow] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [granted, setGranted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("hood-boot") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      sessionStorage.setItem("hood-boot", "1");
    } catch {
      return;
    }
    setShow(true);
    const script = [
      "HOOD-OS v2.6 // secure shell",
      "> mounting /dev/robinhood-chain ........ done",
      `> target contract ${ca.slice(0, 10)}…${ca.slice(-6)}`,
      ...checks.map((c) => `> link ${c.label.padEnd(22, ".")} ${c.ok ? "[ OK ]" : "[FAIL]"}${c.detail ? ` ${c.detail}` : ""}`),
      "> loading HOOD AI design engine ......... done",
    ];
    const timers: number[] = [];
    script.forEach((l, i) => timers.push(window.setTimeout(() => setLines((x) => [...x, l]), 180 + i * 230)));
    const end = 180 + script.length * 230;
    timers.push(window.setTimeout(() => setGranted(true), end + 150));
    timers.push(window.setTimeout(() => setLeaving(true), end + 1200));
    timers.push(window.setTimeout(() => setShow(false), end + 1700));
    const skip = () => {
      setLeaving(true);
      timers.push(window.setTimeout(() => setShow(false), 300));
    };
    addEventListener("keydown", skip, { once: true });
    return () => {
      timers.forEach(clearTimeout);
      removeEventListener("keydown", skip);
    };
  }, [checks, ca]);

  if (!show) return null;
  return (
    <div
      role="dialog"
      aria-label="System boot"
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-asphalt font-mono transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      onTransitionEnd={() => leaving && setShow(false)}
    >
      <div className="w-full max-w-2xl px-6 text-[13px] leading-7 sm:text-sm">
        {lines.map((l, i) => (
          <p key={i} className={l.includes("[FAIL]") ? "text-caution" : i === 0 ? "text-spray glow-text" : "text-chalk/80"}>{l}</p>
        ))}
        {!granted && <p className="cursor text-spray" />}
        {granted && (
          <p className="glitch mt-6 text-3xl font-bold tracking-[0.2em] text-spray glow-text sm:text-5xl" data-text="ACCESS GRANTED">ACCESS GRANTED</p>
        )}
        <p className="mt-10 text-[11px] uppercase tracking-[0.3em] text-smoke">press any key to skip</p>
      </div>
    </div>
  );
}
