/**
 * eslint-plugin-rustlike
 *
 * ESLint rules to enforce Rust-like patterns when using the rustlike library.
 * Provides 'recommended' and 'strict' presets.
 */

import type { ESLint, Linter, Rule } from "eslint";
import { recommendedRules } from "./configs/recommended";
import { strictRules } from "./configs/strict";

import noObjectSpreadOnAdt from "./rules/no-object-spread-on-adt";
import preferMatch from "./rules/prefer-match";
import noUnwrap from "./rules/no-unwrap";
import noThrowInResultReturningFunction from "./rules/no-throw-in-result-returning-function";

const rules: Record<string, Rule.RuleModule> = {
  "no-object-spread-on-adt": noObjectSpreadOnAdt,
  "prefer-match": preferMatch,
  "no-unwrap": noUnwrap,
  "no-throw-in-result-returning-function": noThrowInResultReturningFunction,
};

const plugin: ESLint.Plugin = { rules };

const recommended: Linter.FlatConfig = {
  plugins: { rustlike: plugin },
  rules: recommendedRules,
};

const strict: Linter.FlatConfig = {
  plugins: { rustlike: plugin },
  rules: strictRules,
};

const configs: { recommended: Linter.FlatConfig; strict: Linter.FlatConfig } = {
  recommended,
  strict,
};

// Default export for ESLint plugin
export { rules, configs };
const exportedDefault: {
  rules: ESLint.Plugin["rules"];
  configs: { recommended: Linter.FlatConfig; strict: Linter.FlatConfig };
} = { rules: plugin.rules, configs };
export default exportedDefault;
