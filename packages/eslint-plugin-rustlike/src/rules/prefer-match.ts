/**
 * Rule: prefer-match
 *
 * Suggests using .match() instead of if/else or ternary when both branches
 * handle Result/Option in a straightforward way.
 *
 * Only triggers on high-signal patterns:
 * - if (x.isOk()) return A; else return B;
 * - return x.isOk() ? A : B;
 * - Same for Option (isSome/isNone)
 */
import type { Rule } from "eslint";

// Method names that indicate Result/Option type guards
const typeGuardMethods = new Set(["isOk", "isErr", "isSome", "isNone"]);

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggest using .match() for simple if/else on Result/Option",
      url: "https://github.com/dangayle/rustlike/blob/main/docs/eslint-rules/prefer-match.md",
    },
    messages: {
      preferMatch: "Consider using .match() instead of if/else for cleaner Result/Option handling.",
    },
    schema: [],
  },
  create(context) {
    function isTypeGuardCall(node: Rule.Node): boolean {
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier" &&
        typeGuardMethods.has(node.callee.property.name)
      ) {
        return true;
      }
      return false;
    }

    function isSingleReturnStatement(node: Rule.Node): boolean {
      if (node.type === "ReturnStatement") {
        return true;
      }
      if (node.type === "BlockStatement" && node.body.length === 1) {
        return node.body[0]?.type === "ReturnStatement";
      }
      return false;
    }

    return {
      // Check if statements: if (x.isOk()) return A; else return B;
      IfStatement(node) {
        // Only trigger if:
        // 1. Test is a type guard call (isOk, isErr, isSome, isNone)
        // 2. Both consequent and alternate are single return statements
        // 3. There's no else-if chain
        if (!isTypeGuardCall(node.test as Rule.Node)) {
          return;
        }

        if (!node.alternate) {
          return; // No else branch
        }

        if (node.alternate.type === "IfStatement") {
          return; // else-if chain, too complex
        }

        if (!isSingleReturnStatement(node.consequent as Rule.Node)) {
          return;
        }

        if (!isSingleReturnStatement(node.alternate as Rule.Node)) {
          return;
        }

        context.report({
          node,
          messageId: "preferMatch",
        });
      },

      // Check ternaries: x.isOk() ? A : B
      ConditionalExpression(node) {
        if (!isTypeGuardCall(node.test as Rule.Node)) {
          return;
        }

        // Only suggest if this is a return or assignment context
        // (not deeply nested in other expressions)
        const parent = (node as Rule.Node).parent;
        if (
          parent?.type === "ReturnStatement" ||
          parent?.type === "VariableDeclarator" ||
          parent?.type === "AssignmentExpression"
        ) {
          context.report({
            node,
            messageId: "preferMatch",
          });
        }
      },
    };
  },
};

export default rule;
