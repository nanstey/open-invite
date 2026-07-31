import ts from 'typescript'

/**
 * Cyclomatic complexity per function, computed from the TypeScript AST.
 *
 * The counting rules mirror ESLint's built-in `complexity` rule so the numbers
 * line up with what developers already see from the linter: a function starts
 * at complexity 1 and gains 1 for each decision point (if, ternary, each
 * `case` with a test, for/for-in/for-of, while, do-while, catch, and the
 * logical operators `&&`, `||`, `??`).
 *
 * Complexity is computed independently of test coverage so it works on any
 * file, including ones no test ever imports (exactly the files that tend to
 * carry the highest change risk).
 */

/** @typedef {{ name: string, kind: string, startLine: number, endLine: number, complexity: number }} FunctionComplexity */

const SCRIPT_KIND_BY_EXT = {
  '.ts': ts.ScriptKind.TS,
  '.tsx': ts.ScriptKind.TSX,
  '.mts': ts.ScriptKind.TS,
  '.cts': ts.ScriptKind.TS,
  '.js': ts.ScriptKind.JS,
  '.jsx': ts.ScriptKind.JSX,
  '.mjs': ts.ScriptKind.JS,
  '.cjs': ts.ScriptKind.JS,
}

function scriptKindFor(fileName) {
  const match = /\.[^.]+$/.exec(fileName)
  return (match && SCRIPT_KIND_BY_EXT[match[0]]) ?? ts.ScriptKind.TS
}

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor,
])

function isFunctionNode(node) {
  return FUNCTION_KINDS.has(node.kind)
}

/** A decision point adds 1 to the enclosing function's complexity. */
function decisionCost(node) {
  switch (node.kind) {
    case ts.SyntaxKind.IfStatement:
    case ts.SyntaxKind.ConditionalExpression:
    case ts.SyntaxKind.ForStatement:
    case ts.SyntaxKind.ForInStatement:
    case ts.SyntaxKind.ForOfStatement:
    case ts.SyntaxKind.WhileStatement:
    case ts.SyntaxKind.DoStatement:
    case ts.SyntaxKind.CatchClause:
      return 1
    case ts.SyntaxKind.CaseClause:
      // `default:` (DefaultClause) is a separate kind and is not counted.
      return 1
    case ts.SyntaxKind.BinaryExpression: {
      const op = node.operatorToken.kind
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        return 1
      }
      return 0
    }
    default:
      return 0
  }
}

function describeName(node, sourceFile) {
  if (ts.isFunctionDeclaration(node)) {
    return node.name ? node.name.getText(sourceFile) : '<anonymous function>'
  }
  if (ts.isConstructorDeclaration(node)) {
    const cls = node.parent && ts.isClassLike(node.parent) && node.parent.name
    return cls ? `${node.parent.name.getText(sourceFile)}.constructor` : 'constructor'
  }
  if (ts.isMethodDeclaration(node) || ts.isGetAccessor(node) || ts.isSetAccessor(node)) {
    const memberName = node.name ? node.name.getText(sourceFile) : '<computed>'
    const cls = node.parent && ts.isClassLike(node.parent) && node.parent.name
    const prefix = ts.isGetAccessor(node) ? 'get ' : ts.isSetAccessor(node) ? 'set ' : ''
    return cls ? `${node.parent.name.getText(sourceFile)}.${prefix}${memberName}` : `${prefix}${memberName}`
  }

  // FunctionExpression / ArrowFunction: name comes from how it is bound.
  const parent = node.parent
  if (parent) {
    if (ts.isVariableDeclaration(parent) && parent.name) {
      return parent.name.getText(sourceFile)
    }
    if (ts.isPropertyAssignment(parent) && parent.name) {
      return parent.name.getText(sourceFile)
    }
    if (ts.isPropertyDeclaration(parent) && parent.name) {
      const cls = parent.parent && ts.isClassLike(parent.parent) && parent.parent.name
      const memberName = parent.name.getText(sourceFile)
      return cls ? `${parent.parent.name.getText(sourceFile)}.${memberName}` : memberName
    }
    if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return parent.left.getText(sourceFile)
    }
    if (
      (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
      ts.isPropertyAccessExpression(parent.expression)
    ) {
      // e.g. arr.map(x => ...) — label by the call it feeds.
      return `${parent.expression.name.getText(sourceFile)}() callback`
    }
    if (ts.isExportAssignment(parent)) {
      return 'default export'
    }
  }
  if (ts.isFunctionExpression(node) && node.name) {
    return node.name.getText(sourceFile)
  }
  return ts.isArrowFunction(node) ? '<arrow>' : '<anonymous function>'
}

function kindLabel(node) {
  switch (node.kind) {
    case ts.SyntaxKind.FunctionDeclaration:
    case ts.SyntaxKind.FunctionExpression:
      return 'function'
    case ts.SyntaxKind.ArrowFunction:
      return 'arrow'
    case ts.SyntaxKind.MethodDeclaration:
      return 'method'
    case ts.SyntaxKind.GetAccessor:
      return 'getter'
    case ts.SyntaxKind.SetAccessor:
      return 'setter'
    case ts.SyntaxKind.Constructor:
      return 'constructor'
    default:
      return 'function'
  }
}

/**
 * @param {string} sourceText
 * @param {string} fileName
 * @returns {FunctionComplexity[]}
 */
export function computeFunctionComplexities(sourceText, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileName),
  )

  /** @type {FunctionComplexity[]} */
  const results = []

  const lineOf = (pos) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1

  /**
   * Walk a function body, accumulating decision points. Nested functions are
   * NOT counted toward the enclosing function; instead each is visited as its
   * own function (matching ESLint's per-function scoping).
   */
  function visitFunction(fnNode) {
    let complexity = 1

    const walkBody = (node) => {
      complexity += decisionCost(node)
      ts.forEachChild(node, (child) => {
        if (isFunctionNode(child)) {
          visitFunction(child)
          return
        }
        walkBody(child)
      })
    }

    // Walk the function's own children (its parameters + body), but do not let
    // the function node itself be re-detected as nested.
    ts.forEachChild(fnNode, (child) => {
      if (isFunctionNode(child)) {
        visitFunction(child)
        return
      }
      walkBody(child)
    })

    results.push({
      name: describeName(fnNode, sourceFile),
      kind: kindLabel(fnNode),
      startLine: lineOf(fnNode.getStart(sourceFile)),
      endLine: lineOf(fnNode.getEnd()),
      complexity,
    })
  }

  const scan = (node) => {
    if (isFunctionNode(node)) {
      visitFunction(node)
      return
    }
    ts.forEachChild(node, scan)
  }

  scan(sourceFile)

  results.sort((a, b) => a.startLine - b.startLine)
  return results
}
