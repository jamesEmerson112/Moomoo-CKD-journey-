import { NextResponse } from "next/server";

import { getCurrentAlerts } from "@/lib/data";

export async function GET(): Promise<NextResponse> {
  const alerts = await getCurrentAlerts();
  return NextResponse.json({ alerts });
}
