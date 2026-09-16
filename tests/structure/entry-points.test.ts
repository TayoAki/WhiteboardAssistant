import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { checkRouteHandlers, startsWithServerOnly } from "./route-guards";

// Structural guardrail (AC-009, NFR-001): every API route handler runs requireUser() before
// anything else, or the file is a documented exception. Exceptions are listed here AND marked
// at the call site with a `guardrail-exception:` comment, so drift in either place fails CI.
// See docs/architecture/GUARDRAIL_MAP.md (entry-point inventory, exceptions).

const ROOT = process.cwd();
const API_DIR = join(ROOT, "src", "app", "api");
const SERVER_DIR = join(ROOT, "src", "server");

const ALLOW_LIST = new Set<string>([
  "src/app/api/health/route.ts", // Railway health check (FR-070)
  "src/app/api/webhooks/clerk/route.ts", // Svix-signed Clerk webhook (FR-004)
]);

/** Recursively lists files under `dir`; returns [] when the directory does not exist. */
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Repository-relative POSIX path, so allow-list entries match on every OS. */
const rel = (file: string) => relative(ROOT, file).split("\\").join("/");

describe("route-guard checker (fixtures)", () => {
  it("accepts a handler whose first statement awaits requireUser()", () => {
    const src = `import { requireUser } from "@/server/auth";
export async function GET() { const user = await requireUser(); return Response.json({ id: user.id }); }`;
    expect(checkRouteHandlers(src)).toEqual([{ handler: "GET", ok: true, reason: expect.any(String) }]);
  });

  it("accepts an exported arrow-function handler that starts with requireUser()", () => {
    const src = `export const POST = async (req: Request) => { const user = await requireUser(); return new Response(null); };`;
    expect(checkRouteHandlers(src)[0]).toMatchObject({ handler: "POST", ok: true });
  });

  it("rejects a side effect that runs before requireUser()", () => {
    const src = `export async function POST() { await db.insert(rows); const user = await requireUser(); return ok(); }`;
    expect(checkRouteHandlers(src)[0]).toMatchObject({ handler: "POST", ok: false });
  });

  it("rejects a handler that never calls requireUser()", () => {
    const src = `export async function DELETE() { return Response.json({ ok: true }); }`;
    expect(checkRouteHandlers(src)[0]).toMatchObject({ handler: "DELETE", ok: false });
  });

  it("accepts destructuring and a bare (non-awaited) direct call", () => {
    expect(checkRouteHandlers(`export async function GET() { const { id } = await requireUser(); return ok(id); }`)[0]).toMatchObject({ ok: true });
    expect(checkRouteHandlers(`export function GET() { requireUser(); return ok(); }`)[0]).toMatchObject({ ok: true });
  });

  it("rejects requireUser() nested in a conditional, callback, wrapper, array, or try block", () => {
    const shapes = [
      `export async function GET() { if (isAuthenticated) await requireUser(); await db.insert(rows); }`,
      `export async function GET() { const getUser = () => requireUser(); await db.insert(rows); }`,
      `export async function GET() { await withRetry(() => requireUser()); await db.insert(rows); }`,
      `export async function GET() { await Promise.all([requireUser()]); await db.insert(rows); }`,
      `export async function GET() { try { await requireUser(); } catch { /* swallowed */ } await db.insert(rows); }`,
      `export async function GET() { const user = cond ? await requireUser() : null; await db.insert(rows); }`,
    ];
    for (const src of shapes) {
      expect(checkRouteHandlers(src)[0], src).toMatchObject({ handler: "GET", ok: false });
    }
  });

  it("rejects expression-bodied and wrapped handlers, which it cannot verify", () => {
    expect(checkRouteHandlers(`export const GET = () => Response.json({});`)[0]).toMatchObject({ ok: false });
    expect(checkRouteHandlers(`export const GET = withSomething(async () => {});`)[0]).toMatchObject({ ok: false });
  });

  it("checks every exported HTTP method and ignores non-handler exports", () => {
    const src = `export const dynamic = "force-dynamic";
export async function GET() { await requireUser(); }
export async function PATCH() { doWork(); await requireUser(); }`;
    expect(checkRouteHandlers(src).map((f) => [f.handler, f.ok])).toEqual([["GET", true], ["PATCH", false]]);
  });

  it("requires server-only at the start of the file, allowing leading comments only", () => {
    expect(startsWithServerOnly(`import "server-only";\nexport const x = 1;`)).toBe(true);
    expect(startsWithServerOnly(`// license\n/* notes */\nimport 'server-only'\n`)).toBe(true);
    expect(startsWithServerOnly(`import { db } from "./db";\nimport "server-only";`)).toBe(false);
    expect(startsWithServerOnly(`export const x = 1;`)).toBe(false);
  });
});

describe("entry-point inventory: src/app/api/**/route.ts", () => {
  const routes = walk(API_DIR).filter((f) => /route\.tsx?$/.test(f));

  it("includes the health route", () => {
    expect(routes.map(rel)).toContain("src/app/api/health/route.ts");
  });

  it.each(routes.map((f) => [rel(f), f]))("%s runs requireUser() first or is a documented exception", (relPath, abs) => {
    const source = readFileSync(abs, "utf8");
    if (ALLOW_LIST.has(relPath)) {
      expect(source, `${relPath} is allow-listed and must carry a guardrail-exception comment`).toMatch(
        /guardrail-exception:/,
      );
      return;
    }
    const findings = checkRouteHandlers(source, relPath);
    expect(findings.length, `${relPath} exports no HTTP handler`).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.ok, `${relPath} ${f.handler}: ${f.reason}`).toBe(true);
    }
  });
});

describe("server modules: src/server/**", () => {
  const files = walk(SERVER_DIR).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

  if (files.length === 0) {
    it("has no server modules yet (S-2 introduces src/server)", () => {
      expect(files).toHaveLength(0);
    });
  } else {
    it.each(files.map((f) => [rel(f), f]))("%s starts with import \"server-only\"", (_relPath, abs) => {
      expect(startsWithServerOnly(readFileSync(abs, "utf8"))).toBe(true);
    });
  }
});
