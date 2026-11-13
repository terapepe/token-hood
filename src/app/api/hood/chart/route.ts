import { NextResponse } from "next/server";
import { getCandles, type Timeframe } from "@/lib/hood-data";

const ALLOWED: Timeframe[] = ["15m", "1h", "4h", "1d"];

/** OHLCV candles for $HOOD from GeckoTerminal. ?tf=15m|1h|4h|1d */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("tf") as Timeframe;
  const tf = ALLOWED.includes(q) ? q : "1h";
  const data = await getCandles(tf);
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
