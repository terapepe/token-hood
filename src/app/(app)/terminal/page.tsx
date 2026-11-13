import type { Metadata } from "next";
import { TerminalApp } from "@/components/terminal/TerminalApp";
import { HOOD_MIN_HOLD } from "@/lib/hood";

export const metadata: Metadata = {
  title: "AI Terminal",
  description: "Scan any website, get an AI design/UX/SEO analysis and a redesigned single-file HTML site you can preview, revise and download.",
  alternates: { canonical: "/terminal" },
};

export default function TerminalPage() {
  return (
    <main>
      <h1 className="sr-only">HOOD AI Terminal</h1>
      <TerminalApp minHold={HOOD_MIN_HOLD} />
    </main>
  );
}
