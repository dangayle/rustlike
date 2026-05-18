import { describe, it, expect, vi } from "vitest";
import { AsyncResult } from "./async";
import { Ok, Err, Some, None } from "./core";

describe("AsyncResult", () => {
  describe("static constructors", () => {
    describe("fromPromise", () => {
      it("creates AsyncResult from Promise<Result>", async () => {
        const asyncResult = AsyncResult.fromPromise(Promise.resolve(Ok(42)));
        const result = await asyncResult;
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(42);
      });
    });

    describe("ok", () => {
      it("creates AsyncResult resolving to Ok", async () => {
        const asyncResult = AsyncResult.ok(42);
        const result = await asyncResult;
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(42);
      });
    });

    describe("err", () => {
      it("creates AsyncResult resolving to Err", async () => {
        const asyncResult = AsyncResult.err("error");
        const result = await asyncResult;
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe("error");
      });
    });

    describe("fromThrowable", () => {
      it("returns Ok for successful async function", async () => {
        const asyncResult = AsyncResult.fromThrowable(async () => 42);
        const result = await asyncResult;
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(42);
      });

      it("returns Err for rejecting async function", async () => {
        const asyncResult = AsyncResult.fromThrowable(async () => {
          throw new Error("async error");
        });
        const result = await asyncResult;
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBeInstanceOf(Error);
      });

      it("catches synchronous throws from fn()", async () => {
        const asyncResult = AsyncResult.fromThrowable(() => {
          throw new Error("sync throw");
        });
        const result = await asyncResult;
        expect(result.isErr()).toBe(true);
        expect((result.unwrapErr() as Error).message).toBe("sync throw");
      });
    });
  });

  describe("map", () => {
    it("transforms Ok value with sync function", async () => {
      const result = await AsyncResult.ok(2).map((x) => x * 2);
      expect(result.unwrap()).toBe(4);
    });

    it("transforms Ok value with async function", async () => {
      const result = await AsyncResult.ok(2).map(async (x) => x * 2);
      expect(result.unwrap()).toBe(4);
    });

    it("skips Err", async () => {
      const result = await AsyncResult.err<string, number>("error").map((x) => x * 2);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    it("propagates thrown errors", async () => {
      const asyncResult = AsyncResult.ok(2).map(() => {
        throw new Error("map error");
      });

      await expect(asyncResult.toPromise()).rejects.toThrow("map error");
    });
  });

  describe("mapErr", () => {
    it("transforms Err value with sync function", async () => {
      const result = await AsyncResult.err("error").mapErr((e) => e.toUpperCase());
      expect(result.unwrapErr()).toBe("ERROR");
    });

    it("transforms Err value with async function", async () => {
      const result = await AsyncResult.err("error").mapErr(async (e) => e.toUpperCase());
      expect(result.unwrapErr()).toBe("ERROR");
    });

    it("skips Ok", async () => {
      const result = await AsyncResult.ok<number, string>(42).mapErr((e) => e.toUpperCase());
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("andThen", () => {
    it("chains with sync Result", async () => {
      const result = await AsyncResult.ok(2).andThen((x) => Ok(x * 2));
      expect(result.unwrap()).toBe(4);
    });

    it("chains with AsyncResult", async () => {
      const result = await AsyncResult.ok(2).andThen((x) => AsyncResult.ok(x * 2));
      expect(result.unwrap()).toBe(4);
    });

    it("chains with Promise<Result>", async () => {
      const result = await AsyncResult.ok(2).andThen(async (x) => Ok(x * 2));
      expect(result.unwrap()).toBe(4);
    });

    it("short-circuits on Err", async () => {
      const fn = vi.fn(() => Ok(0));
      const result = await AsyncResult.err<string, number>("error").andThen(fn);
      expect(result.isErr()).toBe(true);
      expect(fn).not.toHaveBeenCalled();
    });

    it("propagates inner Err", async () => {
      const result = await AsyncResult.ok<number, string>(2).andThen(() => Err("fail"));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("fail");
    });
  });

  describe("orElse", () => {
    it("skips Ok", async () => {
      const fn = vi.fn(() => Ok(0));
      const result = await AsyncResult.ok<number, string>(42).orElse(fn);
      expect(result.unwrap()).toBe(42);
      expect(fn).not.toHaveBeenCalled();
    });

    it("recovers from Err with sync Result", async () => {
      const result = await AsyncResult.err<string, number>("error").orElse((e) => Ok(e.length));
      expect(result.unwrap()).toBe(5);
    });

    it("recovers from Err with AsyncResult", async () => {
      const result = await AsyncResult.err<string, number>("error").orElse((e) =>
        AsyncResult.ok(e.length),
      );
      expect(result.unwrap()).toBe(5);
    });

    it("recovers from Err with Promise<Result>", async () => {
      const result = await AsyncResult.err<string, number>("error").orElse(async (e) =>
        Ok(e.length),
      );
      expect(result.unwrap()).toBe(5);
    });

    it("can produce new Err", async () => {
      const result = await AsyncResult.err<string, number>("error").orElse(() => Err("new error"));
      expect(result.unwrapErr()).toBe("new error");
    });
  });

  describe("inspect", () => {
    it("calls function for Ok", async () => {
      const fn = vi.fn();
      const result = await AsyncResult.ok(42).inspect(fn);
      expect(fn).toHaveBeenCalledWith(42);
      expect(result.unwrap()).toBe(42);
    });

    it("awaits async function for Ok", async () => {
      let called = false;
      const fn = async (_x: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        called = true;
      };

      await AsyncResult.ok(42).inspect(fn);
      expect(called).toBe(true);
    });

    it("does not call function for Err", async () => {
      const fn = vi.fn();
      await AsyncResult.err("error").inspect(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("inspectErr", () => {
    it("calls function for Err", async () => {
      const fn = vi.fn();
      const result = await AsyncResult.err("error").inspectErr(fn);
      expect(fn).toHaveBeenCalledWith("error");
      expect(result.unwrapErr()).toBe("error");
    });

    it("awaits async function for Err", async () => {
      let called = false;
      const fn = async (_e: string) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        called = true;
      };

      await AsyncResult.err("error").inspectErr(fn);
      expect(called).toBe(true);
    });

    it("does not call function for Ok", async () => {
      const fn = vi.fn();
      await AsyncResult.ok(42).inspectErr(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("match", () => {
    it("calls ok handler for Ok", async () => {
      const result = await AsyncResult.ok(42).match({
        ok: (x) => x * 2,
        err: () => 0,
      });
      expect(result).toBe(84);
    });

    it("calls err handler for Err", async () => {
      const result = await AsyncResult.err("error").match({
        ok: () => 0,
        err: (e) => e.length,
      });
      expect(result).toBe(5);
    });

    it("supports async handlers", async () => {
      const result = await AsyncResult.ok(42).match({
        ok: async (x) => x * 2,
        err: async () => 0,
      });
      expect(result).toBe(84);
    });
  });

  describe("unwrap", () => {
    it("returns value for Ok", async () => {
      const value = await AsyncResult.ok(42).unwrap();
      expect(value).toBe(42);
    });

    it("throws for Err", async () => {
      await expect(AsyncResult.err("error").unwrap()).rejects.toThrow();
    });
  });

  describe("unwrapOr", () => {
    it("returns value for Ok", async () => {
      const value = await AsyncResult.ok(42).unwrapOr(0);
      expect(value).toBe(42);
    });

    it("returns default for Err", async () => {
      const value = await AsyncResult.err<string, number>("error").unwrapOr(0);
      expect(value).toBe(0);
    });
  });

  describe("unwrapOrElse", () => {
    it("returns value for Ok", async () => {
      const fn = vi.fn(() => 0);
      const value = await AsyncResult.ok(42).unwrapOrElse(fn);
      expect(value).toBe(42);
      expect(fn).not.toHaveBeenCalled();
    });

    it("computes default for Err with sync function", async () => {
      const value = await AsyncResult.err<string, number>("error").unwrapOrElse((e) => e.length);
      expect(value).toBe(5);
    });

    it("computes default for Err with async function", async () => {
      const value = await AsyncResult.err<string, number>("error").unwrapOrElse(
        async (e) => e.length,
      );
      expect(value).toBe(5);
    });
  });

  describe("toPromise", () => {
    it("returns underlying Promise<Result>", async () => {
      const promise = AsyncResult.ok(42).toPromise();
      expect(promise).toBeInstanceOf(Promise);
      const result = await promise;
      expect(result.isOk()).toBe(true);
    });
  });

  describe("PromiseLike interface", () => {
    it("can be awaited directly", async () => {
      const result = await AsyncResult.ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("supports .then()", async () => {
      const result = await AsyncResult.ok(42).then((r) => r.unwrap() * 2);
      expect(result).toBe(84);
    });

    it("supports rejection handling in .then()", async () => {
      const asyncResult = AsyncResult.fromPromise(Promise.reject(new Error("test")));

      const result = await asyncResult.then(
        () => "fulfilled",
        () => "rejected",
      );
      expect(result).toBe("rejected");
    });
  });

  describe("chaining", () => {
    it("supports complex chains", async () => {
      const result = await AsyncResult.ok<number, string>(10)
        .map((x) => x * 2)
        .andThen((x) => (x > 15 ? Ok(x) : Err("too small")))
        .map((x) => x + 1)
        .mapErr((e) => `Error: ${e}`);

      expect(result.unwrap()).toBe(21);
    });

    it("short-circuits chain on Err", async () => {
      const mapFn = vi.fn((x: number) => x * 2);

      const result = await AsyncResult.ok<number, string>(5)
        .andThen((x) => (x > 10 ? Ok(x) : Err("too small")))
        .map(mapFn);

      expect(result.isErr()).toBe(true);
      expect(mapFn).not.toHaveBeenCalled();
    });

    it("recovers with orElse in chain", async () => {
      const result = await AsyncResult.ok<number, string>(5)
        .andThen((x) => (x > 10 ? Ok(x) : Err("too small")))
        .orElse(() => Ok(0))
        .map((x) => x + 100);

      expect(result.unwrap()).toBe(100);
    });
  });

  describe("contains", () => {
    it("returns true when Ok contains the value", async () => {
      expect(await AsyncResult.ok(42).contains(42)).toBe(true);
    });

    it("returns false when Ok contains a different value", async () => {
      expect(await AsyncResult.ok(42).contains(99)).toBe(false);
    });

    it("returns false for Err", async () => {
      expect(await AsyncResult.err<string, number>("error").contains(42)).toBe(false);
    });
  });

  describe("containsErr", () => {
    it("returns true when Err contains the error", async () => {
      expect(await AsyncResult.err("error").containsErr("error")).toBe(true);
    });

    it("returns false when Err contains a different error", async () => {
      expect(await AsyncResult.err("error").containsErr("other")).toBe(false);
    });

    it("returns false for Ok", async () => {
      expect(await AsyncResult.ok<number, string>(42).containsErr("error")).toBe(false);
    });
  });

  describe("and", () => {
    it("returns second Ok when both are Ok", async () => {
      const result = await AsyncResult.ok<number, string>(1).and(
        AsyncResult.ok<string, string>("hello"),
      );
      expect(result.unwrap()).toBe("hello");
    });

    it("returns Err when first is Ok and second is Err", async () => {
      const result = await AsyncResult.ok<number, string>(1).and(
        AsyncResult.err<string, string>("fail"),
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("fail");
    });

    it("returns first Err when first is Err", async () => {
      const result = await AsyncResult.err<string, number>("first error").and(
        AsyncResult.ok<string, string>("hello"),
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("first error");
    });
  });

  describe("or", () => {
    it("returns first Ok when first is Ok", async () => {
      const result = await AsyncResult.ok<number, string>(42).or(
        AsyncResult.err<number, number>(99),
      );
      expect(result.unwrap()).toBe(42);
    });

    it("returns second Ok when first is Err", async () => {
      const result = await AsyncResult.err<string, number>("error").or(
        AsyncResult.ok<number, number>(42),
      );
      expect(result.unwrap()).toBe(42);
    });

    it("returns second Err when both are Err", async () => {
      const result = await AsyncResult.err<string, number>("first").or(
        AsyncResult.err<number, number>(99),
      );
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(99);
    });
  });

  describe("flatten", () => {
    it("flattens Ok(Ok(v)) to Ok(v)", async () => {
      const inner = Ok(42);
      const result = await AsyncResult.ok<typeof inner, string>(inner).flatten();
      expect(result.unwrap()).toBe(42);
    });

    it("flattens Ok(Err(e)) to Err(e)", async () => {
      const inner = Err<string, number>("inner error");
      const result = await AsyncResult.ok<typeof inner, string>(inner).flatten();
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("inner error");
    });

    it("keeps Err(e) as Err(e)", async () => {
      const result = await AsyncResult.err<string>("outer error").flatten();
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("outer error");
    });
  });

  describe("toOption", () => {
    it("returns Some for Ok", async () => {
      const option = await AsyncResult.ok(42).toOption();
      expect(option).toEqual(Some(42));
    });

    it("returns None for Err", async () => {
      const option = await AsyncResult.err("error").toOption();
      expect(option).toEqual(None);
    });
  });

  describe("err", () => {
    it("returns None for Ok", async () => {
      const option = await AsyncResult.ok(42).err();
      expect(option).toEqual(None);
    });

    it("returns Some for Err", async () => {
      const option = await AsyncResult.err("error").err();
      expect(option).toEqual(Some("error"));
    });
  });

  describe("expect", () => {
    it("returns value for Ok", async () => {
      const value = await AsyncResult.ok(42).expect("should not fail");
      expect(value).toBe(42);
    });

    it("throws with message for Err", async () => {
      await expect(AsyncResult.err("error").expect("custom message")).rejects.toThrow(
        "custom message",
      );
    });
  });

  describe("unwrapErr", () => {
    it("returns error for Err", async () => {
      const error = await AsyncResult.err("error").unwrapErr();
      expect(error).toBe("error");
    });

    it("throws for Ok", async () => {
      await expect(AsyncResult.ok(42).unwrapErr()).rejects.toThrow();
    });
  });

  describe("expectErr", () => {
    it("returns error for Err", async () => {
      const error = await AsyncResult.err("error").expectErr("should not fail");
      expect(error).toBe("error");
    });

    it("throws with message for Ok", async () => {
      await expect(AsyncResult.ok(42).expectErr("custom message")).rejects.toThrow(
        "custom message",
      );
    });
  });
});
