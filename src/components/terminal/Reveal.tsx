"use client";

import { useEffect } from "react";

/** Adds .in to every .reveal element as it scrolls into view, plus a subtle parallax on [data-parallax]. */
export function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));

    const par = document.querySelectorAll<HTMLElement>("[data-parallax]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !par.length) return () => io.disconnect();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => par.forEach((el) => (el.style.transform = `translate3d(0, ${scrollY * Number(el.dataset.parallax)}px, 0)`)));
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
