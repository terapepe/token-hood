import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/hood-data";

/** Live $HOOD snapshot for one network (?net=robinhood|solana|base|bsc, default main network). */
export async function GET(req: Request) {
  const snap = await getSnapshot(new URL(req.url).searchParams.get("net"));
  return NextResponse.json(snap, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
