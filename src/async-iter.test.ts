import { describe, it, expect, vi } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import {
  asyncIter,
  asyncIterFromArray,
  asyncIterFromIterable,
  asyncIterFromGenerator,
  AsyncIter,
} from "./async-iter";
import { asyncIterLines } from "./node";
import { Ok, Err, Some, None } from "./core";

// Helper to create an async generator from an array
async function* asyncGen<T>(arr: T[]): AsyncGenerator<T> {
  for (const item of arr) {
    yield item;
  }
}

// ============================================================================
// AsyncIter Tests
// ============================================================================

describe("AsyncIter", () => {
  // --------------------------------------------------------------------------
  // Factory functions
  // --------------------------------------------------------------------------

  describe("asyncIter()", () => {
    it("creates an iterator from an async generator", async () => {
      const result = await asyncIter(asyncGen([1, 2, 3])).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("creates an iterator from an async iterable", async () => {
      const asyncIterable = {
        async *[Symbol.asyncIterator]() {
          yield 1;
          yield 2;
          yield 3;
        },
      };
      const result = await asyncIter(asyncIterable).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("asyncIterFromArray()", () => {
    it("creates an async iterator from an array", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles empty arrays", async () => {
      const result = await asyncIterFromArray([]).collect();
      expect(result).toEqual([]);
    });
  });

  describe("asyncIterFromIterable()", () => {
    it("creates an async iterator from a sync iterable", async () => {
      const result = await asyncIterFromIterable(new Set([1, 2, 3])).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("asyncIterFromGenerator()", () => {
    it("creates an iterator from an async generator function", async () => {
      const result = await asyncIterFromGenerator(async function* () {
        yield 1;
        yield 2;
        yield 3;
      }).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("AsyncIter.empty()", () => {
    it("creates an empty async iterator", async () => {
      const result = await AsyncIter.empty<number>().collect();
      expect(result).toEqual([]);
    });
  });

  describe("AsyncIter.once()", () => {
    it("creates an async iterator with a single value", async () => {
      const result = await AsyncIter.once(42).collect();
      expect(result).toEqual([42]);
    });
  });

  describe("AsyncIter.repeat()", () => {
    it("creates an async iterator that repeats a value", async () => {
      const result = await AsyncIter.repeat("x", 3).collect();
      expect(result).toEqual(["x", "x", "x"]);
    });

    it("handles zero repeats", async () => {
      const result = await AsyncIter.repeat("x", 0).collect();
      expect(result).toEqual([]);
    });
  });

  describe("AsyncIter.range()", () => {
    it("creates a range of numbers", async () => {
      const result = await AsyncIter.range(0, 5).collect();
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it("handles custom step", async () => {
      const result = await AsyncIter.range(0, 10, 2).collect();
      expect(result).toEqual([0, 2, 4, 6, 8]);
    });

    it("throws on zero step to avoid infinite loop", async () => {
      await expect(async () => AsyncIter.range(0, 5, 0).collect()).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Core transformation
  // --------------------------------------------------------------------------

  describe("map()", () => {
    it("transforms each element", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .map((x) => x * 2)
        .collect();
      expect(result).toEqual([2, 4, 6]);
    });

    it("handles async map functions", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .map(async (x) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return x * 2;
        })
        .collect();
      expect(result).toEqual([2, 4, 6]);
    });

    it("is lazy - does not execute until consumed", async () => {
      const fn = vi.fn((x: number) => x * 2);
      const mapped = asyncIterFromArray([1, 2, 3]).map(fn);

      expect(fn).not.toHaveBeenCalled();

      await mapped.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("filter()", () => {
    it("keeps only matching elements", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4, 5])
        .filter((x) => x % 2 === 0)
        .collect();
      expect(result).toEqual([2, 4]);
    });

    it("handles async predicate", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4, 5])
        .filter(async (x) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return x % 2 === 0;
        })
        .collect();
      expect(result).toEqual([2, 4]);
    });

    it("is lazy - does not execute until consumed", async () => {
      const fn = vi.fn((x: number) => x > 1);
      const filtered = asyncIterFromArray([1, 2, 3]).filter(fn);

      expect(fn).not.toHaveBeenCalled();

      await filtered.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // Aggregation
  // --------------------------------------------------------------------------

  describe("fold()", () => {
    it("reduces the iterator to a single value", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4]).fold(0, (acc, x) => acc + x);
      expect(result).toBe(10);
    });

    it("handles async fold function", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).fold(0, async (acc, x) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return acc + x;
      });
      expect(result).toBe(6);
    });

    it("handles empty iterator", async () => {
      const result = await asyncIterFromArray<number>([]).fold(42, (acc, x) => acc + x);
      expect(result).toBe(42);
    });
  });

  describe("tryFold()", () => {
    it("folds while operations succeed", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).tryFold(0, (acc, x) => Ok(acc + x));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });

    it("short-circuits on first error", async () => {
      const fn = vi.fn((acc: number, x: number) => {
        if (x === 2) return Err("error at 2");
        return Ok(acc + x);
      });

      const result = await asyncIterFromArray([1, 2, 3]).tryFold(0, fn);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error at 2");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("handles async fold function", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).tryFold(0, async (acc, x) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return Ok(acc + x);
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });
  });

  // --------------------------------------------------------------------------
  // Result integration
  // --------------------------------------------------------------------------

  describe("tryMap()", () => {
    it("maps with a fallible function", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .tryMap((x) => (x > 1 ? Ok(x * 2) : Err("too small")))
        .collect();

      expect(result).toHaveLength(3);
      const [r0, r1, r2] = result;
      expect(r0?.isErr()).toBe(true);
      expect(r1?.unwrap()).toBe(4);
      expect(r2?.unwrap()).toBe(6);
    });

    it("handles async fallible function", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .tryMap(async (x) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return x > 1 ? Ok(x * 2) : Err("too small");
        })
        .collect();

      expect(result).toHaveLength(3);
      const [a0, a1] = result;
      expect(a0?.isErr()).toBe(true);
      expect(a1?.unwrap()).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // Limiting & skipping
  // --------------------------------------------------------------------------

  describe("take()", () => {
    it("takes the first n elements", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4, 5]).take(3).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles taking more than available", async () => {
      const result = await asyncIterFromArray([1, 2]).take(5).collect();
      expect(result).toEqual([1, 2]);
    });

    it("handles taking zero", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).take(0).collect();
      expect(result).toEqual([]);
    });
  });

  describe("skip()", () => {
    it("skips the first n elements", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4, 5]).skip(2).collect();
      expect(result).toEqual([3, 4, 5]);
    });

    it("handles skipping more than available", async () => {
      const result = await asyncIterFromArray([1, 2]).skip(5).collect();
      expect(result).toEqual([]);
    });

    it("handles skipping zero", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).skip(0).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // Enumerating
  // --------------------------------------------------------------------------

  describe("enumerate()", () => {
    it("adds indices to elements", async () => {
      const result = await asyncIterFromArray(["a", "b", "c"]).enumerate().collect();
      expect(result).toEqual([
        [0, "a"],
        [1, "b"],
        [2, "c"],
      ]);
    });

    it("handles empty iterator", async () => {
      const result = await asyncIterFromArray([]).enumerate().collect();
      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Combining iterators
  // --------------------------------------------------------------------------

  describe("zip()", () => {
    it("combines two iterators element-wise", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .zip(asyncGen(["a", "b", "c"]))
        .collect();
      expect(result).toEqual([
        [1, "a"],
        [2, "b"],
        [3, "c"],
      ]);
    });

    it("stops when the shorter iterator is exhausted", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .zip(asyncGen(["a", "b"]))
        .collect();
      expect(result).toEqual([
        [1, "a"],
        [2, "b"],
      ]);
    });
  });

  describe("chain()", () => {
    it("concatenates two iterators", async () => {
      const result = await asyncIterFromArray([1, 2])
        .chain(asyncGen([3, 4]))
        .collect();
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("handles empty first iterator", async () => {
      const result = await asyncIterFromArray<number>([])
        .chain(asyncGen([1, 2]))
        .collect();
      expect(result).toEqual([1, 2]);
    });

    it("handles empty second iterator", async () => {
      const result = await asyncIterFromArray([1, 2]).chain(asyncGen([])).collect();
      expect(result).toEqual([1, 2]);
    });
  });

  // --------------------------------------------------------------------------
  // Flattening nested iterators
  // --------------------------------------------------------------------------

  describe("flatten()", () => {
    it("flattens nested sync iterables", async () => {
      const result = await asyncIterFromArray([[1, 2], [3, 4], [5]])
        .flatten()
        .collect();
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("flattens nested async iterables", async () => {
      const result = await asyncIterFromArray([asyncGen([1, 2]), asyncGen([3, 4])])
        .flatten()
        .collect();
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("handles empty nested arrays", async () => {
      const result = await asyncIterFromArray([[], [1], [], [2, 3], []])
        .flatten()
        .collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // Consumption
  // --------------------------------------------------------------------------

  describe("forEach()", () => {
    it("calls function for each element", async () => {
      const results: number[] = [];
      await asyncIterFromArray([1, 2, 3]).forEach((x) => {
        results.push(x);
      });
      expect(results).toEqual([1, 2, 3]);
    });

    it("handles async function", async () => {
      const results: number[] = [];
      await asyncIterFromArray([1, 2, 3]).forEach(async (x) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        results.push(x);
      });
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe("collect()", () => {
    it("collects all elements into an array", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // Async iterator protocol
  // --------------------------------------------------------------------------

  describe("Async iterator protocol", () => {
    it("can be used in for await...of", async () => {
      const results: number[] = [];
      for await (const x of asyncIterFromArray([1, 2, 3])) {
        results.push(x);
      }
      expect(results).toEqual([1, 2, 3]);
    });

    it("can use next() directly", async () => {
      const iterator = asyncIterFromArray([1, 2, 3]);

      expect(await iterator.next()).toEqual({ done: false, value: 1 });
      expect(await iterator.next()).toEqual({ done: false, value: 2 });
      expect(await iterator.next()).toEqual({ done: false, value: 3 });
      expect(await iterator.next()).toEqual({ done: true, value: undefined });
    });
  });

  // --------------------------------------------------------------------------
  // Complex pipelines
  // --------------------------------------------------------------------------

  describe("Complex pipelines", () => {
    it("chains multiple async operations", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .filter((x) => x % 2 === 0)
        .map((x) => x * 10)
        .take(3)
        .collect();

      expect(result).toEqual([20, 40, 60]);
    });

    it("handles pagination pattern", async () => {
      // Simulate paginated async data
      const pages = [{ items: [1, 2, 3] }, { items: [4, 5, 6] }, { items: [7, 8, 9] }];

      const result = await asyncIterFromArray(pages)
        .map((page) => page.items)
        .flatten()
        .filter((x) => x > 3)
        .take(4)
        .collect();

      expect(result).toEqual([4, 5, 6, 7]);
    });

    it("handles async data fetching pattern", async () => {
      // Simulate async API calls
      const fetchItem = async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { id, name: `Item ${id}` };
      };

      const result = await asyncIterFromArray([1, 2, 3])
        .map(fetchItem)
        .filter((item) => item.id > 1)
        .collect();

      expect(result).toEqual([
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // find, any, all, count, last, reduce, flatMap, inspect
  // --------------------------------------------------------------------------

  describe("find()", () => {
    it("returns Some for first match", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4]).find((x) => x > 2);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(3);
    });

    it("returns None when no match", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).find((x) => x > 10);
      expect(result.isNone()).toBe(true);
    });

    it("returns None for empty iterator", async () => {
      const result = await asyncIterFromArray<number>([]).find((x) => x > 0);
      expect(result.isNone()).toBe(true);
    });
  });

  describe("any()", () => {
    it("returns true when predicate matches any", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).any((x) => x === 2)).toBe(true);
    });

    it("returns false when predicate matches none", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).any((x) => x > 10)).toBe(false);
    });

    it("returns false for empty iterator", async () => {
      expect(await asyncIterFromArray<number>([]).any((x) => x > 0)).toBe(false);
    });
  });

  describe("all()", () => {
    it("returns true when predicate matches all", async () => {
      expect(await asyncIterFromArray([2, 4, 6]).all((x) => x % 2 === 0)).toBe(true);
    });

    it("returns false when predicate fails for any", async () => {
      expect(await asyncIterFromArray([2, 3, 6]).all((x) => x % 2 === 0)).toBe(false);
    });

    it("returns true for empty iterator", async () => {
      expect(await asyncIterFromArray<number>([]).all((x) => x > 0)).toBe(true);
    });
  });

  describe("count()", () => {
    it("counts elements", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).count()).toBe(3);
    });

    it("returns 0 for empty iterator", async () => {
      expect(await asyncIterFromArray([]).count()).toBe(0);
    });
  });

  describe("last()", () => {
    it("returns Some of last element", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).last();
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(3);
    });

    it("returns None for empty iterator", async () => {
      expect((await asyncIterFromArray([]).last()).isNone()).toBe(true);
    });
  });

  describe("reduce()", () => {
    it("reduces without initial value", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).reduce((a, b) => a + b);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });

    it("returns None for empty iterator", async () => {
      const result = await asyncIterFromArray<number>([]).reduce((a, b) => a + b);
      expect(result.isNone()).toBe(true);
    });

    it("returns the single element for one-element iterator", async () => {
      const result = await asyncIterFromArray([42]).reduce((a, b) => a + b);
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("flatMap()", () => {
    it("maps and flattens", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .flatMap((x) => [x, x * 10])
        .collect();
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });

    it("handles empty results", async () => {
      const result = await asyncIterFromArray([1, 2, 3])
        .flatMap((x) => (x === 2 ? [] : [x]))
        .collect();
      expect(result).toEqual([1, 3]);
    });
  });

  describe("inspect()", () => {
    it("calls function for each element without modifying", async () => {
      const inspected: number[] = [];
      const result = await asyncIterFromArray([1, 2, 3])
        .inspect((x) => {
          inspected.push(x);
        })
        .map((x) => x * 2)
        .collect();
      expect(inspected).toEqual([1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    it("is lazy", async () => {
      const fn = vi.fn();
      const inspected = asyncIterFromArray([1, 2, 3]).inspect(fn);
      expect(fn).not.toHaveBeenCalled();
      await inspected.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // nth, position, partition, findMap, stepBy
  // --------------------------------------------------------------------------

  describe("nth()", () => {
    it("returns Some for valid index", async () => {
      const result = await asyncIterFromArray([10, 20, 30, 40]).nth(2);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(30);
    });

    it("returns None for out-of-range index", async () => {
      expect((await asyncIterFromArray([1, 2]).nth(5)).isNone()).toBe(true);
    });

    it("returns first element for n=0", async () => {
      expect((await asyncIterFromArray([10, 20]).nth(0)).unwrap()).toBe(10);
    });
  });

  describe("position()", () => {
    it("returns Some index of first match", async () => {
      const result = await asyncIterFromArray([10, 20, 30, 40]).position((x) => x === 30);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(2);
    });

    it("returns None when no match", async () => {
      expect((await asyncIterFromArray([1, 2, 3]).position((x) => x > 10)).isNone()).toBe(true);
    });
  });

  describe("partition()", () => {
    it("splits elements into matching and non-matching", async () => {
      const [evens, odds] = await asyncIterFromArray([1, 2, 3, 4, 5]).partition((x) => x % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it("handles empty iterator", async () => {
      const [a, b] = await asyncIterFromArray<number>([]).partition((x) => x > 0);
      expect(a).toEqual([]);
      expect(b).toEqual([]);
    });
  });

  describe("findMap()", () => {
    it("returns first Some result", async () => {
      const result = await asyncIterFromArray([1, 2, 3, 4]).findMap((x) =>
        x > 2 ? Some(x * 10) : None,
      );
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(30);
    });

    it("returns None when all map to None", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).findMap((_x) => None);
      expect(result.isNone()).toBe(true);
    });
  });

  describe("stepBy()", () => {
    it("yields every nth element", async () => {
      const result = await asyncIterFromArray([0, 1, 2, 3, 4, 5, 6]).stepBy(2).collect();
      expect(result).toEqual([0, 2, 4, 6]);
    });

    it("step of 1 yields all elements", async () => {
      const result = await asyncIterFromArray([1, 2, 3]).stepBy(1).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("throws on step of 0", () => {
      expect(() => asyncIterFromArray([1, 2, 3]).stepBy(0)).toThrow("step must be positive");
    });
  });

  // --------------------------------------------------------------------------
  // AsyncIter namespace: sum, product, min, max
  // --------------------------------------------------------------------------

  describe("AsyncIter.sum()", () => {
    it("sums numbers", async () => {
      expect(await AsyncIter.sum(asyncIterFromArray([1, 2, 3, 4]))).toBe(10);
    });

    it("returns 0 for empty iterator", async () => {
      expect(await AsyncIter.sum(asyncIterFromArray([]))).toBe(0);
    });
  });

  describe("AsyncIter.product()", () => {
    it("multiplies numbers", async () => {
      expect(await AsyncIter.product(asyncIterFromArray([1, 2, 3, 4]))).toBe(24);
    });

    it("returns 1 for empty iterator", async () => {
      expect(await AsyncIter.product(asyncIterFromArray([]))).toBe(1);
    });
  });

  describe("AsyncIter.min()", () => {
    it("returns Some of minimum", async () => {
      const result = await AsyncIter.min(asyncIterFromArray([3, 1, 4, 1, 5]));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(1);
    });

    it("returns None for empty iterator", async () => {
      expect((await AsyncIter.min(asyncIterFromArray([]))).isNone()).toBe(true);
    });
  });

  describe("AsyncIter.max()", () => {
    it("returns Some of maximum", async () => {
      const result = await AsyncIter.max(asyncIterFromArray([3, 1, 4, 1, 5]));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(5);
    });

    it("returns None for empty iterator", async () => {
      expect((await AsyncIter.max(asyncIterFromArray([]))).isNone()).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // collectResult
  // --------------------------------------------------------------------------

  describe("collectResult()", () => {
    it("collects all-Ok into Ok array", async () => {
      const result = await asyncIterFromArray([Ok(1), Ok(2), Ok(3)]).collectResult();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("short-circuits on first Err", async () => {
      const result = await asyncIterFromArray([Ok(1), Err("fail"), Ok(3)]).collectResult();
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("fail");
    });

    it("returns Ok([]) for empty iterator", async () => {
      const result = await asyncIterFromArray([]).collectResult();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Peekable
  // --------------------------------------------------------------------------

  describe("peekable()", () => {
    it("peek returns next value without consuming", async () => {
      const iterator = asyncIterFromArray([1, 2, 3]).peekable();
      const peeked = await iterator.peek();
      expect(peeked.isSome()).toBe(true);
      expect(peeked.unwrap()).toBe(1);

      // Value should still be available
      const next = await iterator.next();
      expect(next.value).toBe(1);
    });

    it("peek returns None on empty iterator", async () => {
      const iterator = asyncIterFromArray<number>([]).peekable();
      const peeked = await iterator.peek();
      expect(peeked.isNone()).toBe(true);
    });

    it("multiple peeks return same value", async () => {
      const iterator = asyncIterFromArray([1, 2, 3]).peekable();
      expect((await iterator.peek()).unwrap()).toBe(1);
      expect((await iterator.peek()).unwrap()).toBe(1);
      expect((await iterator.next()).value).toBe(1);
      expect((await iterator.next()).value).toBe(2);
    });

    it("peek then collect includes peeked value", async () => {
      const iterator = asyncIterFromArray([1, 2, 3]).peekable();
      expect((await iterator.peek()).unwrap()).toBe(1);
      const result = await iterator.collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // asyncIterLines
  // --------------------------------------------------------------------------

  describe("asyncIterLines()", () => {
    const tmpDir = os.tmpdir();

    it("reads lines from a file", async () => {
      const filepath = path.join(tmpDir, "rustlike-async-test-lines.txt");
      fs.writeFileSync(filepath, "line1\nline2\nline3\n");
      try {
        const result = await asyncIterLines(filepath);
        expect(result.isOk()).toBe(true);
        const lines = await result.unwrap().collect();
        expect(lines).toEqual(["line1", "line2", "line3"]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });

    it("returns Err for non-existent file", async () => {
      const result = await asyncIterLines("/tmp/rustlike-async-nonexistent.txt");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Failed to access file");
    });

    it("handles empty file", async () => {
      const filepath = path.join(tmpDir, "rustlike-async-test-empty.txt");
      fs.writeFileSync(filepath, "");
      try {
        const result = await asyncIterLines(filepath);
        expect(result.isOk()).toBe(true);
        const lines = await result.unwrap().collect();
        expect(lines).toEqual([]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });

    it("handles file without trailing newline", async () => {
      const filepath = path.join(tmpDir, "rustlike-async-test-no-trailing.txt");
      fs.writeFileSync(filepath, "line1\nline2");
      try {
        const result = await asyncIterLines(filepath);
        expect(result.isOk()).toBe(true);
        const lines = await result.unwrap().collect();
        expect(lines).toEqual(["line1", "line2"]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Edge case inputs
  // --------------------------------------------------------------------------

  describe("edge case inputs", () => {
    it("nth(-1) returns None", async () => {
      expect((await asyncIterFromArray([1, 2, 3]).nth(-1)).isNone()).toBe(true);
    });

    it("take(-5) returns empty array", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).take(-5).collect()).toEqual([]);
    });

    it("skip(-2) skips nothing", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).skip(-2).collect()).toEqual([1, 2, 3]);
    });

    it("stepBy(-1) throws synchronously", () => {
      expect(() => asyncIterFromArray([1, 2, 3]).stepBy(-1)).toThrow("step must be positive");
    });

    it("stepBy(Infinity) yields only first element", async () => {
      expect(await asyncIterFromArray([1, 2, 3]).stepBy(Infinity).collect()).toEqual([1]);
    });

    it("double consumption returns empty on second collect", async () => {
      const it = asyncIterFromArray([1, 2, 3]);
      await it.collect();
      expect(await it.collect()).toEqual([]);
    });
  });
});
