/**
 * Async Lazy Iterator: AsyncIter<T>
 *
 * Rust-like async lazy iterator wrapper around JavaScript's native AsyncIterator protocol.
 * Enables composable, memory-efficient async data processing pipelines.
 */

import { Result, Ok, Err, Option, Some, None } from "./core";

// ============================================================================
// AsyncIter<T> Interface (Public API)
// ============================================================================

export interface AsyncIter<T> {
  // Core transformation
  map<U>(fn: (value: T) => U | Promise<U>): AsyncIter<U>;
  filter(pred: (value: T) => boolean | Promise<boolean>): AsyncIter<T>;
  flatMap<U>(fn: (value: T) => Iterable<U> | AsyncIterable<U>): AsyncIter<U>;
  inspect(fn: (value: T) => void | Promise<void>): AsyncIter<T>;

  // Peekable adapter (matches Rust's peekable)
  peekable(): PeekableAsyncIter<T>;

  // Search
  find(pred: (value: T) => boolean | Promise<boolean>): Promise<Option<T>>;
  findMap<U>(fn: (value: T) => Option<U> | Promise<Option<U>>): Promise<Option<U>>;
  any(pred: (value: T) => boolean | Promise<boolean>): Promise<boolean>;
  all(pred: (value: T) => boolean | Promise<boolean>): Promise<boolean>;
  position(pred: (value: T) => boolean | Promise<boolean>): Promise<Option<number>>;

  // Aggregation
  fold<U>(init: U, fn: (acc: U, value: T) => U | Promise<U>): Promise<U>;
  reduce(fn: (acc: T, value: T) => T | Promise<T>): Promise<Option<T>>;
  tryFold<U, E>(
    init: U,
    fn: (acc: U, value: T) => Result<U, E> | Promise<Result<U, E>>,
  ): Promise<Result<U, E>>;
  count(): Promise<number>;
  last(): Promise<Option<T>>;
  nth(n: number): Promise<Option<T>>;
  partition(pred: (value: T) => boolean | Promise<boolean>): Promise<[T[], T[]]>;

  // Result integration
  tryMap<U, E>(fn: (value: T) => Result<U, E> | Promise<Result<U, E>>): AsyncIter<Result<U, E>>;

  // Limiting & skipping
  take(n: number): AsyncIter<T>;
  skip(n: number): AsyncIter<T>;
  stepBy(step: number): AsyncIter<T>;

  // Enumerating (index, value pairs)
  enumerate(): AsyncIter<readonly [number, T]>;

  // Combining iterators
  zip<U>(other: AsyncIterable<U>): AsyncIter<readonly [T, U]>;
  chain(other: AsyncIterable<T>): AsyncIter<T>;

  // Flattening nested iterators
  flatten<U>(this: AsyncIter<AsyncIterable<U> | Iterable<U>>): AsyncIter<U>;

  // Result collection (Rust-like: collect::<Result<Vec<_>, E>>())
  collectResult<U, E>(this: AsyncIter<Result<U, E>>): Promise<Result<U[], E>>;

  // Consumption
  forEach(fn: (value: T) => void | Promise<void>): Promise<void>;
  collect(): Promise<T[]>;

  // Async iterator protocol compliance
  [Symbol.asyncIterator](): AsyncIterator<T>;
  next(): Promise<IteratorResult<T>>;
}

export interface PeekableAsyncIter<T> extends AsyncIter<T> {
  // Peekable (for multi-line parsing)
  peek(): Promise<Option<T>>;
}

// ============================================================================
// Internal Implementation
// ============================================================================

/**
 * Core async iterator implementation using idiomatic TypeScript.
 * Uses async generator functions internally for lazy evaluation.
 */
class AsyncIterImpl<T> implements AsyncIter<T> {
  private readonly source: AsyncIterator<T>;
  private peeked: Promise<IteratorResult<T>> | null = null;

  constructor(source: AsyncIterator<T>) {
    this.source = source;
  }

  // -------------------------------------------------------------------------
  // Core transformation
  // -------------------------------------------------------------------------

