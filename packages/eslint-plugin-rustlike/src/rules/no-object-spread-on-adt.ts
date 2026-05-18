/**
 * Rule: no-object-spread-on-adt
 *
 * Warns when spreading or Object.assign is used on Result/Option ADT values,
 * which would strip the methods from the objects.
 */
import type { Rule } from "eslint";

// ADT constructor/factory names to detect
const adtNames = new Set(["Ok", "Err", "Some", "None", "Result", "Option"]);

function isAdtCall(node: Rule.Node): boolean {
  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (callee.type === "Identifier" && adtNames.has(callee.name)) {
      return true;
    }
    // Check for Result.ok(), Option.some(), etc.
    if (
      callee.type === "MemberExpression" &&
      callee.object.type === "Identifier" &&
      adtNames.has(callee.object.name)
    ) {
      return true;
    }
  }
  return false;
}

function getAdtName(node: Rule.Node): string {
  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (callee.type === "Identifier") {
      return callee.name;
    }
    if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
      return `${callee.object.name}.${callee.property.type === "Identifier" ? callee.property.name : "?"}`;
    }
  }
  return "ADT";
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow spreading or Object.assign on Result/Option values",
      url: "https://github.com/dangayle/rustlike/blob/main/docs/eslint-rules/no-object-spread-on-adt.md",
    },
    messages: {
      noSpreadOnAdt:
        "Spreading Result/Option values ({{ name }}) strips methods. Use .match() or other combinators instead.",
      noAssignOnAdt:
        "Object.assign on Result/Option values ({{ name }}) strips methods. Use .match() or other combinators instead.",
    },
    schema: [],
  },
  create(context) {
    return {
      // Detect { ...Ok(x) } or { ...someResultVar }
      SpreadElement(node) {
        const argument = node.argument;
        if (isAdtCall(argument as Rule.Node)) {
          context.report({
            node,
            messageId: "noSpreadOnAdt",
            data: { name: getAdtName(argument as Rule.Node) },
          });
        }
      },

      // Detect Object.assign({}, Ok(x))
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.object.type === "Identifier" &&
          callee.object.name === "Object" &&
          callee.property.type === "Identifier" &&
          callee.property.name === "assign"
        ) {
          // Check if any argument (except first) is an ADT call
          for (let i = 1; i < node.arguments.length; i++) {
            const arg = node.arguments[i];
            if (arg && isAdtCall(arg as Rule.Node)) {
              context.report({
                node: arg,
                messageId: "noAssignOnAdt",
                data: { name: getAdtName(arg as Rule.Node) },
              });
            }
          }
        }
      },
    };
  },
};

export default rule;
