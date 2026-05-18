import type { Linter } from "eslint";
import { recommendedRules } from "./recommended";

/**
 * Strict rule set for eslint-plugin-rustlike (opt-in).
 * Extends recommended rules with stronger enforcement.
 */
export const strictRules = {
  ...recommendedRules,
  "rustlike/no-unwrap": "error",
  "rustlike/no-throw-in-result-returning-function": "error",
} satisfies Linter.RulesRecord;

// Legacy-style config (kept for compatibility with non-flat consumers).
const config: Linter.LegacyConfig = {
  plugins: ["rustlike"],
  rules: strictRules,
};

export default config;
