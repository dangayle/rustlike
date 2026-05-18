/**
 * Rule: no-throw-in-result-returning-function
 *
 * Disallows `throw` statements inside functions that are annotated
 * to return Result<T, E>. This enforces the pattern of using
 * Err() for error cases instead of exceptions.
 */
import type { Rule } from "eslint";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow throw statements in functions returning Result",
      url: "https://github.com/dangayle/rustlike/blob/main/docs/eslint-rules/no-throw-in-result-returning-function.md",
    },
    messages: {
      noThrowInResult:
        "Do not throw in a function returning Result. Use Err() to return error values instead.",
    },
    schema: [],
  },
  create(context) {
    // Stack to track if we're inside a Result-returning function
    const resultFunctionStack: boolean[] = [];

    function hasResultReturnType(node: Rule.Node): boolean {
      // Check for explicit return type annotation containing "Result"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const castNode = node as any;
      let returnType: any;

      if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
        returnType = castNode.returnType;
      } else if (node.type === "ArrowFunctionExpression") {
        returnType = castNode.returnType;
      }

      if (!returnType) {
        return false;
      }

      // Get the source code of the return type annotation
      const typeText = context.sourceCode.getText(returnType);

      // Check if it contains "Result" or "AsyncResult"
      return /\b(?:Async)?Result\b/.test(typeText);
    }

    function enterFunction(node: Rule.Node): void {
      if (hasResultReturnType(node)) {
        resultFunctionStack.push(true);
      } else if (
        (node.type === "FunctionDeclaration" ||
          node.type === "FunctionExpression" ||
          node.type === "ArrowFunctionExpression") &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any).returnType !== undefined
      ) {
        // Has explicit non-Result return type — don't inherit parent context
        resultFunctionStack.push(false);
      } else {
        // No return type annotation — inherit parent context (e.g. callbacks)
        const parentIsResult = resultFunctionStack[resultFunctionStack.length - 1] === true;
        resultFunctionStack.push(parentIsResult);
      }
    }

    function exitFunction(): void {
      resultFunctionStack.pop();
    }

    function isInsideResultFunction(): boolean {
      return (
        resultFunctionStack.length > 0 &&
        resultFunctionStack[resultFunctionStack.length - 1] === true
      );
    }

    return {
      FunctionDeclaration: enterFunction,
      "FunctionDeclaration:exit": exitFunction,
      FunctionExpression: enterFunction,
      "FunctionExpression:exit": exitFunction,
      ArrowFunctionExpression: enterFunction,
      "ArrowFunctionExpression:exit": exitFunction,

      ThrowStatement(node) {
        if (isInsideResultFunction()) {
          context.report({
            node,
            messageId: "noThrowInResult",
          });
        }
      },
    };
  },
};

export default rule;
