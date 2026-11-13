import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/hood-data";

/** Live $HOOD snapshot (market, token, chain, transfers). Polled by the terminal UI. */
export async function GET() {
  const snap = await getSnapshot();
  return NextResponse.json(snap, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
