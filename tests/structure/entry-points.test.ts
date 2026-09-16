import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Structural guardrail (AC-009, NFR-001): every API route handler is either guarded by
// requireUser() or is a documented exception. Exceptions are listed here AND marked at the
// call site with a `guardrail-exception:` comment, so drift in either place fails the build.
// See docs/architecture/GUARDRAIL_MAP.md (entry-point inventory, exceptions).

const ROOT = process.cwd();
const API_DIR = join(ROOT, "src", "app", "api");
const SERVER_DIR = join(ROOT, "src", "server");

const ALLOW_LIST = new Set<string>([
  "src/app/api/health/route.ts", // Railway health check (FR-070)
  "src/app/api/webhooks/clerk/route.ts", // Svix-signed Clerk webhook (FR-004)
]);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const rel = (file: string) => relative(ROOT, file).split("\\").join("/");

describe("entry-point inventory: src/app/api/**/route.ts", () => {
  const routes = walk(API_DIR).filter((f) => /route\.tsx?$/.test(f));

  it("includes the health route", () => {
    expect(routes.map(rel)).toContain("src/app/api/health/route.ts");
  });

  it.each(routes.map((f) => [rel(f), f]))("%s is guarded or a documented exception", (relPath, abs) => {
    const source = readFileSync(abs, "utf8");
    if (ALLOW_LIST.has(relPath)) {
      expect(source, `${relPath} is allow-listed and must carry a guardrail-exception comment`).toMatch(
        /guardrail-exception:/,
      );
      return;
    }
    expect(source, `${relPath} must call requireUser() from @/server/auth before any side effect`).toMatch(
      /\brequireUser\(/,
    );
  });
});

describe("server modules: src/server/**", () => {
  const files = walk(SERVER_DIR).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

  if (files.length === 0) {
    it("has no server modules yet (S-2 introduces src/server)", () => {
      expect(files).toHaveLength(0);
    });
  } else {
    it.each(files.map((f) => [rel(f), f]))("%s imports server-only", (_relPath, abs) => {
      expect(readFileSync(abs, "utf8")).toMatch(/^import ["']server-only["'];?/m);
    });
  }
});
