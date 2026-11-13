"use client";

import { useEffect, useRef } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF$HOOD";

/** Low-cost matrix rain: ~16fps, pauses when the tab is hidden, off with reduced motion. */
export function MatrixRain({ opacity = 0.18 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const size = 16;
    let cols: number[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Array.from({ length: Math.ceil(innerWidth / size) }, () => Math.random() * -50);
    };
    resize();
    addEventListener("resize", resize);

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (ts - last < 60 || document.hidden) return;
      last = ts;
      ctx.fillStyle = "rgba(5,8,6,0.16)";
      ctx.fillRect(0, 0, innerWidth, innerHeight);
      ctx.font = `${size - 2}px monospace`;
      for (let i = 0; i < cols.length; i++) {
        const y = cols[i] * size;
        ctx.fillStyle = Math.random() > 0.975 ? "#D9FBE4" : "#39FF75";
        ctx.fillText(CHARS[(Math.random() * CHARS.length) | 0], i * size, y);
        cols[i] = y > innerHeight && Math.random() > 0.975 ? 0 : cols[i] + 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" style={{ opacity }} />;
}
