/**
 * Lazy Iterator: Iter<T>
 *
 * Rust-like lazy iterator wrappers around JavaScript's native Iterator protocol.
 * Enables composable, memory-efficient data processing pipelines.
 */

import { Option, Some, None, Result, Ok, Err } from "./core";

// ============================================================================
// Iter<T> Interface (Public API)
// ============================================================================

export interface Iter<T> {
  // Core transformation
  map<U>(fn: (value: T) => U): Iter<U>;
  filter(pred: (value: T) => boolean): Iter<T>;
  flatMap<U>(fn: (value: T) => Iterable<U>): Iter<U>;
  inspect(fn: (value: T) => void): Iter<T>;

  // Peekable adapter (matches Rust's peekable)
  peekable(): PeekableIter<T>;

  // Search
  find(pred: (value: T) => boolean): Option<T>;
  findMap<U>(fn: (value: T) => Option<U>): Option<U>;
  any(pred: (value: T) => boolean): boolean;
  all(pred: (value: T) => boolean): boolean;
  position(pred: (value: T) => boolean): Option<number>;

  // Aggregation
  fold<U>(init: U, fn: (acc: U, value: T) => U): U;
  reduce(fn: (acc: T, value: T) => T): Option<T>;
  tryFold<U, E>(init: U, fn: (acc: U, value: T) => Result<U, E>): Result<U, E>;
  count(): number;
  last(): Option<T>;
  nth(n: number): Option<T>;
  partition(pred: (value: T) => boolean): [T[], T[]];

  // Result integration
  tryMap<U, E>(fn: (value: T) => Result<U, E>): Iter<Result<U, E>>;

  // Limiting & skipping
  take(n: number): Iter<T>;
  skip(n: number): Iter<T>;
  stepBy(step: number): Iter<T>;

  // Enumerating (index, value pairs)
  enumerate(): Iter<readonly [number, T]>;

  // Combining iterators
  zip<U>(other: Iterable<U>): Iter<readonly [T, U]>;
  chain(other: Iterable<T>): Iter<T>;

  // Flattening nested iterators
  flatten<U>(this: Iter<Iterable<U>>): Iter<U>;

  // Result collection (Rust-like: collect::<Result<Vec<_>, E>>())
  collectResult<U, E>(this: Iter<Result<U, E>>): Result<U[], E>;

  // Consumption
  forEach(fn: (value: T) => void): void;
  collect(): T[];

  // Iterator protocol compliance
  [Symbol.iterator](): Iterator<T>;
  next(): IteratorResult<T>;
}

export interface PeekableIter<T> extends Iter<T> {
  // Peekable (for multi-line parsing)
  peek(): Option<T>;
}

// ============================================================================
// Internal Implementation
// ============================================================================

// Sentinel object for "no peeked value" state — reused across all instances.
const EMPTY_PEEK: Readonly<{ has: false; value: undefined }> = Object.freeze({
  has: false,
  value: undefined,
});

/**
 * Core iterator implementation using idiomatic TypeScript.
 * Uses generator functions internally for lazy evaluation.
 */
class IterImpl<T> implements Iter<T> {
  private readonly source: Iterator<T>;
  private peeked: { has: boolean; value: T | undefined } = EMPTY_PEEK;

  constructor(source: Iterator<T>) {
    this.source = source;
  }

  // -------------------------------------------------------------------------
  // Core transformation
  // -------------------------------------------------------------------------

