import { NextRequest, NextResponse } from "next/server";

import { toContextEvents } from "@/lib/context";
import { listLogs } from "@/lib/data";
import { dateRangeQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;

  const parsed = dateRangeQuerySchema.parse({ from, to });
  const logs = await listLogs({ from: parsed.from, to: parsed.to, limit: 500 });
  const events = toContextEvents(logs);

  return NextResponse.json({ events });
}
