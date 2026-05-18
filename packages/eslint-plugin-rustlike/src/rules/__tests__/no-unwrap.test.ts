import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../no-unwrap";
import { describe, it, afterAll } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run("no-unwrap", rule, {
  valid: [
    // Using safe alternatives
    "const value = result.unwrapOr(defaultValue);",
    "const value = result.unwrapOrElse(() => fallback);",
    "result.match({ ok: (v) => v, err: (e) => handle(e) });",

    // Option safe alternatives
    "const value = option.unwrapOr(defaultValue);",
    "option.match({ some: (v) => v, none: () => fallback });",

    // Property access (not method call)
    "const fn = result.unwrap;",

    // Note: We intentionally flag ALL .unwrap()/.expect() calls since we can't
    // determine types at the AST level. Users should disable per-line if needed.
  ],
  invalid: [
    // Result.unwrap()
    {
      code: "const value = result.unwrap();",
      errors: [{ messageId: "noUnwrap" }],
    },
    // Result.unwrapErr()
    {
      code: "const error = result.unwrapErr();",
      errors: [{ messageId: "noUnwrapErr" }],
    },
    // Result.expect()
    {
      code: 'const value = result.expect("should exist");',
      errors: [{ messageId: "noExpect" }],
    },
    // Option.unwrap()
    {
      code: "const value = option.unwrap();",
      errors: [{ messageId: "noUnwrap" }],
    },
    // Option.expect()
    {
      code: 'const config = loadConfig().expect("config required");',
      errors: [{ messageId: "noExpect" }],
    },
    // Chained unwrap
    {
      code: "const value = getData().map(x => x.id).unwrap();",
      errors: [{ messageId: "noUnwrap" }],
    },
    // Multiple unwraps
    {
      code: `
        const a = result1.unwrap();
        const b = result2.expect("must exist");
      `,
      errors: [{ messageId: "noUnwrap" }, { messageId: "noExpect" }],
    },
  ],
});