  map<U>(fn: (value: T) => U | Promise<U>): AsyncIter<U> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const value of source) {
          yield await fn(value);
        }
      })(),
    );
  }

  filter(pred: (value: T) => boolean | Promise<boolean>): AsyncIter<T> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const value of source) {
          if (await pred(value)) {
            yield value;
          }
        }
      })(),
    );
  }

  flatMap<U>(fn: (value: T) => Iterable<U> | AsyncIterable<U>): AsyncIter<U> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const value of source) {
          const inner = fn(value);
          if (Symbol.asyncIterator in inner) {
            for await (const item of inner) {
              yield item;
            }
          } else {
            for (const item of inner) {
              yield item;
            }
          }
        }
      })(),
    );
  }

  inspect(fn: (value: T) => void | Promise<void>): AsyncIter<T> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const value of source) {
          await fn(value);
          yield value;
        }
      })(),
    );
  }

  peekable(): PeekableAsyncIter<T> {
    return this as PeekableAsyncIter<T>;
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  async find(pred: (value: T) => boolean | Promise<boolean>): Promise<Option<T>> {
    for await (const value of this) {
      if (await pred(value)) {
        return Some(value);
      }
    }
    return None;
  }

  async findMap<U>(fn: (value: T) => Option<U> | Promise<Option<U>>): Promise<Option<U>> {
    for await (const value of this) {
      const result = await fn(value);
      if (result.isSome()) {
        return result;
      }
    }
    return None;
  }

  async any(pred: (value: T) => boolean | Promise<boolean>): Promise<boolean> {
    for await (const value of this) {
      if (await pred(value)) {
        return true;
      }
    }
    return false;
  }

  async all(pred: (value: T) => boolean | Promise<boolean>): Promise<boolean> {
    for await (const value of this) {
      if (!(await pred(value))) {
        return false;
      }
    }
    return true;
  }

  async position(pred: (value: T) => boolean | Promise<boolean>): Promise<Option<number>> {
    let index = 0;
    for await (const value of this) {
      if (await pred(value)) {
        return Some(index);
      }
      index++;
    }
    return None;
  }

  // -------------------------------------------------------------------------
  // Aggregation
  // -------------------------------------------------------------------------

  async fold<U>(init: U, fn: (acc: U, value: T) => U | Promise<U>): Promise<U> {
    let acc = init;
    for await (const value of this) {
      acc = await fn(acc, value);
    }
    return acc;
  }

  async reduce(fn: (acc: T, value: T) => T | Promise<T>): Promise<Option<T>> {
    const first = await this.next();
    if (first.done) {
      return None;
    }
    let acc = first.value;
    for await (const value of this) {
      acc = await fn(acc, value);
    }
    return Some(acc);
  }

  async tryFold<U, E>(
    init: U,
    fn: (acc: U, value: T) => Result<U, E> | Promise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    let acc = init;
    for await (const value of this) {
      const result = await fn(acc, value);
      if (result.isErr()) {
        return result;
      }
      acc = result.value;
    }
    return Ok(acc);
  }

  async count(): Promise<number> {
    let n = 0;
    for await (const _value of this) {
      n++;
    }
    return n;
  }

  async last(): Promise<Option<T>> {
    let last: Option<T> = None;
    for await (const value of this) {
      last = Some(value);
    }
    return last;
  }

  async nth(n: number): Promise<Option<T>> {
    if (n < 0) return None;
    let index = 0;
    for await (const value of this) {
      if (index === n) {
        return Some(value);
      }
      index++;
    }
    return None;
  }

  async partition(pred: (value: T) => boolean | Promise<boolean>): Promise<[T[], T[]]> {
    const matching: T[] = [];
    const rest: T[] = [];
    for await (const value of this) {
      if (await pred(value)) {
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

  tryMap<U, E>(fn: (value: T) => Result<U, E> | Promise<Result<U, E>>): AsyncIter<Result<U, E>> {
    return this.map(fn);
  }

  // -------------------------------------------------------------------------
  // Limiting & skipping
  // -------------------------------------------------------------------------

  take(n: number): AsyncIter<T> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        let count = 0;
        const iterator = source[Symbol.asyncIterator]();
        while (count < n) {
          const result = await iterator.next();
          if (result.done) break;
          yield result.value;
          count++;
        }
      })(),
    );
  }

  skip(n: number): AsyncIter<T> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        let count = 0;
        for await (const value of source) {
          if (count < n) {
            count++;
            continue;
          }
          yield value;
        }
      })(),
    );
  }

  stepBy(step: number): AsyncIter<T> {
    if (step <= 0) {
      throw new Error("AsyncIter.stepBy: step must be positive");
    }
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        let index = 0;
        for await (const value of source) {
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

  enumerate(): AsyncIter<readonly [number, T]> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        let index = 0;
        for await (const value of source) {
          yield [index, value] as const;
          index++;
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Combining iterators
  // -------------------------------------------------------------------------

  zip<U>(other: AsyncIterable<U>): AsyncIter<readonly [T, U]> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        const otherIter = other[Symbol.asyncIterator]();
        for await (const value of source) {
          const otherResult = await otherIter.next();
          if (otherResult.done) break;
          yield [value, otherResult.value] as const;
        }
      })(),
    );
  }

  chain(other: AsyncIterable<T>): AsyncIter<T> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const value of source) {
          yield value;
        }
        for await (const value of other) {
          yield value;
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Flattening nested iterators
  // -------------------------------------------------------------------------

  flatten<U>(this: AsyncIter<AsyncIterable<U> | Iterable<U>>): AsyncIter<U> {
    const source = this;
    return new AsyncIterImpl(
      (async function* () {
        for await (const inner of source) {
          // Handle both sync and async iterables
          if (Symbol.asyncIterator in inner) {
            for await (const value of inner) {
              yield value;
            }
          } else {
            for (const value of inner) {
              yield value;
            }
          }
        }
      })(),
    );
  }

  // -------------------------------------------------------------------------
  // Peekable
  // -------------------------------------------------------------------------

  async peek(): Promise<Option<T>> {
    this.peeked ??= this.source.next();
    const result = await this.peeked;
    if (result.done) {
      return None;
    }
    return Some(result.value);
  }

  // -------------------------------------------------------------------------
  // Result collection
  // -------------------------------------------------------------------------

  async collectResult<U, E>(this: AsyncIter<Result<U, E>>): Promise<Result<U[], E>> {
    const out: U[] = [];
    for await (const item of this) {
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

  async forEach(fn: (value: T) => void | Promise<void>): Promise<void> {
    for await (const value of this) {
      await fn(value);
    }
  }

  async collect(): Promise<T[]> {
    const result: T[] = [];
    for await (const value of this) {
      result.push(value);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Async iterator protocol
  // -------------------------------------------------------------------------

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }

  next(): Promise<IteratorResult<T>> {
    if (this.peeked) {
      const promise = this.peeked;
      this.peeked = null;
      return promise;
    }
    return this.source.next();
  }
}

// ============================================================================
// Factory Functions (Public API)
// ============================================================================

/**
 * Create an AsyncIter from an async iterator or async iterable source.
 *
 * @example
 * const items = asyncIter(fetchPages());
 * const processed = await items.map(processPage).collect();
 */
export function asyncIter<T>(source: AsyncIterator<T> | AsyncIterable<T>): AsyncIter<T> {
  if (Symbol.asyncIterator in source) {
    return new AsyncIterImpl(source[Symbol.asyncIterator]());
  }
  return new AsyncIterImpl(source);
}

/**
 * Create an AsyncIter from a sync iterable.
 * Useful for lifting sync data into async pipelines.
 *
 * @example
 * const items = asyncIterFromIterable([1, 2, 3]);
 */
export function asyncIterFromIterable<T>(source: Iterable<T>): AsyncIter<T> {
  return new AsyncIterImpl(
    (async function* () {
      for (const value of source) {
        yield value;
      }
    })(),
  );
}

/**
 * Create an AsyncIter from an array.
 * Convenience function for the common case.
 *
 * @example
 * const items = asyncIterFromArray(['a', 'b', 'c']);
 */
export function asyncIterFromArray<T>(arr: readonly T[]): AsyncIter<T> {
  return asyncIterFromIterable(arr);
}

/**
 * Create an AsyncIter from an async generator function.
 * Useful for creating custom lazy async sequences.
 *
 * @example
 * const pages = asyncIterFromGenerator(async function* () {
 *   let page = 1;
 *   while (true) {
 *     const data = await fetchPage(page++);
 *     if (data.length === 0) break;
 *     yield data;
 *   }
 * });
 */
export function asyncIterFromGenerator<T>(gen: () => AsyncGenerator<T>): AsyncIter<T> {
  return new AsyncIterImpl(gen());
}

// ============================================================================
// AsyncIter Namespace (Static Helpers)
// ============================================================================

export const AsyncIter = {
  /**
   * Create an AsyncIter from an async iterator or async iterable source.
   */
  from: asyncIter,

  /**
   * Create an AsyncIter from a sync iterable.
   */
  fromIterable: asyncIterFromIterable,

  /**
   * Create an AsyncIter from an array.
   */
  fromArray: asyncIterFromArray,

  /**
   * Create an AsyncIter from an async generator function.
   */
  fromGenerator: asyncIterFromGenerator,

  /**
   * Create an empty async iterator.
   */
  empty: <T>(): AsyncIter<T> => new AsyncIterImpl((async function* () {})()),

  /**
   * Create an async iterator that yields a single value.
   */
  once: <T>(value: T): AsyncIter<T> =>
    new AsyncIterImpl(
      (async function* () {
        yield value;
      })(),
    ),

  /**
   * Create an async iterator that repeats a value n times.
   */
  repeat: <T>(value: T, n: number): AsyncIter<T> =>
    new AsyncIterImpl(
      (async function* () {
        for (let i = 0; i < n; i++) {
          yield value;
        }
      })(),
    ),

  /**
   * Create an async iterator over a range of numbers.
   */
  range: (start: number, end: number, step = 1): AsyncIter<number> =>
    new AsyncIterImpl(
      (async function* () {
        if (step === 0) {
          throw new Error("AsyncIter.range: step must be non-zero");
        }
        for (let i = start; step > 0 ? i < end : i > end; i += step) {
          yield i;
        }
      })(),
    ),

  /**
   * Sum all numbers in an async iterator.
   */
  sum: (iterator: AsyncIter<number>): Promise<number> => iterator.fold(0, (acc, x) => acc + x),

  /**
   * Multiply all numbers in an async iterator.
   */
  product: (iterator: AsyncIter<number>): Promise<number> => iterator.fold(1, (acc, x) => acc * x),

  /**
   * Return the minimum value, or None for empty iterators.
   */
  min: (iterator: AsyncIter<number>): Promise<Option<number>> =>
    iterator.reduce((a, b) => (a <= b ? a : b)),

  /**
   * Return the maximum value, or None for empty iterators.
   */
  max: (iterator: AsyncIter<number>): Promise<Option<number>> =>
    iterator.reduce((a, b) => (a >= b ? a : b)),
} as const;
