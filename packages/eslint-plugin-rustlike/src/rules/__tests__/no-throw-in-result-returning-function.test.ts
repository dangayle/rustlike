import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../no-throw-in-result-returning-function";
import { describe, it, afterAll } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run("no-throw-in-result-returning-function", rule, {
  valid: [
    // No return type annotation - allowed
    `function process(x) {
      if (!x) throw new Error("invalid");
      return x;
    }`,

    // Returns non-Result type - allowed
    `function process(x: number): number {
      if (x < 0) throw new Error("negative");
      return x;
    }`,

    // Returns Result but uses Err() instead of throw - good!
    `function divide(a: number, b: number): Result<number, string> {
      if (b === 0) return Err("division by zero");
      return Ok(a / b);
    }`,

    // Async function returning Promise<Result> without throw
    `async function fetchUser(id: string): Promise<Result<User, Error>> {
      const user = await db.find(id);
      if (!user) return Err(new Error("not found"));
      return Ok(user);
    }`,

    // Arrow function returning Result without throw
    `const parse = (s: string): Result<number, string> => {
      const n = parseInt(s, 10);
      if (isNaN(n)) return Err("not a number");
      return Ok(n);
    };`,

    // Throw in nested function that doesn't return Result
    `function outer(): Result<number, string> {
      function inner(): never {
        throw new Error("panic");
      }
      return Ok(42);
    }`,
  ],
  invalid: [
    // Function declaration with Result return type and throw
    {
      code: `function process(x: unknown): Result<Data, Error> {
        if (!x) throw new Error("invalid input");
        return Ok(x as Data);
      }`,
      errors: [{ messageId: "noThrowInResult" }],
    },
    // Arrow function with Result return type and throw
    {
      code: `const validate = (input: string): Result<ValidInput, string> => {
        if (input.length === 0) throw new Error("empty");
        return Ok(input as ValidInput);
      };`,
      errors: [{ messageId: "noThrowInResult" }],
    },
    // Function expression with Result return type and throw
    {
      code: `const parse = function(s: string): Result<number, string> {
        if (s === "") throw new Error("empty string");
        return Ok(parseInt(s, 10));
      };`,
      errors: [{ messageId: "noThrowInResult" }],
    },
    // Multiple throws
    {
      code: `function validate(x: unknown): Result<Valid, Error> {
        if (x === null) throw new Error("null");
        if (x === undefined) throw new Error("undefined");
        return Ok(x as Valid);
      }`,
      errors: [{ messageId: "noThrowInResult" }, { messageId: "noThrowInResult" }],
    },
    // Async function returning Promise<Result>
    {
      code: `async function fetchData(): Promise<Result<Data, Error>> {
        throw new Error("not implemented");
      }`,
      errors: [{ messageId: "noThrowInResult" }],
    },
  ],
});
