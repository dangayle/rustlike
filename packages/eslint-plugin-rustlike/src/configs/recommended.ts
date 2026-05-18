import type { Linter } from "eslint";

/**
 * Recommended rule set for eslint-plugin-rustlike.
 * Exported separately so the plugin can build flat configs with the plugin object.
 */
export const recommendedRules: Linter.RulesRecord = {
  "rustlike/no-object-spread-on-adt": "warn",
  "rustlike/prefer-match": "warn",
};

// Legacy-style config (kept for compatibility with non-flat consumers).
const config: Linter.LegacyConfig = {
  plugins: ["rustlike"],
  rules: recommendedRules,
};

export default config;
