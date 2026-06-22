/**
 * Interop helpers for wrapping third-party and standard library code
 */

import { Option, None, Result, Ok, Err } from "./core";

/**
 * One-shot: wrap a single throwing operation in a Result.
 * Use {@link safeTry} to create a reusable safe wrapper instead.
 *
 * @example
 * const result = tryCatch(() => JSON.parse(userInput));
 * // Result<unknown, unknown>
 */
export const tryCatch = <T, E = unknown>(fn: () => T): Result<T, E> => {
  try {
    return Ok(fn());
  } catch (e) {
    // Cast: TypeScript catch blocks type errors as `unknown`. The caller
    // narrows via the E parameter (defaulting to `unknown`). This is safe
    // because the caller opts into the cast by specifying E.
    return Err(e as E);
  }
};

/**
 * Wrap any async function that might reject to return Result
 *
 * @example
 * const result = await tryAsync(() => axios.get('/api/users'));
 * // Result<AxiosResponse, AxiosError>
 */
export const tryAsync = async <T, E = unknown>(fn: () => Promise<T>): Promise<Result<T, E>> => {
  try {
    return Ok(await fn());
  } catch (e) {
    // Cast: see tryCatch — caller narrows E via the type parameter.
    return Err(e as E);
  }
};

/**
 * Create a reusable Option-returning version of any function that may return
 * T | null | undefined or throw. Returns None on null, undefined, or throw.
 *
 * @example
 * const safeFind = safeCall((id: number) => users.find(u => u.id === id));
 * const user = safeFind(42); // Option<User>
 */
export const safeCall =
  <Args extends unknown[], T>(fn: (...args: Args) => T | null | undefined) =>
  (...args: Args): Option<T> => {
    try {
      return Option.from(fn(...args));
    } catch {
      return None;
    }
  };

/**
 * Create a reusable Option-returning version of any async function that may return
 * T | null | undefined or reject. Returns None on null, undefined, or rejection.
 *
 * @example
 * const safeFetch = safeCallAsync((url: string) => fetch(url).then(r => r.ok ? r : null));
 * const response = await safeFetch('/api'); // Option<Response>
 */
export const safeCallAsync =
  <Args extends unknown[], T>(fn: (...args: Args) => Promise<T | null | undefined>) =>
  async (...args: Args): Promise<Option<T>> => {
    try {
      return Option.from(await fn(...args));
    } catch {
      return None;
    }
  };

/**
 * Reusable: wrap a throwing function so every call returns a Result.
 * Use {@link tryCatch} for one-shot operations instead.
 *
 * @example
 * const safeJsonParse = safeTry(JSON.parse);
 * const data = safeJsonParse(input); // Result<unknown, unknown>
 */
export const safeTry =
  <Args extends unknown[], T, E = unknown>(fn: (...args: Args) => T) =>
  (...args: Args): Result<T, E> => {
    try {
      return Ok(fn(...args));
    } catch (e) {
      // Cast: see tryCatch — caller narrows E via the type parameter.
      return Err(e as E);
    }
  };

// ============================================================================
// Outbound interop: Rustlike → standard TypeScript
// ============================================================================

/**
 * Convert a single Result value to its unwrapped value, throwing the error if Err.
 * Use {@link toThrowable} to wrap an entire function instead.
 *
 * @example
 * const value = intoThrowable(Ok(42)); // 42
 * const value = intoThrowable(Err("boom")); // throws "boom"
 */
export const intoThrowable = <T, E>(result: Result<T, E>): T => {
  if (result.isOk()) return result.value;
  throw result.error;
};

/**
 * Convert a single Option value to T | null.
 * Returns the inner value for Some, or null for None.
 * Use {@link toNullable} to wrap an entire function instead.
 *
 * @example
 * const value = intoNullable(Some("hello")); // "hello"
 * const value = intoNullable(None); // null
 */
export const intoNullable = <T>(option: Option<T>): T | null => {
  return option.isSome() ? option.value : null;
};

/**
 * Wrap a Result-returning function so it returns T directly or throws E.
 * Creates a standard TypeScript function from a Rustlike one.
 * Use {@link intoThrowable} for one-shot value conversion instead.
 *
 * @example
 * const safeParse = (s: string): Result<Config, ParseError> => { ... };
 * const parse = toThrowable(safeParse);
 * // (s: string) => Config (throws ParseError)
 */
export const toThrowable =
  <Args extends unknown[], T, E>(fn: (...args: Args) => Result<T, E>) =>
  (...args: Args): T =>
    intoThrowable(fn(...args));

/**
 * Wrap an Option-returning function so it returns T | null.
 * Creates a standard TypeScript function from a Rustlike one.
 * Use {@link intoNullable} for one-shot value conversion instead.
 *
 * @example
 * const safeFind = (id: number): Option<User> => { ... };
 * const find = toNullable(safeFind);
 * // (id: number) => User | null
 */
export const toNullable =
  <Args extends unknown[], T>(fn: (...args: Args) => Option<T>) =>
  (...args: Args): T | null =>
    intoNullable(fn(...args));
