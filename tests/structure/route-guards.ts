import ts from "typescript";

/**
 * Structural checks used by tests/structure/entry-points.test.ts.
 *
 * They are intentionally conservative: a route handler passes only when its
 * body's FIRST statement calls `requireUser()`. Anything that runs before it
 * (a database call, a fetch, a response) is a guardrail violation, because the
 * canonical path in docs/architecture/GUARDRAIL_MAP.md starts with the verified
 * principal.
 */

export const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export type HandlerFinding = { handler: string; ok: boolean; reason: string };

/** True when a comment-and-whitespace-stripped source starts with `import "server-only"`. */
export function startsWithServerOnly(source: string): boolean {
  const withoutLeadingComments = source.replace(/^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*/, "");
  return /^import ["']server-only["'];?/.test(withoutLeadingComments);
}

function hasExportModifier(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    : false;
}

function containsCallTo(node: ts.Node, calleeName: string): boolean {
  let found = false;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === calleeName) {
      found = true;
      return;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

function checkBody(handler: string, body: ts.ConciseBody | undefined): HandlerFinding {
  if (!body || !ts.isBlock(body)) {
    return { handler, ok: false, reason: "handler must have a block body whose first statement calls requireUser()" };
  }
  const first = body.statements[0];
  if (!first) return { handler, ok: false, reason: "handler body is empty" };
  if (containsCallTo(first, "requireUser")) return { handler, ok: true, reason: "requireUser() is the first statement" };
  return { handler, ok: false, reason: `first statement does not call requireUser(): ${first.getText().slice(0, 80)}` };
}

/**
 * Finds every exported HTTP handler (`export async function GET()` or
 * `export const GET = async () => {}`) in a Next.js route file and reports
 * whether `requireUser()` runs before anything else.
 */
export function checkRouteHandlers(source: string, fileName = "route.ts"): HandlerFinding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const findings: HandlerFinding[] = [];
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && HTTP_METHODS.has(stmt.name.text) && hasExportModifier(stmt)) {
      findings.push(checkBody(stmt.name.text, stmt.body));
    }
    if (ts.isVariableStatement(stmt) && hasExportModifier(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !HTTP_METHODS.has(decl.name.text)) continue;
        const init = decl.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          findings.push(checkBody(decl.name.text, init.body));
        } else {
          findings.push({ handler: decl.name.text, ok: false, reason: "handler is not a plain function; wrap-free handlers are required" });
        }
      }
    }
  }
  return findings;
}
