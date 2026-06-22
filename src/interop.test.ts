import { describe, it, expect, vi } from "vitest";
import { Ok, Err, Some, None, type Result, type Option } from "./core";
import {
  tryCatch,
  tryAsync,
  safeCall,
  safeCallAsync,
  safeTry,
  intoThrowable,
  intoNullable,
  toThrowable,
  toNullable,
} from "./interop";

describe("tryCatch", () => {
  it("returns Ok for successful function", () => {
    const result = tryCatch(() => 42);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(42);
  });

  it("returns Err for throwing function", () => {
    const result = tryCatch(() => {
      throw new Error("test error");
    });
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(Error);
  });

  it("captures thrown error", () => {
    const error = new Error("specific error");
    const result = tryCatch(() => {
      throw error;
    });
    expect(result.unwrapErr()).toBe(error);
  });

  it("works with JSON.parse", () => {
    const validResult = tryCatch(() => JSON.parse('{"a":1}'));
    expect(validResult.isOk()).toBe(true);
    expect(validResult.unwrap()).toEqual({ a: 1 });

    const invalidResult = tryCatch(() => JSON.parse("invalid"));
    expect(invalidResult.isErr()).toBe(true);
  });

  it("handles non-Error throws", () => {
    const result = tryCatch(() => {
      throw "string error";
    });
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBe("string error");
  });

  it("preserves return type", () => {
    const result = tryCatch(() => ({ name: "test", value: 42 }));
    expect(result.unwrap()).toEqual({ name: "test", value: 42 });
  });
});

describe("tryAsync", () => {
  it("returns Ok for resolved promise", async () => {
    const result = await tryAsync(async () => 42);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBe(42);
  });

  it("returns Err for rejected promise", async () => {
    const result = await tryAsync(async () => {
      throw new Error("async error");
    });
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr()).toBeInstanceOf(Error);
  });

  it("returns Err for Promise.reject", async () => {
    const result = await tryAsync(() => Promise.reject(new Error("rejected")));
    expect(result.isErr()).toBe(true);
  });

  it("works with fetch-like operations", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ data: "test" });
    const result = await tryAsync(() => mockFetch("/api"));
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({ data: "test" });
  });

  it("handles async functions that throw synchronously", async () => {
    const result = await tryAsync(async () => {
      throw new Error("sync throw in async");
    });
    expect(result.isErr()).toBe(true);
  });

  it("preserves error type", async () => {
    class CustomError extends Error {
      code = "CUSTOM";
    }

    const result = await tryAsync<number, CustomError>(async () => {
      throw new CustomError("custom");
    });
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().code).toBe("CUSTOM");
  });
});

describe("safeCall", () => {
  it("creates Option-returning wrapper", () => {
    const safeParse = safeCall((s: string) => {
      const n = parseInt(s, 10);
      return isNaN(n) ? null : n;
    });

    expect(safeParse("42").unwrap()).toBe(42);
    expect(safeParse("invalid").isNone()).toBe(true);
  });

  it("wraps array find", () => {
    const users = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const safeFind = safeCall((id: number) => users.find((u) => u.id === id));

    expect(safeFind(1).unwrap()).toEqual({ id: 1, name: "Alice" });
    expect(safeFind(99).isNone()).toBe(true);
  });

  it("handles undefined return", () => {
    const safeGet = safeCall((obj: Record<string, string>, key: string) => obj[key]);

    const obj = { a: "1" };
    expect(safeGet(obj, "a").unwrap()).toBe("1");
    expect(safeGet(obj, "b").isNone()).toBe(true);
  });

  it("handles null return", () => {
    const safeMatch = safeCall((s: string) => s.match(/\d+/));

    expect(safeMatch("abc123").isSome()).toBe(true);
    expect(safeMatch("abc").isNone()).toBe(true);
  });

  it("returns None when wrapped function throws", () => {
    const safeBoom = safeCall(() => {
      throw new Error("boom");
    });
    expect(safeBoom().isNone()).toBe(true);
  });

  it("preserves multiple arguments", () => {
    const safeSlice = safeCall((arr: number[], start: number, end: number) => {
      const result = arr.slice(start, end);
      return result.length > 0 ? result : null;
    });

    expect(safeSlice([1, 2, 3], 0, 2).unwrap()).toEqual([1, 2]);
    expect(safeSlice([1, 2, 3], 5, 10).isNone()).toBe(true);
  });
});

describe("safeCallAsync", () => {
  it("returns Some for resolved non-null value", async () => {
    const safeFetch = safeCallAsync(async (id: number) => ({ id, name: "Alice" }));
    const result = await safeFetch(1);
    expect(result.isSome()).toBe(true);
    expect(result.unwrap()).toEqual({ id: 1, name: "Alice" });
  });

  it("returns None for null", async () => {
    const safeLookup = safeCallAsync(async (_id: number) => null as string | null);
    const result = await safeLookup(99);
    expect(result.isNone()).toBe(true);
  });

  it("returns None for undefined", async () => {
    const safeLookup = safeCallAsync(async (_id: number) => undefined as string | undefined);
    const result = await safeLookup(99);
    expect(result.isNone()).toBe(true);
  });

  it("returns None on rejection", async () => {
    const safeBoom = safeCallAsync(async () => {
      throw new Error("network error");
    });
    const result = await safeBoom();
    expect(result.isNone()).toBe(true);
  });

  it("preserves multiple arguments", async () => {
    const safeConcat = safeCallAsync(async (a: string, b: string) => {
      const result = a + b;
      return result.length > 0 ? result : null;
    });
    expect((await safeConcat("hello", " world")).unwrap()).toBe("hello world");
    expect((await safeConcat("", "")).isNone()).toBe(true);
  });
});

