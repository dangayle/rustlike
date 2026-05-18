/**
 * Rule: no-unwrap
 *
 * Bans .unwrap(), .unwrapErr(), and .expect() calls to enforce
 * explicit error handling via .match(), .unwrapOr(), etc.
 */
import type { Rule } from "eslint";

// Methods that can panic
const unwrapMethods = new Set(["unwrap", "unwrapErr", "expect"]);

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow .unwrap(), .unwrapErr(), and .expect() calls",
      url: "https://github.com/dangayle/rustlike/blob/main/docs/eslint-rules/no-unwrap.md",
    },
    messages: {
      noUnwrap:
        "Avoid .unwrap() - it can panic. Use .match(), .unwrapOr(), or .unwrapOrElse() instead.",
      noUnwrapErr:
        "Avoid .unwrapErr() - it can panic. Use .match() to handle both cases explicitly.",
      noExpect:
        "Avoid .expect() - it can panic. Use .match(), .unwrapOr(), or document why the invariant holds.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;

        // Check for method calls like result.unwrap()
        if (
          callee.type === "MemberExpression" &&
          callee.property.type === "Identifier" &&
          unwrapMethods.has(callee.property.name)
        ) {
          const methodName = callee.property.name;

          let messageId: string;
          switch (methodName) {
            case "unwrap":
              messageId = "noUnwrap";
              break;
            case "unwrapErr":
              messageId = "noUnwrapErr";
              break;
            case "expect":
              messageId = "noExpect";
              break;
            default:
              return;
          }

          context.report({
            node,
            messageId,
          });
        }
      },
    };
  },
};

export default rule;
