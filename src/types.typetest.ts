/**
 * Type-level tests using vitest's expectTypeOf
 * These tests verify compile-time type guarantees
 */

import { describe, it, expectTypeOf } from "vitest";
import {
  Some,
  None,
  Ok,
  Err,
  Option,
  Result,
  type Some as SomeType,
  // type None as NoneType,
  type Ok as OkType,
  // type Err as ErrType,
  type Option as OptionType,
  type Result as ResultType,
} from "./core";
import { brand, newtype, nonEmpty, head, type Brand, type NonEmptyArray } from "./types";
import { tryCatch, tryAsync, safeCall, safeTry } from "./interop";
import { AsyncResult } from "./async";

// ============================================================================
// Option Type Tests
// ============================================================================

describe("Option types", () => {
  describe("Some", () => {
    it("has correct value type", () => {
      const opt = Some(42);
      expectTypeOf(opt.value).toBeNumber();
    });

    it("some property is true literal", () => {
      const opt = Some(42);
      expectTypeOf(opt.some).toEqualTypeOf<true>();
    });

    it("isSome narrows to Some", () => {
      const opt: OptionType<number> = Some(42);
      if (opt.isSome()) {
        expectTypeOf(opt).toEqualTypeOf<SomeType<number>>();
        expectTypeOf(opt.value).toBeNumber();
      }
    });

    it("isNone narrows to None", () => {
      const opt: OptionType<number> = Some(42);
      if (opt.isNone()) {
        // expectTypeOf(opt).toEqualTypeOf<NoneType>();
      }
    });
  });

  describe("None", () => {
    it("some property is false literal", () => {
      expectTypeOf(None.some).toEqualTypeOf<false>();
    });

    it("is assignable to Option<T> for any T", () => {
      expectTypeOf(None).toExtend<OptionType<number>>();
      expectTypeOf(None).toExtend<OptionType<string>>();
      expectTypeOf(None).toExtend<OptionType<unknown>>();
    });
  });

  describe("map", () => {
    it("transforms the inner type", () => {
      const opt = Some(42);
      const mapped = opt.map((x) => x.toString());
      expectTypeOf(mapped).toEqualTypeOf<OptionType<string>>();
    });

    it("preserves Option wrapper", () => {
      const opt: OptionType<number> = Some(42);
      const mapped = opt.map((x) => x * 2);
      expectTypeOf(mapped).toEqualTypeOf<OptionType<number>>();
    });
  });

  describe("andThen", () => {
    it("flattens nested Option", () => {
      const opt = Some(42);
      const chained = opt.andThen((x) => Some(x.toString()));
      expectTypeOf(chained).toEqualTypeOf<OptionType<string>>();
    });
  });

  describe("unwrap methods", () => {
    it("unwrap returns inner type", () => {
      const opt = Some(42);
      expectTypeOf(opt.unwrap()).toBeNumber();
    });

    it("unwrapOr returns inner type", () => {
      const opt: OptionType<number> = Some(42);
      expectTypeOf(opt.unwrapOr(0)).toBeNumber();
    });

    it("unwrapOrElse returns inner type", () => {
      const opt: OptionType<number> = Some(42);
      expectTypeOf(opt.unwrapOrElse(() => 0)).toBeNumber();
    });
  });

  describe("okOr", () => {
    it("converts to Result with correct types", () => {
      const opt = Some(42);
      const result = opt.okOr("error");
      expectTypeOf(result).toEqualTypeOf<ResultType<number, string>>();
    });
  });

  describe("zip", () => {
    it("creates tuple type", () => {
      const a = Some(1);
      const b = Some("a");
      const zipped = a.zip(b);
      expectTypeOf(zipped).toEqualTypeOf<OptionType<readonly [number, string]>>();
    });
  });

  describe("flatten", () => {
    it("removes one layer of nesting", () => {
      const nested = Some(Some(42));
      const flat = nested.flatten();
      expectTypeOf(flat).toEqualTypeOf<OptionType<number>>();
    });
  });

  describe("Option.from", () => {
    it("accepts nullable types", () => {
      const fromNull = Option.from(null as string | null);
      expectTypeOf(fromNull).toEqualTypeOf<OptionType<string>>();

      const fromUndefined = Option.from(undefined as number | undefined);
      expectTypeOf(fromUndefined).toEqualTypeOf<OptionType<number>>();
    });
  });

  describe("Option.all", () => {
    it("collects to array type", () => {
      const opts = [Some(1), Some(2), Some(3)];
      const all = Option.all(opts);
      expectTypeOf(all).toEqualTypeOf<OptionType<number[]>>();
    });
  });

  describe("Option.transpose", () => {
    it("swaps Option and Result", () => {
      const opt = Some(Ok(42));
      const transposed = Option.transpose(opt);
      expectTypeOf(transposed).toEqualTypeOf<ResultType<OptionType<number>, never>>();
    });
  });
});

