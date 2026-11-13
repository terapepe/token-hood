import { NextResponse } from "next/server";
import { checkAccess } from "@/lib/access";
import { HOOD_MIN_HOLD } from "@/lib/hood";
import { isAiConfigured } from "@/lib/ai";

/** Verifies the wallet signature and on-chain $HOOD balance before a run. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const a = await checkAccess(body);
  return NextResponse.json(
    { ok: a.ok, error: a.ok ? undefined : a.error, balance: a.balance ?? null, min: HOOD_MIN_HOLD, aiReady: isAiConfigured },
    { status: a.ok ? 200 : a.status },
  );
}
