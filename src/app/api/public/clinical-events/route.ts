import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { listClinicalEvents } from "@/lib/data";
import { dateRangeQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;

    const parsed = dateRangeQuerySchema.parse({ from, to });
    const events = await listClinicalEvents({ from: parsed.from, to: parsed.to, limit: 365 });

    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error);
  }
}
