import { NextResponse } from "next/server";

// guardrail-exception: public health check for the Railway platform (FR-070).
// Returns status only and reads no user data. Documented as an explicit
// exception in docs/architecture/GUARDRAIL_MAP.md (entry-point inventory) and
// allow-listed in tests/structure/entry-points.test.ts.

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}
