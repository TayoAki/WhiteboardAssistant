import ts from "typescript";

/**
 * Structural checks used by tests/structure/entry-points.test.ts.
 *
 * They are intentionally conservative: a route handler passes only when its
 * body's FIRST statement is a direct, unconditional `requireUser()` call.
 * Anything that runs before it (a database call, a fetch, a response) or any
 * form that might not execute it (a conditional, a callback, a wrapper) is a
 * guardrail violation, because the canonical path in
 * docs/architecture/GUARDRAIL_MAP.md starts with the verified principal.
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

/** Strips `await`, parentheses, and type assertions so the underlying expression can be inspected. */
function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
    else if (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    else if (ts.isTypeAssertionExpression(e)) e = e.expression;
    else return e;
  }
}

/** True only for a direct `requireUser(...)` call (optionally awaited), never one nested in another expression. */
function isDirectRequireUserCall(expr: ts.Expression): boolean {
  const e = unwrap(expr);
  return ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "requireUser";
}

/**
 * Accepts exactly two first-statement shapes, both of which execute unconditionally:
 *   `await requireUser();`  or  `const user = await requireUser();` (destructuring allowed).
 * A call nested in a conditional, callback, function definition, array, or another call
 * is rejected, because it is not guaranteed to run before the rest of the handler.
 */
function firstStatementCallsRequireUserDirectly(first: ts.Statement): boolean {
  if (ts.isExpressionStatement(first)) return isDirectRequireUserCall(first.expression);
  if (ts.isVariableStatement(first)) {
    const [decl] = first.declarationList.declarations;
    return decl?.initializer !== undefined && isDirectRequireUserCall(decl.initializer);
  }
  return false;
}

function checkBody(handler: string, body: ts.ConciseBody | undefined): HandlerFinding {
  if (!body || !ts.isBlock(body)) {
    return { handler, ok: false, reason: "handler must have a block body whose first statement calls requireUser()" };
  }
  const first = body.statements[0];
  if (!first) return { handler, ok: false, reason: "handler body is empty" };
  if (firstStatementCallsRequireUserDirectly(first)) {
    return { handler, ok: true, reason: "requireUser() is called directly by the first statement" };
  }
  return {
    handler,
    ok: false,
    reason: `first statement is not a direct requireUser() call: ${first.getText().slice(0, 80)}`,
  };
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
