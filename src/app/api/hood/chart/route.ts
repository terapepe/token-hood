import { NextResponse } from "next/server";
import { getCandles, type Timeframe } from "@/lib/hood-data";

const ALLOWED: Timeframe[] = ["15m", "1h", "4h", "1d"];

/** OHLCV candles for $HOOD from GeckoTerminal. ?tf=15m|1h|4h|1d&net=<network> */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("tf") as Timeframe;
  const tf = ALLOWED.includes(q) ? q : "1h";
  const data = await getCandles(tf, sp.get("net"));
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
