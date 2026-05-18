import { describe, it, expect, vi } from "vitest";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { iter, iterFromArray, iterFromGenerator, Iter } from "./iter";
import { iterLinesSync } from "./node";
import { Ok, Err, Some, None } from "./core";

// ============================================================================
// Iter Tests
// ============================================================================

describe("Iter", () => {
  // --------------------------------------------------------------------------
  // Factory functions
  // --------------------------------------------------------------------------

  describe("iter()", () => {
    it("creates an iterator from an array", () => {
      const result = iter([1, 2, 3]).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("creates an iterator from a Set", () => {
      const result = iter(new Set([1, 2, 3])).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("creates an iterator from a Map", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const result = iter(map).collect();
      expect(result).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("creates an iterator from a generator", () => {
      function* gen() {
        yield 1;
        yield 2;
        yield 3;
      }
      const result = iter(gen()).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("iterFromArray()", () => {
    it("creates an iterator from an array", () => {
      const result = iterFromArray([1, 2, 3]).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles empty arrays", () => {
      const result = iterFromArray([]).collect();
      expect(result).toEqual([]);
    });
  });

  describe("iterFromGenerator()", () => {
    it("creates an iterator from a generator function", () => {
      const result = iterFromGenerator(function* () {
        yield 1;
        yield 2;
        yield 3;
      }).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("Iter.empty()", () => {
    it("creates an empty iterator", () => {
      const result = Iter.empty<number>().collect();
      expect(result).toEqual([]);
    });
  });

  describe("Iter.once()", () => {
    it("creates an iterator with a single value", () => {
      const result = Iter.once(42).collect();
      expect(result).toEqual([42]);
    });
  });

  describe("Iter.repeat()", () => {
    it("creates an iterator that repeats a value", () => {
      const result = Iter.repeat("x", 3).collect();
      expect(result).toEqual(["x", "x", "x"]);
    });

    it("handles zero repeats", () => {
      const result = Iter.repeat("x", 0).collect();
      expect(result).toEqual([]);
    });
  });

  describe("Iter.range()", () => {
    it("creates a range of numbers", () => {
      const result = Iter.range(0, 5).collect();
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it("handles custom step", () => {
      const result = Iter.range(0, 10, 2).collect();
      expect(result).toEqual([0, 2, 4, 6, 8]);
    });

    it("handles negative step", () => {
      const result = Iter.range(5, 0, -1).collect();
      expect(result).toEqual([5, 4, 3, 2, 1]);
    });

    it("handles empty range", () => {
      const result = Iter.range(5, 5).collect();
      expect(result).toEqual([]);
    });

    it("throws on zero step to avoid infinite loop", () => {
      expect(() => Iter.range(0, 5, 0).collect()).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Core transformation
  // --------------------------------------------------------------------------

  describe("map()", () => {
    it("transforms each element", () => {
      const result = iter([1, 2, 3])
        .map((x) => x * 2)
        .collect();
      expect(result).toEqual([2, 4, 6]);
    });

    it("changes the type", () => {
      const result = iter([1, 2, 3])
        .map((x) => x.toString())
        .collect();
      expect(result).toEqual(["1", "2", "3"]);
    });

    it("is lazy - does not execute until consumed", () => {
      const fn = vi.fn((x: number) => x * 2);
      const mapped = iter([1, 2, 3]).map(fn);

      expect(fn).not.toHaveBeenCalled();

      mapped.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("filter()", () => {
    it("keeps only matching elements", () => {
      const result = iter([1, 2, 3, 4, 5])
        .filter((x) => x % 2 === 0)
        .collect();
      expect(result).toEqual([2, 4]);
    });

    it("handles no matches", () => {
      const result = iter([1, 2, 3])
        .filter((x) => x > 10)
        .collect();
      expect(result).toEqual([]);
    });

    it("is lazy - does not execute until consumed", () => {
      const fn = vi.fn((x: number) => x > 1);
      const filtered = iter([1, 2, 3]).filter(fn);

      expect(fn).not.toHaveBeenCalled();

      filtered.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // Aggregation
  // --------------------------------------------------------------------------

  describe("fold()", () => {
    it("reduces the iterator to a single value", () => {
      const result = iter([1, 2, 3, 4]).fold(0, (acc, x) => acc + x);
      expect(result).toBe(10);
    });

    it("handles empty iterator", () => {
      const result = iter<number>([]).fold(42, (acc, x) => acc + x);
      expect(result).toBe(42);
    });

    it("can build an object", () => {
      const result = iter(["a", "b", "c"]).fold({} as Record<string, number>, (acc, x) => {
        acc[x] = x.charCodeAt(0);
        return acc;
      });
      expect(result).toEqual({ a: 97, b: 98, c: 99 });
    });
  });

  describe("tryFold()", () => {
    it("folds while operations succeed", () => {
      const result = iter([1, 2, 3]).tryFold(0, (acc, x) => Ok(acc + x));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });

    it("short-circuits on first error", () => {
      const fn = vi.fn((acc: number, x: number) => {
        if (x === 2) return Err("error at 2");
        return Ok(acc + x);
      });

      const result = iter([1, 2, 3]).tryFold(0, fn);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error at 2");
      expect(fn).toHaveBeenCalledTimes(2); // Called for 1 and 2, not 3
    });

    it("handles empty iterator", () => {
      const result = iter<number>([]).tryFold(42, (acc, x) => Ok(acc + x));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });
  });

  // --------------------------------------------------------------------------
  // Result integration
  // --------------------------------------------------------------------------

  describe("tryMap()", () => {
    it("maps with a fallible function", () => {
      const result = iter([1, 2, 3])
        .tryMap((x) => (x > 1 ? Ok(x * 2) : Err("too small")))
        .collect();

      expect(result).toHaveLength(3);
      const [r0, r1, r2] = result;
      expect(r0?.isErr()).toBe(true);
      expect(r1?.unwrap()).toBe(4);
      expect(r2?.unwrap()).toBe(6);
    });

    it("allows filtering out errors", () => {
      const result = iter([1, 2, 3])
        .tryMap((x) => (x > 1 ? Ok(x * 2) : Err("too small")))
        .filter((r) => r.isOk())
        .map((r) => r.unwrap())
        .collect();

      expect(result).toEqual([4, 6]);
    });
  });

  // --------------------------------------------------------------------------
  // Limiting & skipping
  // --------------------------------------------------------------------------

  describe("take()", () => {
    it("takes the first n elements", () => {
      const result = iter([1, 2, 3, 4, 5]).take(3).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles taking more than available", () => {
      const result = iter([1, 2]).take(5).collect();
      expect(result).toEqual([1, 2]);
    });

    it("handles taking zero", () => {
      const result = iter([1, 2, 3]).take(0).collect();
      expect(result).toEqual([]);
    });

    it("is lazy - only consumes what is needed", () => {
      const fn = vi.fn((x: number) => x * 2);
      const result = iter([1, 2, 3, 4, 5]).map(fn).take(2).collect();

      expect(result).toEqual([2, 4]);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("skip()", () => {
    it("skips the first n elements", () => {
      const result = iter([1, 2, 3, 4, 5]).skip(2).collect();
      expect(result).toEqual([3, 4, 5]);
    });

    it("handles skipping more than available", () => {
      const result = iter([1, 2]).skip(5).collect();
      expect(result).toEqual([]);
    });

    it("handles skipping zero", () => {
      const result = iter([1, 2, 3]).skip(0).collect();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  // --------------------------------------------------------------------------
  // Enumerating
  // --------------------------------------------------------------------------

  describe("enumerate()", () => {
    it("adds indices to elements", () => {
      const result = iter(["a", "b", "c"]).enumerate().collect();
      expect(result).toEqual([
        [0, "a"],
        [1, "b"],
        [2, "c"],
      ]);
    });

    it("handles empty iterator", () => {
      const result = iter([]).enumerate().collect();
      expect(result).toEqual([]);
    });

    it("works with other transformations", () => {
      const result = iter(["a", "b", "c", "d"])
        .enumerate()
        .filter(([i]) => i % 2 === 0)
        .map(([, v]) => v)
        .collect();
      expect(result).toEqual(["a", "c"]);
    });
  });

  // --------------------------------------------------------------------------
  // Combining iterators
  // --------------------------------------------------------------------------

  describe("zip()", () => {
    it("combines two iterators element-wise", () => {
      const result = iter([1, 2, 3]).zip(["a", "b", "c"]).collect();
      expect(result).toEqual([
        [1, "a"],
        [2, "b"],
        [3, "c"],
      ]);
    });

    it("stops when the shorter iterator is exhausted", () => {
      const result = iter([1, 2, 3]).zip(["a", "b"]).collect();
      expect(result).toEqual([
        [1, "a"],
        [2, "b"],
      ]);
    });

    it("handles empty first iterator", () => {
      const result = iter<number>([]).zip(["a", "b"]).collect();
      expect(result).toEqual([]);
    });

    it("handles empty second iterator", () => {
      const result = iter([1, 2]).zip([]).collect();
      expect(result).toEqual([]);
    });
  });

  describe("chain()", () => {
    it("concatenates two iterators", () => {
      const result = iter([1, 2]).chain([3, 4]).collect();
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("handles empty first iterator", () => {
      const result = iter<number>([]).chain([1, 2]).collect();
      expect(result).toEqual([1, 2]);
    });

    it("handles empty second iterator", () => {
      const result = iter([1, 2]).chain([]).collect();
      expect(result).toEqual([1, 2]);
    });

    it("is lazy - second iterator not consumed until first is exhausted", () => {
      let secondStarted = false;
      function* second() {
        secondStarted = true;
        yield 3;
        yield 4;
      }

      const chained = iter([1, 2]).chain({ [Symbol.iterator]: second });

      // Get first element
      const first = chained.next();
      expect(first.value).toBe(1);
      expect(secondStarted).toBe(false);

      // Consume the rest
      chained.collect();
      expect(secondStarted).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Flattening nested iterators
  // --------------------------------------------------------------------------

  describe("flatten()", () => {
    it("flattens nested arrays", () => {
      const result = iter([[1, 2], [3, 4], [5]])
        .flatten()
        .collect();
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("handles empty nested arrays", () => {
      const result = iter([[], [1], [], [2, 3], []])
        .flatten()
        .collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles empty outer iterator", () => {
      const result = iter<number[]>([]).flatten().collect();
      expect(result).toEqual([]);
    });

    it("is lazy - inner iterators consumed on-demand", () => {
      let innerConsumed = 0;
      function* makeInner(values: number[]) {
        for (const v of values) {
          innerConsumed++;
          yield v;
        }
      }

      const nested = [makeInner([1, 2]), makeInner([3, 4])];
      const flattened = iter(nested).flatten();

      expect(innerConsumed).toBe(0);

      flattened.take(2).collect();
      expect(innerConsumed).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Peekable
  // --------------------------------------------------------------------------

  describe("peek()", () => {
    it("returns the next value without consuming it", () => {
      const iterator = iter([1, 2, 3]).peekable();

      const peeked = iterator.peek();
      expect(peeked.isSome()).toBe(true);
      expect(peeked.unwrap()).toBe(1);

      // Value should still be available
      const next = iterator.next();
      expect(next.value).toBe(1);
    });

    it("returns None on empty iterator", () => {
      const iterator = iter<number>([]).peekable();
      const peeked = iterator.peek();
      expect(peeked.isNone()).toBe(true);
    });

    it("returns the same value on multiple peeks", () => {
      const iterator = iter([1, 2, 3]).peekable();

      expect(iterator.peek().unwrap()).toBe(1);
      expect(iterator.peek().unwrap()).toBe(1);
      expect(iterator.peek().unwrap()).toBe(1);

      expect(iterator.next().value).toBe(1);
      expect(iterator.next().value).toBe(2);
    });

    it("works correctly after advancing", () => {
      const iterator = iter([1, 2, 3]).peekable();

      iterator.next(); // consume 1
      expect(iterator.peek().unwrap()).toBe(2);

      iterator.next(); // consume 2
      expect(iterator.peek().unwrap()).toBe(3);

      iterator.next(); // consume 3
      expect(iterator.peek().isNone()).toBe(true);
    });

    it("integrates with other methods", () => {
      const iterator = iter([1, 2, 3, 4, 5]).peekable();

      // Peek at first
      expect(iterator.peek().unwrap()).toBe(1);

      // Now collect - should include peeked value
      const result = iterator.collect();
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it("works through peekable adapter for Rust parity", () => {
      const iterator = iter([10, 20, 30]).peekable();
      expect(iterator.peek().unwrap()).toBe(10);
      expect(iterator.next().value).toBe(10);
      expect(iterator.next().value).toBe(20);
    });
  });

  // --------------------------------------------------------------------------
  // Consumption
  // --------------------------------------------------------------------------

  describe("forEach()", () => {
    it("calls function for each element", () => {
      const results: number[] = [];
      iter([1, 2, 3]).forEach((x) => results.push(x));
      expect(results).toEqual([1, 2, 3]);
    });

    it("handles empty iterator", () => {
      const fn = vi.fn();
      iter([]).forEach(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("collect()", () => {
    it("collects all elements into an array", () => {
      const result = iter([1, 2, 3]).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("handles empty iterator", () => {
      const result = iter([]).collect();
      expect(result).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Iterator protocol
  // --------------------------------------------------------------------------

  describe("Iterator protocol", () => {
    it("can be used in for...of", () => {
      const results: number[] = [];
      for (const x of iter([1, 2, 3])) {
        results.push(x);
      }
      expect(results).toEqual([1, 2, 3]);
    });

    it("can be spread", () => {
      const result = [...iter([1, 2, 3])];
      expect(result).toEqual([1, 2, 3]);
    });

    it("can use next() directly", () => {
      const iterator = iter([1, 2, 3]);

      expect(iterator.next()).toEqual({ done: false, value: 1 });
      expect(iterator.next()).toEqual({ done: false, value: 2 });
      expect(iterator.next()).toEqual({ done: false, value: 3 });
      expect(iterator.next()).toEqual({ done: true, value: undefined });
    });
  });

  // --------------------------------------------------------------------------
  // Complex pipelines
  // --------------------------------------------------------------------------

  describe("Complex pipelines", () => {
    it("chains multiple operations", () => {
      const result = iter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .filter((x) => x % 2 === 0)
        .map((x) => x * 10)
        .take(3)
        .collect();

      expect(result).toEqual([20, 40, 60]);
    });

    it("handles pagination pattern", () => {
      // Simulate paginated data
      const pages = [{ items: [1, 2, 3] }, { items: [4, 5, 6] }, { items: [7, 8, 9] }];

      const result = iter(pages)
        .map((page) => page.items)
        .flatten()
        .filter((x) => x > 3)
        .take(4)
        .collect();

      expect(result).toEqual([4, 5, 6, 7]);
    });

    it("handles CSV parsing pattern", () => {
      const csv = ["name,age", "alice,30", "bob,25", "carol,35"];

      const result = iter(csv)
        .skip(1) // skip header
        .map((line) => {
          const parts = line.split(",");
          // Ensure we have parts before accessing
          if (parts.length < 2) return { name: "unknown", age: 0 };
          return { name: parts[0], age: parseInt(parts[1] || "0", 10) };
        })
        .filter((person) => person.age >= 30)
        .collect();

      expect(result).toEqual([
        { name: "alice", age: 30 },
        { name: "carol", age: 35 },
      ]);
    });

    it("handles line numbering pattern", () => {
      const lines = ["first", "second", "third"];

      const result = iter(lines)
        .enumerate()
        .map(([i, line]) => `${i + 1}: ${line}`)
        .collect();

      expect(result).toEqual(["1: first", "2: second", "3: third"]);
    });
  });

  // --------------------------------------------------------------------------
  // find, any, all, count, last, reduce, flatMap, inspect
  // --------------------------------------------------------------------------

  describe("find()", () => {
    it("returns Some for first match", () => {
      const result = iter([1, 2, 3, 4]).find((x) => x > 2);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(3);
    });

    it("returns None when no match", () => {
      const result = iter([1, 2, 3]).find((x) => x > 10);
      expect(result.isNone()).toBe(true);
    });

    it("returns None for empty iterator", () => {
      const result = iter<number>([]).find((x) => x > 0);
      expect(result.isNone()).toBe(true);
    });
  });

  describe("any()", () => {
    it("returns true when predicate matches any", () => {
      expect(iter([1, 2, 3]).any((x) => x === 2)).toBe(true);
    });

    it("returns false when predicate matches none", () => {
      expect(iter([1, 2, 3]).any((x) => x > 10)).toBe(false);
    });

    it("returns false for empty iterator", () => {
      expect(iter<number>([]).any((x) => x > 0)).toBe(false);
    });

    it("short-circuits on first match", () => {
      const fn = vi.fn((x: number) => x === 2);
      iter([1, 2, 3]).any(fn);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("all()", () => {
    it("returns true when predicate matches all", () => {
      expect(iter([2, 4, 6]).all((x) => x % 2 === 0)).toBe(true);
    });

    it("returns false when predicate fails for any", () => {
      expect(iter([2, 3, 6]).all((x) => x % 2 === 0)).toBe(false);
    });

    it("returns true for empty iterator", () => {
      expect(iter<number>([]).all((x) => x > 0)).toBe(true);
    });

    it("short-circuits on first failure", () => {
      const fn = vi.fn((x: number) => x % 2 === 0);
      iter([2, 3, 6]).all(fn);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("count()", () => {
    it("counts elements", () => {
      expect(iter([1, 2, 3]).count()).toBe(3);
    });

    it("returns 0 for empty iterator", () => {
      expect(iter([]).count()).toBe(0);
    });
  });

  describe("last()", () => {
    it("returns Some of last element", () => {
      const result = iter([1, 2, 3]).last();
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(3);
    });

    it("returns None for empty iterator", () => {
      expect(iter([]).last().isNone()).toBe(true);
    });
  });

  describe("reduce()", () => {
    it("reduces without initial value", () => {
      const result = iter([1, 2, 3]).reduce((a, b) => a + b);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(6);
    });

    it("returns None for empty iterator", () => {
      const result = iter<number>([]).reduce((a, b) => a + b);
      expect(result.isNone()).toBe(true);
    });

    it("returns the single element for one-element iterator", () => {
      const result = iter([42]).reduce((a, b) => a + b);
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("flatMap()", () => {
    it("maps and flattens", () => {
      const result = iter([1, 2, 3])
        .flatMap((x) => [x, x * 10])
        .collect();
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });

    it("handles empty results", () => {
      const result = iter([1, 2, 3])
        .flatMap((x) => (x === 2 ? [] : [x]))
        .collect();
      expect(result).toEqual([1, 3]);
    });
  });

  describe("inspect()", () => {
    it("calls function for each element without modifying", () => {
      const inspected: number[] = [];
      const result = iter([1, 2, 3])
        .inspect((x) => inspected.push(x))
        .map((x) => x * 2)
        .collect();
      expect(inspected).toEqual([1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    it("is lazy", () => {
      const fn = vi.fn();
      const inspected = iter([1, 2, 3]).inspect(fn);
      expect(fn).not.toHaveBeenCalled();
      inspected.collect();
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  // --------------------------------------------------------------------------
  // nth, position, partition, findMap, stepBy
  // --------------------------------------------------------------------------

  describe("nth()", () => {
    it("returns Some for valid index", () => {
      const result = iter([10, 20, 30, 40]).nth(2);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(30);
    });

    it("returns None for out-of-range index", () => {
      expect(iter([1, 2]).nth(5).isNone()).toBe(true);
    });

    it("returns first element for n=0", () => {
      expect(iter([10, 20]).nth(0).unwrap()).toBe(10);
    });

    it("returns None for empty iterator", () => {
      expect(iter<number>([]).nth(0).isNone()).toBe(true);
    });
  });

  describe("position()", () => {
    it("returns Some index of first match", () => {
      const result = iter([10, 20, 30, 40]).position((x) => x === 30);
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(2);
    });

    it("returns None when no match", () => {
      expect(
        iter([1, 2, 3])
          .position((x) => x > 10)
          .isNone(),
      ).toBe(true);
    });

    it("returns None for empty iterator", () => {
      expect(
        iter<number>([])
          .position((x) => x > 0)
          .isNone(),
      ).toBe(true);
    });
  });

  describe("partition()", () => {
    it("splits elements into matching and non-matching", () => {
      const [evens, odds] = iter([1, 2, 3, 4, 5]).partition((x) => x % 2 === 0);
      expect(evens).toEqual([2, 4]);
      expect(odds).toEqual([1, 3, 5]);
    });

    it("handles all matching", () => {
      const [matching, rest] = iter([2, 4, 6]).partition((x) => x % 2 === 0);
      expect(matching).toEqual([2, 4, 6]);
      expect(rest).toEqual([]);
    });

    it("handles empty iterator", () => {
      const [a, b] = iter<number>([]).partition((x) => x > 0);
      expect(a).toEqual([]);
      expect(b).toEqual([]);
    });
  });

  describe("findMap()", () => {
    it("returns first Some result", () => {
      const result = iter([1, 2, 3, 4]).findMap((x) => (x > 2 ? Some(x * 10) : None));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(30);
    });

    it("returns None when all map to None", () => {
      const result = iter([1, 2, 3]).findMap((_x) => None);
      expect(result.isNone()).toBe(true);
    });

    it("returns None for empty iterator", () => {
      const result = iter<number>([]).findMap((x) => Some(x));
      expect(result.isNone()).toBe(true);
    });
  });

  describe("stepBy()", () => {
    it("yields every nth element", () => {
      const result = iter([0, 1, 2, 3, 4, 5, 6]).stepBy(2).collect();
      expect(result).toEqual([0, 2, 4, 6]);
    });

    it("step of 1 yields all elements", () => {
      const result = iter([1, 2, 3]).stepBy(1).collect();
      expect(result).toEqual([1, 2, 3]);
    });

    it("step larger than length yields only first", () => {
      const result = iter([1, 2, 3]).stepBy(10).collect();
      expect(result).toEqual([1]);
    });

    it("throws on step of 0", () => {
      expect(() => iter([1, 2]).stepBy(0)).toThrow("step must be positive");
    });

    it("throws on negative step", () => {
      expect(() => iter([1, 2]).stepBy(-1)).toThrow("step must be positive");
    });

    it("handles Infinity step (yields only first)", () => {
      const result = iter([1, 2, 3]).stepBy(Infinity).collect();
      expect(result).toEqual([1]);
    });
  });

  // --------------------------------------------------------------------------
  // collectResult
  // --------------------------------------------------------------------------

  describe("collectResult()", () => {
    it("collects all-Ok into Ok array", () => {
      const result = iter([Ok(1), Ok(2), Ok(3)]).collectResult();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([1, 2, 3]);
    });

    it("short-circuits on first Err", () => {
      const result = iter([Ok(1), Err("fail"), Ok(3)]).collectResult();
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("fail");
    });

    it("returns Ok([]) for empty iterator", () => {
      const result = iter([]).collectResult();
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Iter namespace: sum, product, min, max
  // --------------------------------------------------------------------------

  describe("Iter.sum()", () => {
    it("sums numbers", () => {
      expect(Iter.sum(iter([1, 2, 3, 4]))).toBe(10);
    });

    it("returns 0 for empty iterator", () => {
      expect(Iter.sum(iter([]))).toBe(0);
    });
  });

  describe("Iter.product()", () => {
    it("multiplies numbers", () => {
      expect(Iter.product(iter([1, 2, 3, 4]))).toBe(24);
    });

    it("returns 1 for empty iterator", () => {
      expect(Iter.product(iter([]))).toBe(1);
    });
  });

  describe("Iter.min()", () => {
    it("returns Some of minimum", () => {
      const result = Iter.min(iter([3, 1, 4, 1, 5]));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(1);
    });

    it("returns None for empty iterator", () => {
      expect(Iter.min(iter([])).isNone()).toBe(true);
    });
  });

  describe("Iter.max()", () => {
    it("returns Some of maximum", () => {
      const result = Iter.max(iter([3, 1, 4, 1, 5]));
      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(5);
    });

    it("returns None for empty iterator", () => {
      expect(Iter.max(iter([])).isNone()).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Edge case inputs (Phase 4b)
  // --------------------------------------------------------------------------

  describe("edge case inputs", () => {
    it("nth(-1) returns None", () => {
      expect(iter([1, 2, 3]).nth(-1).isNone()).toBe(true);
    });

    it("take(-5) returns empty", () => {
      expect(iter([1, 2, 3]).take(-5).collect()).toEqual([]);
    });

    it("skip(-2) skips nothing", () => {
      expect(iter([1, 2, 3]).skip(-2).collect()).toEqual([1, 2, 3]);
    });

    it("double consumption returns empty on second collect", () => {
      const i = iter([1, 2, 3]);
      expect(i.collect()).toEqual([1, 2, 3]);
      expect(i.collect()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // iterLinesSync
  // --------------------------------------------------------------------------

  describe("iterLinesSync()", () => {
    const tmpDir = os.tmpdir();

    it("reads lines from a file", () => {
      const filepath = path.join(tmpDir, "rustlike-test-lines.txt");
      fs.writeFileSync(filepath, "line1\nline2\nline3\n");
      try {
        const result = iterLinesSync(filepath);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().collect()).toEqual(["line1", "line2", "line3"]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });

    it("returns Err for non-existent file", () => {
      const result = iterLinesSync("/tmp/rustlike-nonexistent-file.txt");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toContain("Failed to read file");
    });

    it("handles empty file", () => {
      const filepath = path.join(tmpDir, "rustlike-test-empty.txt");
      fs.writeFileSync(filepath, "");
      try {
        const result = iterLinesSync(filepath);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().collect()).toEqual([]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });

    it("handles file without trailing newline", () => {
      const filepath = path.join(tmpDir, "rustlike-test-no-trailing.txt");
      fs.writeFileSync(filepath, "line1\nline2");
      try {
        const result = iterLinesSync(filepath);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap().collect()).toEqual(["line1", "line2"]);
      } finally {
        fs.unlinkSync(filepath);
      }
    });
  });
});
