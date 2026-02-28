import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getRecentIssues } from "@/lib/data";
import { recentIssuesQuerySchema } from "@/lib/validation";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const parsed = recentIssuesQuerySchema.parse({
      range: req.nextUrl.searchParams.get("range") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined
    });

    const days = 7;
    const issues = await getRecentIssues({
      days,
      limit: parsed.limit
    });

    return NextResponse.json(issues);
  } catch (error) {
    return handleApiError(error);
  }
}