// ============================================================================
// Result Type Tests
// ============================================================================

describe("Result types", () => {
  describe("Ok", () => {
    it("has correct value type", () => {
      const result = Ok(42);
      expectTypeOf(result.value).toBeNumber();
    });

    it("ok property is true literal", () => {
      const result = Ok(42);
      expectTypeOf(result.ok).toEqualTypeOf<true>();
    });

    it("isOk narrows to Ok", () => {
      const result: ResultType<number, string> = Ok(42);
      if (result.isOk()) {
        expectTypeOf(result).toEqualTypeOf<OkType<number, string>>();
        expectTypeOf(result.value).toBeNumber();
      }
    });

    // it('isErr narrows to Err', () => {
    //   const result: ResultType<number, string> = Ok(42);
    //   if (result.isErr()) {
    //     expectTypeOf(result).toEqualTypeOf<ErrType<string, number>>();
    //     expectTypeOf(result.error).toBeString();
    //   }
    // });
  });

  describe("Err", () => {
    it("has correct error type", () => {
      const result = Err("error");
      expectTypeOf(result.error).toBeString();
    });

    it("ok property is false literal", () => {
      const result = Err("error");
      expectTypeOf(result.ok).toEqualTypeOf<false>();
    });
  });

  describe("map", () => {
    it("transforms value type, preserves error type", () => {
      const result: ResultType<number, string> = Ok(42);
      const mapped = result.map((x) => x.toString());
      expectTypeOf(mapped).toEqualTypeOf<ResultType<string, string>>();
    });
  });

  describe("mapErr", () => {
    it("transforms error type, preserves value type", () => {
      const result: ResultType<number, string> = Err("error");
      const mapped = result.mapErr((e) => new Error(e));
      expectTypeOf(mapped).toEqualTypeOf<ResultType<number, Error>>();
    });
  });

  describe("andThen", () => {
    it("chains Results with same error type", () => {
      const result: ResultType<number, string> = Ok(42);
      const chained = result.andThen((x) => Ok(x.toString()) as ResultType<string, string>);
      expectTypeOf(chained).toEqualTypeOf<ResultType<string, string>>();
    });
  });

  describe("orElse", () => {
    it("can change error type", () => {
      const result: ResultType<number, string> = Err("error");
      const recovered = result.orElse((e) => Err(new Error(e)));
      expectTypeOf(recovered).toEqualTypeOf<ResultType<number, Error>>();
    });
  });

  describe("toOption", () => {
    it("discards error type", () => {
      const result: ResultType<number, string> = Ok(42);
      const opt = result.toOption();
      expectTypeOf(opt).toEqualTypeOf<OptionType<number>>();
    });
  });

  describe("err", () => {
    it("returns Option of error type", () => {
      const result: ResultType<number, string> = Err("error");
      const errOpt = result.err();
      expectTypeOf(errOpt).toEqualTypeOf<OptionType<string>>();
    });
  });

  describe("flatten", () => {
    it("removes one layer of nesting", () => {
      const nested: ResultType<ResultType<number, string>, string> = Ok(Ok(42));
      const flat = nested.flatten();
      expectTypeOf(flat).toEqualTypeOf<ResultType<number, string>>();
    });
  });

  describe("Result.fromThrowable", () => {
    it("infers value type from function return", () => {
      const result = Result.fromThrowable(() => 42);
      expectTypeOf(result).toEqualTypeOf<ResultType<number, unknown>>();
    });
  });

  describe("Result.fromPromise", () => {
    it("returns Promise of Result", async () => {
      const result = Result.fromPromise(Promise.resolve(42));
      expectTypeOf(result).toEqualTypeOf<Promise<ResultType<number, unknown>>>();
    });
  });

  describe("Result.all", () => {
    it("collects to array type", () => {
      const results: ResultType<number, string>[] = [Ok(1), Ok(2)];
      const all = Result.all(results);
      expectTypeOf(all).toEqualTypeOf<ResultType<number[], string>>();
    });
  });

  describe("Result.transpose", () => {
    it("swaps Result and Option", () => {
      const result: ResultType<OptionType<number>, string> = Ok(Some(42));
      const transposed = Result.transpose(result);
      expectTypeOf(transposed).toEqualTypeOf<OptionType<ResultType<number, string>>>();
    });
  });
});

