import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../no-object-spread-on-adt";
import { describe, it, afterAll } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run("no-object-spread-on-adt", rule, {
  valid: [
    // Regular object spread is fine
    "const obj = { ...otherObj };",
    // Regular function call spread is fine
    "const arr = [...array];",
    // Using Result methods properly
    "const value = result.unwrapOr(defaultValue);",
    "const mapped = result.map(x => x + 1);",
    // Using Option methods properly
    "const value = option.unwrapOr(fallback);",
    // Non-ADT function calls
    "const obj = { ...someFunction() };",
    "const obj = { ...getData() };",
  ],
  invalid: [
    // Spreading Ok()
    {
      code: "const obj = { ...Ok(5) };",
      errors: [{ messageId: "noSpreadOnAdt" }],
    },
    // Spreading Err()
    {
      code: 'const obj = { ...Err("error") };',
      errors: [{ messageId: "noSpreadOnAdt" }],
    },
    // Spreading Some()
    {
      code: "const obj = { ...Some(value) };",
      errors: [{ messageId: "noSpreadOnAdt" }],
    },
    // Spreading Result.ok()
    {
      code: "const obj = { ...Result.ok(5) };",
      errors: [{ messageId: "noSpreadOnAdt" }],
    },
    // Spreading Option.some()
    {
      code: "const obj = { ...Option.some(value) };",
      errors: [{ messageId: "noSpreadOnAdt" }],
    },
    // Object.assign with Ok()
    {
      code: "const obj = Object.assign({}, Ok(5));",
      errors: [{ messageId: "noAssignOnAdt" }],
    },
    // Object.assign with multiple ADTs
    {
      code: 'const obj = Object.assign({}, Ok(5), Err("e"));',
      errors: [{ messageId: "noAssignOnAdt" }, { messageId: "noAssignOnAdt" }],
    },
    // Object.assign with Some()
    {
      code: "const obj = Object.assign(target, Some(value));",
      errors: [{ messageId: "noAssignOnAdt" }],
    },
  ],
});
