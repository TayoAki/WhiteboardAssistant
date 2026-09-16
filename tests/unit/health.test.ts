import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health (FR-070)", () => {
  it("returns status ok as JSON and forbids caching", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { status: string; time: string };
    expect(body.status).toBe("ok");
    expect(Number.isNaN(Date.parse(body.time))).toBe(false);
  });
});