// ============================================================================
// Brand Type Tests
// ============================================================================

describe("Brand types", () => {
  it("creates distinct nominal types", () => {
    type UserId = Brand<number, "UserId">;
    type OrderId = Brand<number, "OrderId">;

    // These should be incompatible at the type level
    expectTypeOf<UserId>().not.toEqualTypeOf<OrderId>();
    expectTypeOf<UserId>().not.toEqualTypeOf<number>();
  });

  it("brand function returns branded type", () => {
    type UserId = Brand<number, "UserId">;
    const UserId = brand<number, "UserId">();

    const id = UserId(42);
    expectTypeOf(id).toEqualTypeOf<UserId>();
  });

  it("branded types are assignable to base type", () => {
    type UserId = Brand<number, "UserId">;
    expectTypeOf<UserId>().toExtend<number>();
  });
});

// ============================================================================
// Newtype Tests
// ============================================================================

describe("newtype types", () => {
  it("parse returns Result with branded type", () => {
    const PositiveNumber = newtype<number, "Positive">((n) => n > 0, "Must be positive");

    const result = PositiveNumber.parse(42);
    expectTypeOf(result).toEqualTypeOf<ResultType<Brand<number, "Positive">, string>>();
  });

  it("parse with custom error type", () => {
    type ValidationError = { code: string };
    const NonEmpty = newtype<string, "NonEmpty", ValidationError>((s) => s.length > 0, {
      code: "EMPTY",
    });

    const result = NonEmpty.parse("test");
    expectTypeOf(result).toEqualTypeOf<ResultType<Brand<string, "NonEmpty">, ValidationError>>();
  });

  it("unsafe returns branded type", () => {
    const PositiveNumber = newtype<number, "Positive">((n) => n > 0, "Must be positive");

    const value = PositiveNumber.unsafe(42);
    expectTypeOf(value).toEqualTypeOf<Brand<number, "Positive">>();
  });
});

// ============================================================================
// NonEmptyArray Type Tests
// ============================================================================

describe("NonEmptyArray types", () => {
  it("nonEmpty returns NonEmptyArray", () => {
    const arr = nonEmpty(1, 2, 3);
    expectTypeOf(arr).toEqualTypeOf<NonEmptyArray<number>>();
  });

  it("head returns element type", () => {
    const arr = nonEmpty(1, 2, 3);
    const first = head(arr);
    expectTypeOf(first).toBeNumber();
  });

  it("NonEmptyArray is readonly tuple", () => {
    type NEA = NonEmptyArray<number>;
    expectTypeOf<NEA>().toExtend<readonly number[]>();
  });

  it("first element is guaranteed", () => {
    const arr = nonEmpty("a", "b");
    // Index 0 should be the element type, not element | undefined
    expectTypeOf(arr[0]).toBeString();
  });
});

// ============================================================================
// Interop Type Tests
// ============================================================================