describe("safeTry", () => {
  it("creates Result-returning wrapper", () => {
    const safeJsonParse = safeTry(JSON.parse);

    expect(safeJsonParse('{"a":1}').unwrap()).toEqual({ a: 1 });
    expect(safeJsonParse("invalid").isErr()).toBe(true);
  });

  it("wraps throwing functions", () => {
    const divide = (a: number, b: number) => {
      if (b === 0) throw new Error("Division by zero");
      return a / b;
    };

    const safeDivide = safeTry(divide);

    expect(safeDivide(10, 2).unwrap()).toBe(5);
    expect(safeDivide(10, 0).isErr()).toBe(true);
  });

  it("captures error value", () => {
    const throwError = () => {
      throw new Error("specific message");
    };

    const safe = safeTry(throwError);
    const result = safe();

    expect(result.isErr()).toBe(true);
    expect((result.unwrapErr() as Error).message).toBe("specific message");
  });

  it("works with multiple arguments", () => {
    const riskyOperation = (a: string, b: number, c: boolean) => {
      if (!c) throw new Error("c must be true");
      return `${a}-${b}`;
    };

    const safe = safeTry(riskyOperation);

    expect(safe("test", 42, true).unwrap()).toBe("test-42");
    expect(safe("test", 42, false).isErr()).toBe(true);
  });

  it("handles functions that never throw", () => {
    const add = (a: number, b: number) => a + b;
    const safeAdd = safeTry(add);

    expect(safeAdd(1, 2).unwrap()).toBe(3);
    expect(safeAdd(-1, -2).unwrap()).toBe(-3);
  });

  it("typed error support", () => {
    class ValidationError extends Error {
      constructor(public field: string) {
        super(`Invalid ${field}`);
      }
    }

    const validate = (value: string) => {
      if (!value) throw new ValidationError("value");
      return value;
    };

    const safeValidate = safeTry<[string], string, ValidationError>(validate);
    const result = safeValidate("");

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().field).toBe("value");
  });

  it("returns Result<Promise> for async functions", async () => {
    const asyncFn = async () => 42;
    const safeAsync = safeTry(asyncFn);

    const result = safeAsync();
    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toBeInstanceOf(Promise);
    expect(await result.unwrap()).toBe(42);
  });
});

describe("intoThrowable", () => {
  it("returns value for Ok", () => {
    expect(intoThrowable(Ok(42))).toBe(42);
  });

  it("throws error for Err", () => {
    const error = new Error("test error");
    expect(() => intoThrowable(Err(error))).toThrow(error);
  });

  it("throws string errors as-is", () => {
    expect(() => intoThrowable(Err("string error"))).toThrow("string error");
  });

  it("throws custom object errors as-is", () => {
    const customError = { code: "CUSTOM", message: "custom" };
    expect(() => intoThrowable(Err(customError))).toThrow();
    try {
      intoThrowable(Err(customError));
    } catch (e) {
      expect(e).toBe(customError);
    }
  });

  it("preserves return type", () => {
    const result = Ok({ name: "test", value: 42 });
    expect(intoThrowable(result)).toEqual({ name: "test", value: 42 });
  });
});

describe("intoNullable", () => {
  it("returns value for Some", () => {
    expect(intoNullable(Some(42))).toBe(42);
  });

  it("returns null for None", () => {
    expect(intoNullable(None)).toBeNull();
  });

  it("returns null (not undefined) for None", () => {
    expect(intoNullable(None)).toBe(null);
    expect(intoNullable(None)).not.toBeUndefined();
  });

  it("preserves complex values", () => {
    expect(intoNullable(Some({ name: "test" }))).toEqual({ name: "test" });
  });
});

describe("toThrowable", () => {
  it("wraps a Result-returning function", () => {
    const safeDivide = (a: number, b: number): Result<number, string> =>
      b === 0 ? Err("division by zero") : Ok(a / b);

    const divide = toThrowable(safeDivide);
    expect(divide(10, 2)).toBe(5);
  });

  it("throws on Err result", () => {
    const safeDivide = (a: number, b: number): Result<number, string> =>
      b === 0 ? Err("division by zero") : Ok(a / b);

    const divide = toThrowable(safeDivide);
    expect(() => divide(10, 0)).toThrow("division by zero");
  });

  it("preserves all argument types", () => {
    const fn = (a: string, b: number, c: boolean): Result<string, string> =>
      c ? Ok(`${a}-${b}`) : Err("c must be true");

    const wrapped = toThrowable(fn);
    expect(wrapped("test", 42, true)).toBe("test-42");
    expect(() => wrapped("test", 42, false)).toThrow("c must be true");
  });

  it("preserves Error instances", () => {
    const error = new Error("specific error");
    const fn = (): Result<number, Error> => Err(error);

    const wrapped = toThrowable(fn);
    expect(() => wrapped()).toThrow(error);
  });
});

describe("toNullable", () => {
  it("wraps an Option-returning function", () => {
    const findUser = (id: number): Option<{ id: number; name: string }> =>
      id === 1 ? Some({ id: 1, name: "Alice" }) : None;

    const find = toNullable(findUser);
    expect(find(1)).toEqual({ id: 1, name: "Alice" });
  });

  it("returns null for None", () => {
    const findUser = (id: number): Option<{ id: number; name: string }> =>
      id === 1 ? Some({ id: 1, name: "Alice" }) : None;

    const find = toNullable(findUser);
    expect(find(99)).toBeNull();
  });

  it("preserves all argument types", () => {
    const fn = (arr: number[], idx: number): Option<number> => {
      const val = arr[idx];
      return val !== undefined ? Some(val) : None;
    };

    const wrapped = toNullable(fn);
    expect(wrapped([10, 20, 30], 1)).toBe(20);
    expect(wrapped([10, 20, 30], 99)).toBeNull();
  });
});
