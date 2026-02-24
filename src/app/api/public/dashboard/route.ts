import { NextRequest, NextResponse } from "next/server";

import { getDashboardPayload } from "@/lib/data";
import { dashboardRangeSchema } from "@/lib/validation";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rangeParam = req.nextUrl.searchParams.get("range") ?? undefined;
  const range = dashboardRangeSchema.parse(rangeParam);

  const payload = await getDashboardPayload(range);
  return NextResponse.json(payload);
}
