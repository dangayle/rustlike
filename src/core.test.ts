import { describe, it, expect, vi } from "vitest";
import { Some, None, Ok, Err, Option, Result, isSome, isNone, isOk, isErr } from "./core";

// ============================================================================
// Option Tests
// ============================================================================

describe("Option", () => {
  describe("Some", () => {
    it("creates a Some value", () => {
      const opt = Some(42);
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe(42);
    });

    it("isSome returns true", () => {
      const opt = Some(42);
      expect(opt.isSome()).toBe(true);
    });

    it("isNone returns false", () => {
      const opt = Some(42);
      expect(opt.isNone()).toBe(false);
    });
  });

  describe("None", () => {
    it("is a singleton", () => {
      expect(None.isNone()).toBe(true);
    });

    it("is frozen (immutable)", () => {
      expect(Object.isFrozen(None)).toBe(true);
    });

    it("isSome returns false", () => {
      expect(None.isSome()).toBe(false);
    });

    it("isNone returns true", () => {
      expect(None.isNone()).toBe(true);
    });
  });

  describe("map", () => {
    it("transforms Some value", () => {
      const opt = Some(2).map((x) => x * 2);
      expect(opt.unwrap()).toBe(4);
    });

    it("returns None for None", () => {
      const opt = None.map((x: number) => x * 2);
      expect(opt.isNone()).toBe(true);
    });
  });

  describe("andThen", () => {
    it("chains Some values", () => {
      const opt = Some(2).andThen((x) => Some(x * 2));
      expect(opt.unwrap()).toBe(4);
    });

    it("short-circuits on None", () => {
      const opt = Some(2).andThen(() => None);
      expect(opt.isNone()).toBe(true);
    });

    it("returns None when called on None", () => {
      const opt = None.andThen((x: number) => Some(x * 2));
      expect(opt.isNone()).toBe(true);
    });
  });

  describe("or", () => {
    it("returns self when Some", () => {
      const opt = Some(1).or(Some(2));
      expect(opt.unwrap()).toBe(1);
    });

    it("returns other when None", () => {
      const opt = None.or(Some(2));
      expect(opt.unwrap()).toBe(2);
    });
  });

  describe("orElse", () => {
    it("returns self when Some", () => {
      const fn = vi.fn(() => Some(2));
      const opt = Some(1).orElse(fn);
      expect(opt.unwrap()).toBe(1);
      expect(fn).not.toHaveBeenCalled();
    });

    it("returns computed value when None", () => {
      const opt = None.orElse(() => Some(2));
      expect(opt.unwrap()).toBe(2);
    });
  });

  describe("filter", () => {
    it("returns Some when predicate passes", () => {
      const opt = Some(4).filter((x) => x > 2);
      expect(opt.unwrap()).toBe(4);
    });

    it("returns None when predicate fails", () => {
      const opt = Some(1).filter((x) => x > 2);
      expect(opt.isNone()).toBe(true);
    });

    it("returns None when called on None", () => {
      const opt = None.filter(() => true);
      expect(opt.isNone()).toBe(true);
    });
  });

  describe("unwrap", () => {
    it("returns value for Some", () => {
      expect(Some(42).unwrap()).toBe(42);
    });

    it("throws for None", () => {
      expect(() => None.unwrap()).toThrow("Called unwrap on None");
    });
  });

  describe("unwrapOr", () => {
    it("returns value for Some", () => {
      expect(Some(42).unwrapOr(0)).toBe(42);
    });

    it("returns default for None", () => {
      expect(None.unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse", () => {
    it("returns value for Some", () => {
      const fn = vi.fn(() => 0);
      expect(Some(42).unwrapOrElse(fn)).toBe(42);
      expect(fn).not.toHaveBeenCalled();
    });

    it("computes default for None", () => {
      expect(None.unwrapOrElse(() => 0)).toBe(0);
    });
  });

  describe("expect", () => {
    it("returns value for Some", () => {
      expect(Some(42).expect("should exist")).toBe(42);
    });

    it("throws with message for None", () => {
      expect(() => None.expect("value required")).toThrow("value required");
    });
  });

  describe("match", () => {
    it("calls some handler for Some", () => {
      const result = Some(42).match({
        some: (x) => x * 2,
        none: () => 0,
      });
      expect(result).toBe(84);
    });

    it("calls none handler for None", () => {
      const result = None.match({
        some: (x: number) => x * 2,
        none: () => 0,
      });
      expect(result).toBe(0);
    });
  });

  describe("okOr", () => {
    it("converts Some to Ok", () => {
      const result = Some(42).okOr("error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("converts None to Err", () => {
      const result = None.okOr("error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("zip", () => {
    it("zips two Some values", () => {
      const result = Some(1).zip(Some("a"));
      expect(result.unwrap()).toEqual([1, "a"]);
    });

    it("returns None if first is None", () => {
      const result = None.zip(Some("a"));
      expect(result.isNone()).toBe(true);
    });

    it("returns None if second is None", () => {
      const result = Some(1).zip(None);
      expect(result.isNone()).toBe(true);
    });
  });

  describe("flatten", () => {
    it("flattens nested Some", () => {
      const nested = Some(Some(42));
      expect(nested.flatten().unwrap()).toBe(42);
    });

    it("flattens Some(None) to None", () => {
      const nested = Some(None);
      expect(nested.flatten().isNone()).toBe(true);
    });

    it("returns None for None", () => {
      const opt: Option<Option<number>> = None;
      expect(opt.flatten().isNone()).toBe(true);
    });
  });

  describe("inspect", () => {
    it("calls function for Some", () => {
      const fn = vi.fn();
      const opt = Some(42).inspect(fn);
      expect(fn).toHaveBeenCalledWith(42);
      expect(opt.unwrap()).toBe(42);
    });

    it("does not call function for None", () => {
      const fn = vi.fn();
      None.inspect(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("mapOr", () => {
    it("maps Some value", () => {
      expect(Some(2).mapOr(0, (x) => x * 2)).toBe(4);
    });

    it("returns default for None", () => {
      expect(None.mapOr(0, (x: number) => x * 2)).toBe(0);
    });
  });

  describe("mapOrElse", () => {
    it("maps Some value", () => {
      expect(
        Some(2).mapOrElse(
          () => 0,
          (x) => x * 2,
        ),
      ).toBe(4);
    });

    it("calls default fn for None", () => {
      expect(
        None.mapOrElse(
          () => 42,
          (x: number) => x * 2,
        ),
      ).toBe(42);
    });
  });

  describe("and", () => {
    it("returns other when Some", () => {
      expect(Some(2).and(Some("hello")).unwrap()).toBe("hello");
    });

    it("returns None when self is None", () => {
      expect(None.and(Some("hello")).isNone()).toBe(true);
    });

    it("returns None when other is None", () => {
      expect(Some(2).and(None).isNone()).toBe(true);
    });
  });

  describe("contains", () => {
    it("returns true when Some contains value", () => {
      expect(Some(42).contains(42)).toBe(true);
    });

    it("returns false when Some has different value", () => {
      expect(Some(42).contains(0)).toBe(false);
    });

    it("returns false for None", () => {
      expect(None.contains(42)).toBe(false);
    });
  });

  describe("xor", () => {
    it("returns Some when exactly one is Some (self)", () => {
      expect(Some(1).xor(None).unwrap()).toBe(1);
    });

    it("returns Some when exactly one is Some (other)", () => {
      expect(None.xor(Some(2)).unwrap()).toBe(2);
    });

    it("returns None when both are Some", () => {
      expect(Some(1).xor(Some(2)).isNone()).toBe(true);
    });

    it("returns None when both are None", () => {
      expect(None.xor(None).isNone()).toBe(true);
    });
  });
});

// ============================================================================
// Option Namespace Tests
// ============================================================================

describe("Option namespace", () => {
  describe("from", () => {
    it("creates Some from value", () => {
      expect(Option.from(42).unwrap()).toBe(42);
    });

    it("creates None from null", () => {
      expect(Option.from(null).isNone()).toBe(true);
    });

    it("creates None from undefined", () => {
      expect(Option.from(undefined).isNone()).toBe(true);
    });

    it("creates Some from 0 (falsy but non-nullish)", () => {
      const opt = Option.from(0);
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe(0);
    });

    it("creates Some from empty string (falsy but non-nullish)", () => {
      const opt = Option.from("");
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe("");
    });

    it("creates Some from false (falsy but non-nullish)", () => {
      const opt = Option.from(false);
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe(false);
    });
  });

  describe("static methods", () => {
    it("map delegates to instance", () => {
      expect(Option.map(Some(2), (x) => x * 2).unwrap()).toBe(4);
    });

    it("andThen delegates to instance", () => {
      expect(Option.andThen(Some(2), (x) => Some(x * 2)).unwrap()).toBe(4);
    });

    it("or delegates to instance", () => {
      expect(Option.or(None, Some(2)).unwrap()).toBe(2);
    });

    it("orElse delegates to instance", () => {
      expect(Option.orElse(None, () => Some(2)).unwrap()).toBe(2);
    });

    it("filter delegates to instance", () => {
      expect(Option.filter(Some(4), (x) => x > 2).unwrap()).toBe(4);
      expect(Option.filter(None, () => true).isNone()).toBe(true);
    });

    it("unwrap delegates to instance", () => {
      expect(Option.unwrap(Some(42))).toBe(42);
    });

    it("unwrapOr delegates to instance", () => {
      expect(Option.unwrapOr(None, 0)).toBe(0);
    });

    it("unwrapOrElse delegates to instance", () => {
      expect(Option.unwrapOrElse(None, () => 0)).toBe(0);
    });

    it("match delegates to instance", () => {
      expect(Option.match(Some(42), { some: (x) => x, none: () => 0 })).toBe(42);
    });

    it("zip delegates to instance", () => {
      expect(Option.zip(Some(1), Some(2)).unwrap()).toEqual([1, 2]);
    });

    it("okOr delegates to instance", () => {
      expect(Option.okOr(Some(42), "err").unwrap()).toBe(42);
      expect(Option.okOr(None, "err").unwrapErr()).toBe("err");
    });

    it("flatten delegates to instance", () => {
      expect(Option.flatten(Some(Some(42))).unwrap()).toBe(42);
    });
  });

  describe("transpose", () => {
    it("converts Some(Ok) to Ok(Some)", () => {
      const result = Option.transpose(Some(Ok(42)));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().unwrap()).toBe(42);
    });

    it("converts Some(Err) to Err", () => {
      const result = Option.transpose(Some(Err("error")));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    it("converts None to Ok(None)", () => {
      const result = Option.transpose(None as Option<Result<number, string>>);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().isNone()).toBe(true);
    });
  });

  describe("all", () => {
    it("combines all Some into Some array", () => {
      const result = Option.all([Some(1), Some(2), Some(3)]);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("returns None if any is None", () => {
      const result = Option.all([Some(1), None, Some(3)]);
      expect(result.isNone()).toBe(true);
    });

    it("returns Some empty array for empty input", () => {
      const result = Option.all([]);
      expect(result.unwrap()).toEqual([]);
    });
  });

  describe("collect", () => {
    it("is an alias for all", () => {
      const result = Option.collect([Some(1), Some(2)]);
      expect(result.unwrap()).toEqual([1, 2]);
    });
  });
});

// ============================================================================
// Type Guards
// ============================================================================

describe("Type guards", () => {
  describe("isSome", () => {
    it("returns true for Some", () => {
      expect(isSome(Some(42))).toBe(true);
    });

    it("returns false for None", () => {
      expect(isSome(None)).toBe(false);
    });
  });

  describe("isNone", () => {
    it("returns true for None", () => {
      expect(isNone(None)).toBe(true);
    });

    it("returns false for Some", () => {
      expect(isNone(Some(42))).toBe(false);
    });
  });
});

// ============================================================================
// Result Tests
// ============================================================================

describe("Result", () => {
  describe("Ok", () => {
    it("creates an Ok value", () => {
      const result = Ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("isOk returns true", () => {
      expect(Ok(42).isOk()).toBe(true);
    });

    it("isErr returns false", () => {
      expect(Ok(42).isErr()).toBe(false);
    });
  });

  describe("Err", () => {
    it("creates an Err value", () => {
      const result = Err("error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    it("isOk returns false", () => {
      expect(Err("error").isOk()).toBe(false);
    });

    it("isErr returns true", () => {
      expect(Err("error").isErr()).toBe(true);
    });
  });

  describe("map", () => {
    it("transforms Ok value", () => {
      const result = Ok(2).map((x) => x * 2);
      expect(result.unwrap()).toBe(4);
    });

    it("returns Err unchanged", () => {
      const result = Err<string, number>("error").map((x) => x * 2);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("mapErr", () => {
    it("transforms Err value", () => {
      const result = Err("error").mapErr((e) => e.toUpperCase());
      expect(result.unwrapErr()).toBe("ERROR");
    });

    it("returns Ok unchanged", () => {
      const result = Ok<number, string>(42).mapErr((e) => e.toUpperCase());
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("andThen", () => {
    it("chains Ok values", () => {
      const result = Ok(2).andThen((x) => Ok(x * 2));
      expect(result.unwrap()).toBe(4);
    });

    it("short-circuits on Err", () => {
      const result = Ok<number, string>(2).andThen(() => Err("fail"));
      expect(result.isErr()).toBe(true);
    });

    it("returns Err when called on Err", () => {
      const result = Err<string, number>("error").andThen((x) => Ok(x * 2));
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("orElse", () => {
    it("returns self when Ok", () => {
      const fn = vi.fn(() => Ok(0));
      const result = Ok<number, string>(42).orElse(fn);
      expect(result.unwrap()).toBe(42);
      expect(fn).not.toHaveBeenCalled();
    });

    it("returns computed value when Err", () => {
      const result = Err<string, number>("error").orElse((e) => Ok(e.length));
      expect(result.unwrap()).toBe(5);
    });
  });

  describe("unwrap", () => {
    it("returns value for Ok", () => {
      expect(Ok(42).unwrap()).toBe(42);
    });

    it("throws for Err", () => {
      expect(() => Err("error").unwrap()).toThrow('Called unwrap on Err: "error"');
    });

    it("handles Error objects in panic message", () => {
      expect(() => Err(new Error("test error")).unwrap()).toThrow(
        "Called unwrap on Err: test error",
      );
    });

    it("handles non-JSON-serializable values", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(() => Err(circular).unwrap()).toThrow();
    });

    it("truncates long panic messages", () => {
      const longData = { data: "x".repeat(300) };
      expect(() => Err(longData).unwrap()).toThrow(/\.\.\.$/);
    });
  });

  describe("unwrapOr", () => {
    it("returns value for Ok", () => {
      expect(Ok(42).unwrapOr(0)).toBe(42);
    });

    it("returns default for Err", () => {
      expect(Err<string, number>("error").unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse", () => {
    it("returns value for Ok", () => {
      const fn = vi.fn(() => 0);
      expect(Ok(42).unwrapOrElse(fn)).toBe(42);
      expect(fn).not.toHaveBeenCalled();
    });

    it("computes default for Err", () => {
      expect(Err<string, number>("error").unwrapOrElse((e) => e.length)).toBe(5);
    });
  });

  describe("expect", () => {
    it("returns value for Ok", () => {
      expect(Ok(42).expect("should exist")).toBe(42);
    });

    it("throws with message for Err", () => {
      expect(() => Err("oops").expect("value required")).toThrow('value required: "oops"');
    });
  });

  describe("unwrapErr", () => {
    it("returns error for Err", () => {
      expect(Err("error").unwrapErr()).toBe("error");
    });

    it("throws for Ok", () => {
      expect(() => Ok(42).unwrapErr()).toThrow("Called unwrapErr on Ok: 42");
    });
  });

  describe("expectErr", () => {
    it("returns error for Err", () => {
      expect(Err("e").expectErr("msg")).toBe("e");
    });

    it("throws with message for Ok", () => {
      expect(() => Ok(42).expectErr("msg")).toThrow("msg: 42");
    });

    it("throws with formatted message for Ok with complex value", () => {
      expect(() => Ok({ a: 1 }).expectErr("should be err")).toThrow('should be err: {"a":1}');
    });
  });

  describe("match", () => {
    it("calls ok handler for Ok", () => {
      const result = Ok(42).match({
        ok: (x) => x * 2,
        err: () => 0,
      });
      expect(result).toBe(84);
    });

    it("calls err handler for Err", () => {
      const result = Err("error").match({
        ok: (x: number) => x * 2,
        err: (e) => e.length,
      });
      expect(result).toBe(5);
    });
  });

  describe("toOption", () => {
    it("converts Ok to Some", () => {
      const opt = Ok(42).toOption();
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe(42);
    });

    it("converts Err to None", () => {
      const opt = Err("error").toOption();
      expect(opt.isNone()).toBe(true);
    });
  });

  describe("err", () => {
    it("returns None for Ok", () => {
      const opt = Ok(42).err();
      expect(opt.isNone()).toBe(true);
    });

    it("returns Some(error) for Err", () => {
      const opt = Err("error").err();
      expect(opt.isSome()).toBe(true);
      expect(opt.unwrap()).toBe("error");
    });
  });

  describe("flatten", () => {
    it("flattens nested Ok", () => {
      const nested = Ok(Ok(42));
      expect(nested.flatten().unwrap()).toBe(42);
    });

    it("flattens Ok(Err) to Err", () => {
      const nested: Result<Result<number, string>, string> = Ok(Err("error"));
      expect(nested.flatten().unwrapErr()).toBe("error");
    });

    it("returns Err for Err", () => {
      const result = Err<string, Result<number, string>>("outer");
      expect(result.flatten().unwrapErr()).toBe("outer");
    });
  });

  describe("inspect", () => {
    it("calls function for Ok", () => {
      const fn = vi.fn();
      const result = Ok(42).inspect(fn);
      expect(fn).toHaveBeenCalledWith(42);
      expect(result.unwrap()).toBe(42);
    });

    it("does not call function for Err", () => {
      const fn = vi.fn();
      Err("error").inspect(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("inspectErr", () => {
    it("calls function for Err", () => {
      const fn = vi.fn();
      const result = Err("error").inspectErr(fn);
      expect(fn).toHaveBeenCalledWith("error");
      expect(result.unwrapErr()).toBe("error");
    });

    it("does not call function for Ok", () => {
      const fn = vi.fn();
      Ok(42).inspectErr(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("mapOr", () => {
    it("maps Ok value", () => {
      expect(Ok(2).mapOr(0, (x) => x * 2)).toBe(4);
    });

    it("returns default for Err", () => {
      expect(Err<string, number>("e").mapOr(0, (x) => x * 2)).toBe(0);
    });
  });

  describe("mapOrElse", () => {
    it("maps Ok value", () => {
      expect(
        Ok(2).mapOrElse(
          () => 0,
          (x) => x * 2,
        ),
      ).toBe(4);
    });

    it("calls default fn for Err", () => {
      expect(
        Err<string, number>("err").mapOrElse(
          (e) => e.length,
          (x) => x * 2,
        ),
      ).toBe(3);
    });
  });

  describe("and", () => {
    it("returns other when Ok", () => {
      const result = Ok(2).and(Ok("hello"));
      expect(result.unwrap()).toBe("hello");
    });

    it("returns Err when self is Err", () => {
      const result = Err<string, number>("e").and(Ok("hello"));
      expect(result.unwrapErr()).toBe("e");
    });

    it("returns other Err when other is Err", () => {
      const result = Ok<number, string>(2).and(Err("late"));
      expect(result.unwrapErr()).toBe("late");
    });
  });

  describe("or", () => {
    it("returns self when Ok", () => {
      const result = Ok(2).or(Ok(100));
      expect(result.unwrap()).toBe(2);
    });

    it("returns other when Err", () => {
      const result = Err<string, number>("e").or(Ok(100));
      expect(result.unwrap()).toBe(100);
    });
  });

  describe("contains", () => {
    it("returns true when Ok contains value", () => {
      expect(Ok(42).contains(42)).toBe(true);
    });

    it("returns false when Ok has different value", () => {
      expect(Ok(42).contains(0)).toBe(false);
    });

    it("returns false for Err", () => {
      expect(Err<string, number>("e").contains(42)).toBe(false);
    });
  });

  describe("containsErr", () => {
    it("returns true when Err contains value", () => {
      expect(Err("e").containsErr("e")).toBe(true);
    });

    it("returns false when Err has different value", () => {
      expect(Err("e").containsErr("other")).toBe(false);
    });

    it("returns false for Ok", () => {
      expect(Ok<number, string>(42).containsErr("e")).toBe(false);
    });
  });
});

// ============================================================================
// Result Namespace Tests
// ============================================================================

describe("Result namespace", () => {
  describe("static methods", () => {
    it("map delegates to instance", () => {
      expect(Result.map(Ok(2), (x) => x * 2).unwrap()).toBe(4);
    });

    it("mapErr delegates to instance", () => {
      expect(Result.mapErr(Err("a"), (e) => e + "b").unwrapErr()).toBe("ab");
    });

    it("andThen delegates to instance", () => {
      expect(Result.andThen(Ok(2), (x) => Ok(x * 2)).unwrap()).toBe(4);
    });

    it("orElse delegates to instance", () => {
      expect(Result.orElse(Err("a"), () => Ok(42)).unwrap()).toBe(42);
    });

    it("unwrap delegates to instance", () => {
      expect(Result.unwrap(Ok(42))).toBe(42);
    });

    it("unwrapOr delegates to instance", () => {
      expect(Result.unwrapOr(Err("err"), 0)).toBe(0);
    });

    it("unwrapOrElse delegates to instance", () => {
      expect(Result.unwrapOrElse(Err("err"), (e) => e.length)).toBe(3);
    });

    it("unwrapErr delegates to instance", () => {
      expect(Result.unwrapErr(Err("error"))).toBe("error");
    });

    it("match delegates to instance", () => {
      expect(Result.match(Ok(42), { ok: (x) => x, err: () => 0 })).toBe(42);
    });

    it("toOption delegates to instance", () => {
      expect(Result.toOption(Ok(42)).unwrap()).toBe(42);
    });

    it("flatten delegates to instance", () => {
      expect(Result.flatten(Ok(Ok(42))).unwrap()).toBe(42);
    });
  });

  describe("fromThrowable", () => {
    it("returns Ok for successful function", () => {
      const result = Result.fromThrowable(() => 42);
      expect(result.unwrap()).toBe(42);
    });

    it("returns Err for throwing function", () => {
      const result = Result.fromThrowable(() => {
        throw new Error("test");
      });
      expect(result.isErr()).toBe(true);
    });
  });

  describe("fromPromise", () => {
    it("returns Ok for resolved promise", async () => {
      const result = await Result.fromPromise(Promise.resolve(42));
      expect(result.unwrap()).toBe(42);
    });

    it("returns Err for rejected promise", async () => {
      const result = await Result.fromPromise(Promise.reject("error"));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });
  });

  describe("transpose", () => {
    it("converts Ok(Some) to Some(Ok)", () => {
      const result = Result.transpose(Ok(Some(42)));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap().unwrap()).toBe(42);
    });

    it("converts Ok(None) to None", () => {
      const result = Result.transpose(Ok(None));
      expect(result.isNone()).toBe(true);
    });

    it("converts Err to Some(Err)", () => {
      const result = Result.transpose(Err("error") as Result<Option<number>, string>);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap().unwrapErr()).toBe("error");
    });
  });

  describe("all", () => {
    it("combines all Ok into Ok array", () => {
      const result = Result.all([Ok(1), Ok(2), Ok(3)]);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("returns first Err if any is Err", () => {
      const result = Result.all([Ok(1), Err("fail"), Ok(3)]);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("fail");
    });

    it("returns Ok empty array for empty input", () => {
      const result = Result.all([]);
      expect(result.unwrap()).toEqual([]);
    });
  });

  describe("collect", () => {
    it("is an alias for all", () => {
      const result = Result.collect([Ok(1), Ok(2)]);
      expect(result.unwrap()).toEqual([1, 2]);
    });
  });
});

// ============================================================================
// Result Type Guards
// ============================================================================

// ============================================================================
// Edge Case Tests (Phase 4)
// ============================================================================

describe("Option.from edge cases", () => {
  it("wraps NaN as Some (NaN is not nullish)", () => {
    const opt = Option.from(NaN);
    expect(opt.isSome()).toBe(true);
    expect(Number.isNaN(opt.unwrap())).toBe(true);
  });

  it("wraps -0 as Some", () => {
    const opt = Option.from(-0);
    expect(opt.isSome()).toBe(true);
    expect(Object.is(opt.unwrap(), -0)).toBe(true);
  });

  it("wraps Infinity as Some", () => {
    expect(Option.from(Infinity).unwrap()).toBe(Infinity);
  });

  it("wraps -Infinity as Some", () => {
    expect(Option.from(-Infinity).unwrap()).toBe(-Infinity);
  });

  it("wraps 0n (BigInt zero) as Some", () => {
    expect(Option.from(0n).unwrap()).toBe(0n);
  });

  it("wraps Symbol as Some", () => {
    const s = Symbol("x");
    expect(Option.from(s).unwrap()).toBe(s);
  });

  it("wraps empty string as Some", () => {
    expect(Option.from("").unwrap()).toBe("");
  });

  it("wraps false as Some", () => {
    expect(Option.from(false).unwrap()).toBe(false);
  });
});

describe("contains() edge cases", () => {
  it("Some(NaN).contains(NaN) returns false (=== semantics)", () => {
    expect(Some(NaN).contains(NaN)).toBe(false);
  });

  it("Some({a:1}).contains({a:1}) returns false (reference equality)", () => {
    expect(Some({ a: 1 }).contains({ a: 1 })).toBe(false);
  });

  it("Ok(NaN).contains(NaN) returns false (=== semantics)", () => {
    expect(Ok(NaN).contains(NaN)).toBe(false);
  });
});

describe("method chaining composition", () => {
  it("Ok -> map -> andThen -> unwrapOr chain", () => {
    const result = Ok<number, string>(5)
      .map((x) => x * 2)
      .andThen((x) => (x > 5 ? Ok(x) : Err("too small")))
      .unwrapOr(0);
    expect(result).toBe(10);
  });

  it("Some -> filter -> map -> unwrapOr chain", () => {
    const result = Some(3)
      .filter((x) => x > 2)
      .map((x) => x.toString())
      .unwrapOr("none");
    expect(result).toBe("3");
  });

  it("Result.all -> map chain", () => {
    const result = Result.all([Ok(1), Ok(2), Ok(3)]).map((arr) => arr.reduce((a, b) => a + b, 0));
    expect(result.unwrap()).toBe(6);
  });
});

describe("Option/Result interop", () => {
  it("Ok(Some(5)).toOption().flatten()", () => {
    const result = Ok(Some(5)).toOption().flatten();
    expect(result.unwrap()).toBe(5);
  });

  it("Result.transpose and Option.transpose roundtrip", () => {
    const original = Ok(Some(5)) as Result<Option<number>, string>;
    const transposed = Result.transpose(original);
    expect(transposed.isSome()).toBe(true);

    const roundtripped = Option.transpose(transposed);
    expect(roundtripped.isOk()).toBe(true);
    expect(roundtripped.unwrap().unwrap()).toBe(5);
  });
});

// ============================================================================
// Result Type Guards
// ============================================================================

describe("Result type guards", () => {
  describe("isOk", () => {
    it("returns true for Ok", () => {
      expect(isOk(Ok(42))).toBe(true);
    });

    it("returns false for Err", () => {
      expect(isOk(Err("error"))).toBe(false);
    });
  });

  describe("isErr", () => {
    it("returns true for Err", () => {
      expect(isErr(Err("error"))).toBe(true);
    });

    it("returns false for Ok", () => {
      expect(isErr(Ok(42))).toBe(false);
    });
  });
});