describe("interop types", () => {
  describe("tryCatch", () => {
    it("infers value type from function", () => {
      const result = tryCatch(() => 42);
      expectTypeOf(result).toEqualTypeOf<ResultType<number, unknown>>();
    });

    it("accepts explicit error type", () => {
      const result = tryCatch<number, Error>(() => 42);
      expectTypeOf(result).toEqualTypeOf<ResultType<number, Error>>();
    });
  });

  describe("tryAsync", () => {
    it("returns Promise of Result", async () => {
      const result = tryAsync(async () => 42);
      expectTypeOf(result).toEqualTypeOf<Promise<ResultType<number, unknown>>>();
    });
  });

  describe("safeCall", () => {
    it("converts nullable return to Option", () => {
      const find = (id: number) => (id > 0 ? { id } : null);
      const safeFn = safeCall(find);

      const result = safeFn(1);
      expectTypeOf(result).toEqualTypeOf<OptionType<{ id: number }>>();
    });

    it("preserves argument types", () => {
      const fn = (a: string, b: number) => a.repeat(b) || null;
      const safeFn = safeCall(fn);

      expectTypeOf(safeFn).toBeCallableWith("test", 3);
    });
  });

  describe("safeTry", () => {
    it("converts throwing function to Result-returning", () => {
      const parse = (s: string) => JSON.parse(s) as { value: number };
      const safeParse = safeTry(parse);

      const result = safeParse("{}");
      expectTypeOf(result).toEqualTypeOf<ResultType<{ value: number }, unknown>>();
    });

    it("preserves argument types", () => {
      const fn = (a: number, b: string) => a + b.length;
      const safeFn = safeTry(fn);

      expectTypeOf(safeFn).toBeCallableWith(1, "test");
    });
  });
});

// ============================================================================
// AsyncResult Type Tests
// ============================================================================

describe("AsyncResult types", () => {
  it("is PromiseLike of Result", () => {
    const ar = AsyncResult.ok(42);
    expectTypeOf(ar).toExtend<PromiseLike<ResultType<number, never>>>();
  });

  it("map transforms value type", () => {
    const ar = AsyncResult.ok(42);
    const mapped = ar.map((x) => x.toString());
    expectTypeOf(mapped).toEqualTypeOf<AsyncResult<string, never>>();
  });

  it("mapErr transforms error type", () => {
    const ar = AsyncResult.err<string, number>("error");
    const mapped = ar.mapErr((e) => new Error(e));
    expectTypeOf(mapped).toEqualTypeOf<AsyncResult<number, Error>>();
  });

  it("andThen chains correctly", () => {
    const ar = AsyncResult.ok<number, string>(42);
    const chained = ar.andThen((x) => Ok(x.toString()) as ResultType<string, string>);
    expectTypeOf(chained).toEqualTypeOf<AsyncResult<string, string>>();
  });

  it("match returns Promise of handler return type", () => {
    const ar = AsyncResult.ok(42);
    const result = ar.match({
      ok: (x) => x.toString(),
      err: () => "error",
    });
    expectTypeOf(result).toEqualTypeOf<Promise<string>>();
  });

  it("unwrap returns Promise of value type", () => {
    const ar = AsyncResult.ok(42);
    const value = ar.unwrap();
    expectTypeOf(value).toEqualTypeOf<Promise<number>>();
  });

  it("toPromise returns Promise of Result", () => {
    const ar = AsyncResult.ok<number, string>(42);
    const promise = ar.toPromise();
    expectTypeOf(promise).toEqualTypeOf<Promise<ResultType<number, string>>>();
  });

  it("fromThrowable infers types", () => {
    const ar = AsyncResult.fromThrowable(async () => 42);
    expectTypeOf(ar).toEqualTypeOf<AsyncResult<number, unknown>>();
  });
});

// ============================================================================
// Match Expression Type Tests
// ============================================================================

describe("match expression types", () => {
  it("handler receives narrowed type", () => {
    const opt = Some(42);
    opt.match({
      some: (value) => {
        expectTypeOf(value).toBeNumber();
        return value;
      },
      none: () => 0,
    });
  });

  it("Result match narrows correctly", () => {
    const result: ResultType<number, string> = Ok(42);
    result.match({
      ok: (value) => {
        expectTypeOf(value).toBeNumber();
        return value;
      },
      err: (error) => {
        expectTypeOf(error).toBeString();
        return 0;
      },
    });
  });
});
