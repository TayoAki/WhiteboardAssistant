import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Layer rules from docs/architecture/GUARDRAIL_MAP.md ("Static and runtime guardrails").
// Each group names the modules that may only be imported from one layer.
const DB = {
  group: ["@/server/data/db", "@/server/data/db/*", "drizzle-orm", "drizzle-orm/*", "@neondatabase/*"],
  message:
    "Database access is only allowed inside src/server/data (scoped repositories). Call a repository instead.",
};
const CLERK = {
  group: ["@clerk/nextjs/server", "@clerk/backend", "@clerk/backend/*"],
  message:
    "Clerk's server SDK is only allowed in src/server/auth (requireUser) and the Clerk middleware file.",
};
const AI = {
  group: [
    "@copilotkit/runtime",
    "@copilotkit/runtime/*",
    "ai",
    "ai/*",
    "@ai-sdk/*",
    "@anthropic-ai/sdk",
    "@anthropic-ai/sdk/*",
  ],
  message: "AI runtime SDKs are only allowed in src/server/ai.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    ".artifacts/**",
    ".worktrees/**",
  ]),
  {
    name: "guardrails/default-layer-imports",
    files: ["src/**/*.{ts,tsx}"],
    rules: restrict(DB, CLERK, AI),
  },
  {
    name: "guardrails/data-layer-may-import-db",
    files: ["src/server/data/**/*.ts"],
    rules: restrict(CLERK, AI),
  },
  {
    name: "guardrails/auth-layer-may-import-clerk",
    files: ["src/server/auth/**/*.ts", "src/middleware.ts", "src/proxy.ts"],
    rules: restrict(DB, AI),
  },
  {
    name: "guardrails/ai-layer-may-import-ai-sdks",
    files: ["src/server/ai/**/*.ts"],
    rules: restrict(DB, CLERK),
  },
  {
    name: "guardrails/server-code-is-strictly-typed",
    files: ["src/server/**/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);

export default eslintConfig;