  map<U>(fn: (value: T) => U): Iter<U> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const value of source) {
          yield fn(value);
        }
      })(),
    );
  }

  filter(pred: (value: T) => boolean): Iter<T> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const value of source) {
          if (pred(value)) {
            yield value;
          }
        }
      })(),
    );
  }

  flatMap<U>(fn: (value: T) => Iterable<U>): Iter<U> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const value of source) {
          for (const inner of fn(value)) {
            yield inner;
          }
        }
      })(),
    );
  }

  inspect(fn: (value: T) => void): Iter<T> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const value of source) {
          fn(value);
          yield value;
        }
      })(),
    );
  }

  peekable(): PeekableIter<T> {
    return this as PeekableIter<T>;
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  find(pred: (value: T) => boolean): Option<T> {
    for (const value of this) {
      if (pred(value)) {
        return Some(value);
      }
    }
    return None;
  }

  findMap<U>(fn: (value: T) => Option<U>): Option<U> {
    for (const value of this) {
      const result = fn(value);
      if (result.isSome()) {
        return result;
      }
    }
    return None;
  }

  any(pred: (value: T) => boolean): boolean {
    for (const value of this) {
      if (pred(value)) {
        return true;
      }
    }
    return false;
  }

  all(pred: (value: T) => boolean): boolean {
    for (const value of this) {
      if (!pred(value)) {
        return false;
      }
    }
    return true;
  }

  position(pred: (value: T) => boolean): Option<number> {
    let index = 0;
    for (const value of this) {
      if (pred(value)) {
        return Some(index);
      }
      index++;
    }
    return None;
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------

  fold<U>(init: U, fn: (acc: U, value: T) => U): U {
    let acc = init;
    for (const value of this) {
      acc = fn(acc, value);
    }
    return acc;
  }

  reduce(fn: (acc: T, value: T) => T): Option<T> {
    const first = this.next();
    if (first.done) {
      return None;
    }
    let acc = first.value;
    for (const value of this) {
      acc = fn(acc, value);
    }
    return Some(acc);
  }

  tryFold<U, E>(init: U, fn: (acc: U, value: T) => Result<U, E>): Result<U, E> {
    let acc = init;
    for (const value of this) {
      const result = fn(acc, value);
      if (result.isErr()) {
        return result;
      }
      acc = result.value;
    }
    return Ok(acc);
  }

  count(): number {
    let n = 0;
    for (const _value of this) {
      n++;
    }
    return n;
  }

  last(): Option<T> {
    let last: Option<T> = None;
    for (const value of this) {
      last = Some(value);
    }
    return last;
  }

  nth(n: number): Option<T> {
    if (n < 0) return None;
    let index = 0;
    for (const value of this) {
      if (index === n) {
        return Some(value);
      }
      index++;
    }
    return None;
  }

  partition(pred: (value: T) => boolean): [T[], T[]] {
    const matching: T[] = [];
    const rest: T[] = [];
    for (const value of this) {
      if (pred(value)) {
        matching.push(value);
      } else {
        rest.push(value);
      }
    }
    return [matching, rest];
  }

  // -------------------------------------------------------------------------
  // Result integration
  // -------------------------------------------------------------------------

  tryMap<U, E>(fn: (value: T) => Result<U, E>): Iter<Result<U, E>> {
    return this.map(fn);
  }

  // -------------------------------------------------------------------------
  // Limiting & skipping
  // -------------------------------------------------------------------------

  take(n: number): Iter<T> {
    const source = this;
    return new IterImpl(
      (function* () {
        let count = 0;
        const iterator = source[Symbol.iterator]();
        while (count < n) {
          const result = iterator.next();
          if (result.done) break;
          yield result.value;
          count++;
        }
      })(),
    );
  }

  skip(n: number): Iter<T> {
    const source = this;
    return new IterImpl(
      (function* () {
        let count = 0;
        for (const value of source) {
          if (count < n) {
            count++;
            continue;
          }
          yield value;
        }
      })(),
    );
  }

  stepBy(step: number): Iter<T> {
    if (step <= 0) {
      throw new Error("Iter.stepBy: step must be positive");
    }
    const source = this;
    return new IterImpl(
      (function* () {
        let index = 0;
        for (const value of source) {
          if (index % step === 0) {
            yield value;
          }
          index++;
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Enumerating
  // -------------------------------------------------------------------------

  enumerate(): Iter<readonly [number, T]> {
    const source = this;
    return new IterImpl(
      (function* () {
        let index = 0;
        for (const value of source) {
          yield [index, value] as const;
          index++;
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Combining iterators
  // -------------------------------------------------------------------------

  zip<U>(other: Iterable<U>): Iter<readonly [T, U]> {
    const source = this;
    return new IterImpl(
      (function* () {
        const otherIter = other[Symbol.iterator]();
        for (const value of source) {
          const otherResult = otherIter.next();
          if (otherResult.done) break;
          yield [value, otherResult.value] as const;
        }
      })(),
    );
  }

  chain(other: Iterable<T>): Iter<T> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const value of source) {
          yield value;
        }
        for (const value of other) {
          yield value;
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Flattening nested iterators
  // -------------------------------------------------------------------------

  flatten<U>(this: Iter<Iterable<U>>): Iter<U> {
    const source = this;
    return new IterImpl(
      (function* () {
        for (const inner of source) {
          for (const value of inner) {
            yield value;
          }
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Peekable
  // -------------------------------------------------------------------------

  peek(): Option<T> {
    if (this.peeked.has) {
      return Some(this.peeked.value as T);
    }
    const result = this.source.next();
    if (result.done) {
      return None;
    }
    this.peeked = { has: true, value: result.value };
    return Some(result.value);
  }

  // -------------------------------------------------------------------------
  // Result collection
  // -------------------------------------------------------------------------

  collectResult<U, E>(this: Iter<Result<U, E>>): Result<U[], E> {
    const out: U[] = [];
    for (const item of this) {
      if (item.isErr()) {
        return Err(item.error);
      }
      out.push(item.value);
    }
    return Ok(out);
  }

  // -------------------------------------------------------------------------
  // Consumption
  // -------------------------------------------------------------------------

  forEach(fn: (value: T) => void): void {
    for (const value of this) {
      fn(value);
    }
  }

  collect(): T[] {
    const result: T[] = [];
    for (const value of this) {
      result.push(value);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Iterator protocol
  // -------------------------------------------------------------------------

  [Symbol.iterator](): Iterator<T> {
    return this;
  }

  next(): IteratorResult<T> {
    // Check peeked value first
    if (this.peeked.has) {
      const value = this.peeked.value as T;
      this.peeked = EMPTY_PEEK;
      return { done: false, value };
    }
    return this.source.next();
  }
}

// ============================================================================
// Factory Functions (Public API)
// ============================================================================

/**
 * Create an Iter from an iterator or iterable source.
 *
 * @example
 * const numbers = iter([1, 2, 3, 4, 5]);
 * const doubled = numbers.map(x => x * 2).collect();
 */
export function iter<T>(source: Iterator<T> | Iterable<T>): Iter<T> {
  if (Symbol.iterator in source) {
    return new IterImpl(source[Symbol.iterator]());
  }
  return new IterImpl(source);
}

/**
 * Create an Iter from an array.
 * Convenience function for the common case of iterating over arrays.
 *
 * @example
 * const items = iterFromArray(['a', 'b', 'c']);
 */
export function iterFromArray<T>(arr: readonly T[]): Iter<T> {
  return new IterImpl(arr[Symbol.iterator]());
}

/**
 * Create an Iter from a generator function.
 * Useful for creating custom lazy sequences.
 *
 * @example
 * const naturals = iterFromGenerator(function* () {
 *   let n = 0;
 *   while (true) yield n++;
 * });
 * const firstTen = naturals.take(10).collect();
 */
export function iterFromGenerator<T>(gen: () => Generator<T>): Iter<T> {
  return new IterImpl(gen());
}

// ============================================================================
// Iter Namespace (Static Helpers)
// ============================================================================

export const Iter = {
  /**
   * Create an Iter from an iterator or iterable source.
   */
  from: iter,

  /**
   * Create an Iter from an array.
   */
  fromArray: iterFromArray,

  /**
   * Create an Iter from a generator function.
   */
  fromGenerator: iterFromGenerator,

  /**
   * Create an empty iterator.
   */
  empty: <T>(): Iter<T> => new IterImpl((function* () {})()),

  /**
   * Create an iterator that yields a single value.
   */
  once: <T>(value: T): Iter<T> =>
    new IterImpl(
      (function* () {
        yield value;
      })(),
    ),

  /**
   * Create an iterator that repeats a value n times.
   */
  repeat: <T>(value: T, n: number): Iter<T> =>
    new IterImpl(
      (function* () {
        for (let i = 0; i < n; i++) {
          yield value;
        }
      })(),
    ),

  /**
   * Create an iterator over a range of numbers.
   * @param start - Start of the range (inclusive)
   * @param end - End of the range (exclusive)
   * @param step - Step between values (default: 1)
   */
  range: (start: number, end: number, step = 1): Iter<number> =>
    new IterImpl(
      (function* () {
        if (step === 0) {
          throw new Error("Iter.range: step must be non-zero");
        }
        for (let i = start; step > 0 ? i < end : i > end; i += step) {
          yield i;
        }
      })(),
    ),

  /**
   * Sum all numbers in an iterator.
   */
  sum: (iterator: Iter<number>): number => iterator.fold(0, (acc, x) => acc + x),

  /**
   * Multiply all numbers in an iterator.
   */
  product: (iterator: Iter<number>): number => iterator.fold(1, (acc, x) => acc * x),

  /**
   * Return the minimum value, or None for empty iterators.
   */
  min: (iterator: Iter<number>): Option<number> => iterator.reduce((a, b) => (a <= b ? a : b)),

  /**
   * Return the maximum value, or None for empty iterators.
   */
  max: (iterator: Iter<number>): Option<number> => iterator.reduce((a, b) => (a >= b ? a : b)),
} as const;
