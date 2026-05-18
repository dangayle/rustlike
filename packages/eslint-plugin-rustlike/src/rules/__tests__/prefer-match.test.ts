import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../prefer-match";
import { describe, it, afterAll } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run("prefer-match", rule, {
  valid: [
    // Already using match - good!
    `result.match({ ok: (v) => v, err: (e) => fallback });`,

    // If without else - not a match candidate
    `if (result.isOk()) { doSomething(); }`,

    // Multi-statement branches - too complex for match
    `if (result.isOk()) {
      console.log('ok');
      return result.value;
    } else {
      console.log('err');
      return fallback;
    }`,

    // Else-if chain - not a simple match
    `if (result.isOk()) {
      return 1;
    } else if (otherCondition) {
      return 2;
    } else {
      return 3;
    }`,

    // Non-type-guard conditions
    `if (x > 5) return a; else return b;`,

    // Regular function call, not type guard
    `if (something.check()) return a; else return b;`,

    // Ternary with non-type-guard
    `return x > 5 ? a : b;`,

    // Ternary not in return/assignment context
    `const arr = [x.isOk() ? a : b, other];`,
  ],
  invalid: [
    // Simple if/else with return
    {
      code: `if (result.isOk()) return value; else return fallback;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Block form with single returns
    {
      code: `if (result.isOk()) { return value; } else { return fallback; }`,
      errors: [{ messageId: "preferMatch" }],
    },
    // isErr variant
    {
      code: `if (result.isErr()) return handleError(); else return result.value;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Option: isSome
    {
      code: `if (option.isSome()) return option.value; else return defaultVal;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Option: isNone
    {
      code: `if (option.isNone()) return fallback; else return option.value;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Ternary in return context
    {
      code: `return result.isOk() ? result.value : fallback;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Ternary in variable assignment
    {
      code: `const value = result.isOk() ? result.value : fallback;`,
      errors: [{ messageId: "preferMatch" }],
    },
    // Ternary in assignment expression
    {
      code: `value = result.isOk() ? result.value : fallback;`,
      errors: [{ messageId: "preferMatch" }],
    },
  ],
});
