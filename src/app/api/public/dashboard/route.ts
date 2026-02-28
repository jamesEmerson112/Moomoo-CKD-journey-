import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getDashboardPayload } from "@/lib/data";
import { dashboardRangeSchema } from "@/lib/validation";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const rangeParam = req.nextUrl.searchParams.get("range") ?? undefined;
    const range = dashboardRangeSchema.parse(rangeParam);

    const payload = await getDashboardPayload(range);
    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}
