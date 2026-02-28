import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: error.issues },
      { status: 400 }
    );
  }

  console.error("[api-error]", error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
