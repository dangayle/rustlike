/**
 * Core Algebraic Data Types: Option<T> and Result<T, E>
 *
 * This file merges Result and Option to allow seamless interoperation
 * (converting Result -> Option and vice versa) without circular dependencies.
 */

// ============================================================================
// Option<T> Definitions
// ============================================================================

export interface Some<T> {
  readonly some: true;
  readonly value: T;
  map<U>(fn: (value: T) => U): Option<U>;
  mapOr<U>(defaultValue: U, fn: (value: T) => U): U;
  mapOrElse<U>(defaultFn: () => U, fn: (value: T) => U): U;
  andThen<U>(fn: (value: T) => Option<U>): Option<U>;
  and<U>(other: Option<U>): Option<U>;
  or(other: Option<T>): Option<T>;
  orElse(fn: () => Option<T>): Option<T>;
  xor(other: Option<T>): Option<T>;
  filter(predicate: (value: T) => boolean): Option<T>;
  contains(value: T): boolean;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: () => T): T;
  expect(message: string): T;
  match<U>(handlers: { some: (value: T) => U; none: () => U }): U;
  okOr<E>(error: E): Result<T, E>;
  zip<U>(other: Option<U>): Option<readonly [T, U]>;
  /** Flatten nested Option<Option<T>> to Option<T> */
  flatten<U>(this: Option<Option<U>>): Option<U>;
  /** Inspect the value if present, without modifying it */
  inspect(fn: (value: T) => void): Option<T>;
  isSome(): this is Some<T>;
  isNone(): this is None;
}

export interface None {
  readonly some: false;
  map<U>(fn: (value: never) => U): Option<U>;
  mapOr<U>(defaultValue: U, fn: (value: never) => U): U;
  mapOrElse<U>(defaultFn: () => U, fn: (value: never) => U): U;
  andThen<U>(fn: (value: never) => Option<U>): Option<U>;
  and<U>(other: Option<U>): None;
  or<T>(other: Option<T>): Option<T>;
  orElse<T>(fn: () => Option<T>): Option<T>;
  xor<T>(other: Option<T>): Option<T>;
  filter(predicate: (value: never) => boolean): None;
  contains(value: unknown): false;
  unwrap(): never;
  unwrapOr<T>(defaultValue: T): T;
  unwrapOrElse<T>(fn: () => T): T;
  expect(message: string): never;
  match<U>(handlers: { some: (value: never) => U; none: () => U }): U;
  okOr<E>(error: E): Result<never, E>;
  zip<U>(other: Option<U>): None;
  /** Flatten nested Option<Option<T>> to Option<T> */
  flatten<U>(this: Option<Option<U>>): Option<U>;
  /** Inspect the value if present, without modifying it */
  inspect(fn: (value: never) => void): Option<never>;
  isSome(): this is Some<never>;
  isNone(): this is None;
}

export type Option<T> = Some<T> | None;

// ============================================================================
// Result<T, E> Definitions
// ============================================================================

export interface Ok<T, E = never> {
  readonly ok: true;
  readonly value: T;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapOr<U>(defaultValue: U, fn: (value: T) => U): U;
  mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U): U;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  and<U>(other: Result<U, E>): Result<U, E>;
  or<F>(other: Result<T, F>): Result<T, F>;
  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F>;
  contains(value: T): boolean;
  containsErr(error: E): boolean;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: (error: E) => T): T;
  expect(message: string): T;
  /** Get the error or throw (panics if Ok) */
  unwrapErr(): E;
  /** Get the error or throw with custom message (panics if Ok) */
  expectErr(message: string): E;
  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U;
  /** Convert to Option<T>, discarding the error if any */
  toOption(): Option<T>;
  /** Convert to Option<E>, discarding the value if any */
  err(): Option<E>;
  /** Flatten nested Result<Result<T, E>, E> to Result<T, E> */
  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E>;
  /** Inspect the value if Ok, without modifying it */
  inspect(fn: (value: T) => void): Result<T, E>;
  /** Inspect the error if Err, without modifying it */
  inspectErr(fn: (error: E) => void): Result<T, E>;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<E, T>;
}

export interface Err<E, T = never> {
  readonly ok: false;
  readonly error: E;
  map<U>(fn: (value: T) => U): Result<U, E>;
  mapOr<U>(defaultValue: U, fn: (value: T) => U): U;
  mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U): U;
  mapErr<F>(fn: (error: E) => F): Result<T, F>;
  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  and<U>(other: Result<U, E>): Result<U, E>;
  or<F>(other: Result<T, F>): Result<T, F>;
  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F>;
  contains(value: T): boolean;
  containsErr(error: E): boolean;
  unwrap(): T;
  unwrapOr(defaultValue: T): T;
  unwrapOrElse(fn: (error: E) => T): T;
  expect(message: string): T;
  /** Get the error (panics if Ok) */
  unwrapErr(): E;
  /** Get the error or return it (identity for Err) */
  expectErr(message: string): E;
  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U;
  /** Convert to Option<T>, discarding the error if any */
  toOption(): Option<T>;
  /** Convert to Option<E>, discarding the value if any */
  err(): Option<E>;
  /** Flatten nested Result<Result<T, E>, E> to Result<T, E> */
  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E>;
  /** Inspect the value if Ok, without modifying it */
  inspect(fn: (value: T) => void): Result<T, E>;
  /** Inspect the error if Err, without modifying it */
  inspectErr(fn: (error: E) => void): Result<T, E>;
  isOk(): this is Ok<T, E>;
  isErr(): this is Err<E, T>;
}

export type Result<T, E> = Ok<T, E> | Err<E, T>;

// ============================================================================
// Internal Helper: JSON Stringify for Panic Messages
// ============================================================================

const PANIC_STRING_MAX_LENGTH = 200;

export function toPanicString(value: unknown): string {
  let str: string;
  if (value instanceof Error) {
    str = value.message;
  } else {
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  }
  if (str.length > PANIC_STRING_MAX_LENGTH) {
    return str.slice(0, PANIC_STRING_MAX_LENGTH) + "...";
  }
  return str;
}

// ============================================================================
// Option Implementation
// ============================================================================

class SomeImpl<T> implements Some<T> {
  readonly some = true as const;
  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Option<U> {
    return new SomeImpl(fn(this.value));
  }

  mapOr<U>(_defaultValue: U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapOrElse<U>(_defaultFn: () => U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  andThen<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }

  and<U>(other: Option<U>): Option<U> {
    return other;
  }

  or(_other: Option<T>): Option<T> {
    return this;
  }

  orElse(_fn: () => Option<T>): Option<T> {
    return this;
  }

  xor(other: Option<T>): Option<T> {
    return other.isSome() ? NoneValue : this;
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : NoneValue;
  }

  contains(value: T): boolean {
    return this.value === value;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: () => T): T {
    return this.value;
  }

  expect(_message: string): T {
    return this.value;
  }

  match<U>(handlers: { some: (value: T) => U; none: () => U }): U {
    return handlers.some(this.value);
  }

  okOr<E>(_error: E): Result<T, E> {
    return new OkImpl(this.value);
  }

  zip<U>(other: Option<U>): Option<readonly [T, U]> {
    return other.isSome() ? new SomeImpl([this.value, other.value] as const) : NoneValue;
  }

  flatten<U>(this: Option<Option<U>>): Option<U> {
    return this.unwrap();
  }

  inspect(fn: (value: T) => void): Option<T> {
    fn(this.value);
    return this;
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None {
    return false;
  }
}

class NoneImpl implements None {
  readonly some = false as const;

  map<U>(_fn: (value: never) => U): Option<U> {
    return this as unknown as Option<U>;
  }

  mapOr<U>(defaultValue: U, _fn: (value: never) => U): U {
    return defaultValue;
  }

  mapOrElse<U>(defaultFn: () => U, _fn: (value: never) => U): U {
    return defaultFn();
  }

  andThen<U>(_fn: (value: never) => Option<U>): Option<U> {
    return this as unknown as Option<U>;
  }

  and<U>(_other: Option<U>): None {
    return this;
  }

  or<T>(other: Option<T>): Option<T> {
    return other;
  }

  orElse<T>(fn: () => Option<T>): Option<T> {
    return fn();
  }

  xor<T>(other: Option<T>): Option<T> {
    return other;
  }

  filter(_predicate: (value: never) => boolean): None {
    return this;
  }

  contains(_value: unknown): false {
    return false;
  }

  unwrap(): never {
    throw new Error("Called unwrap on None");
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse<T>(fn: () => T): T {
    return fn();
  }

  expect(message: string): never {
    throw new Error(message);
  }

  match<U>(handlers: { some: (value: never) => U; none: () => U }): U {
    return handlers.none();
  }

  okOr<E>(error: E): Result<never, E> {
    return new ErrImpl(error);
  }

  zip<U>(_other: Option<U>): None {
    return this;
  }

  flatten<U>(this: Option<Option<U>>): Option<U> {
    return this as unknown as Option<U>;
  }

  inspect(_fn: (value: never) => void): Option<never> {
    return this;
  }

  isSome(): this is Some<never> {
    return false;
  }

  isNone(): this is None {
    return true;
  }
}

// Singleton None value (frozen for immutability)
const NoneValue: None = Object.freeze(new NoneImpl()) as None;

// ============================================================================
// Result Implementation
// ============================================================================

class OkImpl<T, E = never> implements Ok<T, E> {
  readonly ok = true as const;
  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new OkImpl(fn(this.value));
  }

  mapOr<U>(_defaultValue: U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapOrElse<U>(_defaultFn: (error: E) => U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  and<U>(other: Result<U, E>): Result<U, E> {
    return other;
  }

  or<F>(_other: Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  orElse<F>(_fn: (error: E) => Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  contains(value: T): boolean {
    return this.value === value;
  }

  containsErr(_error: E): boolean {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: (error: E) => T): T {
    return this.value;
  }

  expect(_message: string): T {
    return this.value;
  }

  unwrapErr(): E {
    throw new Error(`Called unwrapErr on Ok: ${toPanicString(this.value)}`);
  }

  expectErr(message: string): E {
    throw new Error(`${message}: ${toPanicString(this.value)}`);
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.ok(this.value);
  }

  toOption(): Option<T> {
    return new SomeImpl(this.value);
  }

  err(): Option<E> {
    return NoneValue;
  }

  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E> {
    return this.unwrap();
  }

  inspect(fn: (value: T) => void): Result<T, E> {
    fn(this.value);
    return this;
  }

  inspectErr(_fn: (error: E) => void): Result<T, E> {
    return this;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<E, T> {
    return false;
  }
}

class ErrImpl<E, T = never> implements Err<E, T> {
  readonly ok = false as const;
  constructor(readonly error: E) {}

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapOr<U>(defaultValue: U, _fn: (value: T) => U): U {
    return defaultValue;
  }

  mapOrElse<U>(defaultFn: (error: E) => U, _fn: (value: T) => U): U {
    return defaultFn(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new ErrImpl(fn(this.error));
  }

  andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  and<U>(_other: Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  or<F>(other: Result<T, F>): Result<T, F> {
    return other;
  }

  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return fn(this.error);
  }

  contains(_value: T): boolean {
    return false;
  }

  containsErr(error: E): boolean {
    return this.error === error;
  }

  unwrap(): T {
    throw new Error(`Called unwrap on Err: ${toPanicString(this.error)}`);
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse(fn: (error: E) => T): T {
    return fn(this.error);
  }

  expect(message: string): T {
    throw new Error(`${message}: ${toPanicString(this.error)}`);
  }

  unwrapErr(): E {
    return this.error;
  }

  expectErr(_message: string): E {
    return this.error;
  }

  match<U>(handlers: { ok: (value: T) => U; err: (error: E) => U }): U {
    return handlers.err(this.error);
  }

  toOption(): Option<T> {
    return NoneValue;
  }

  err(): Option<E> {
    return new SomeImpl(this.error);
  }

  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  inspect(_fn: (value: T) => void): Result<T, E> {
    return this;
  }

  inspectErr(fn: (error: E) => void): Result<T, E> {
    fn(this.error);
    return this;
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<E, T> {
    return true;
  }
}

// ============================================================================
// Constructors (Public API)
// ============================================================================

export const Some = <T>(value: T): Some<T> => new SomeImpl(value);
export const None: None = NoneValue;
export const Ok = <T, E = never>(value: T): Ok<T, E> => new OkImpl(value);
export const Err = <E, T = never>(error: E): Err<E, T> => new ErrImpl(error);

// ============================================================================
// Type Guards
// ============================================================================

export const isSome = <T>(option: Option<T>): option is Some<T> => option.some;
export const isNone = <T>(option: Option<T>): option is None => !option.some;
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T, E> => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E, T> => !result.ok;

// ============================================================================
// Namespaces (Static Helpers)
// ============================================================================

export const Option = {
  some: Some,
  none: None,
  isSome,
  isNone,

  from: <T>(value: T | null | undefined): Option<T> => (value != null ? Some(value) : None),

  map: <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> => option.map(fn),

  andThen: <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> => option.andThen(fn),

  or: <T>(option: Option<T>, other: Option<T>): Option<T> => option.or(other),

  orElse: <T>(option: Option<T>, fn: () => Option<T>): Option<T> => option.orElse(fn),

  filter: <T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> =>
    option.some ? option.filter(predicate) : None,

  unwrap: <T>(option: Option<T>): T => option.unwrap(),

  unwrapOr: <T>(option: Option<T>, defaultValue: T): T => option.unwrapOr(defaultValue),

  unwrapOrElse: <T>(option: Option<T>, fn: () => T): T => option.unwrapOrElse(fn),

  match: <T, U>(option: Option<T>, handlers: { some: (value: T) => U; none: () => U }): U =>
    option.match(handlers),

  zip: <T, U>(a: Option<T>, b: Option<U>): Option<readonly [T, U]> => a.zip(b),

  okOr: <T, E>(option: Option<T>, error: E): Result<T, E> =>
    option.some ? Ok(option.value) : Err(error),

  flatten: <T>(option: Option<Option<T>>): Option<T> => option.flatten(),

  transpose: <T, E>(option: Option<Result<T, E>>): Result<Option<T>, E> => {
    if (option.isSome()) {
      const val = option.unwrap();
      if (val.isOk()) {
        return Ok(Some(val.unwrap()));
      } else {
        return Err(val.unwrapErr());
      }
    }
    return Ok(None);
  },

  /**
   * Combine multiple Options into a single Option of an array.
   * Returns None if any Option is None.
   *
   * @example
   * const options = Option.all([Some(1), Some(2), Some(3)]);
   * // Some([1, 2, 3])
   *
   * const withNone = Option.all([Some(1), None, Some(3)]);
   * // None
   */
  all: <T>(options: readonly Option<T>[]): Option<T[]> => {
    const values: T[] = [];
    for (const option of options) {
      if (option.isNone()) {
        return None;
      }
      values.push(option.value);
    }
    return Some(values);
  },

  /** Alias for {@link all} — Rust's collect pattern. */
  collect: <T>(options: readonly Option<T>[]): Option<T[]> => Option.all(options),
} as const;

export const Result = {
  ok: Ok,
  err: Err,
  isOk,
  isErr,

  map: <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => result.map(fn),

  mapErr: <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> => result.mapErr(fn),

  andThen: <T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> =>
    result.andThen(fn),

  orElse: <T, E, F>(result: Result<T, E>, fn: (error: E) => Result<T, F>): Result<T, F> =>
    result.orElse(fn),

  unwrap: <T, E>(result: Result<T, E>): T => result.unwrap(),

  unwrapOr: <T, E>(result: Result<T, E>, defaultValue: T): T => result.unwrapOr(defaultValue),

  unwrapOrElse: <T, E>(result: Result<T, E>, fn: (error: E) => T): T => result.unwrapOrElse(fn),

  unwrapErr: <T, E>(result: Result<T, E>): E => result.unwrapErr(),

  expectErr: <T, E>(result: Result<T, E>, message: string): E => result.expectErr(message),

  match: <T, E, U>(
    result: Result<T, E>,
    handlers: { ok: (value: T) => U; err: (error: E) => U },
  ): U => result.match(handlers),

  toOption: <T, E>(result: Result<T, E>): Option<T> => result.toOption(),

  fromThrowable: <T, E = unknown>(fn: () => T): Result<T, E> => {
    try {
      return Ok(fn());
    } catch (e) {
      // Cast: TypeScript catch blocks type errors as `unknown`. The caller
      // narrows via the E parameter (defaulting to `unknown`).
      return Err(e as E);
    }
  },

  fromPromise: async <T, E = unknown>(promise: Promise<T>): Promise<Result<T, E>> => {
    try {
      return Ok(await promise);
    } catch (e) {
      // Cast: see fromThrowable — caller narrows E via the type parameter.
      return Err(e as E);
    }
  },

  flatten: <T, E>(result: Result<Result<T, E>, E>): Result<T, E> => result.flatten(),

  transpose: <T, E>(result: Result<Option<T>, E>): Option<Result<T, E>> => {
    if (result.isOk()) {
      const val = result.unwrap();
      if (val.isSome()) {
        return Some(Ok(val.unwrap()));
      } else {
        return None;
      }
    }
    // If Result is Err, we wrap it in Some: Some(Err(e))
    return Some(Err(result.unwrapErr()));
  },

  /**
   * Combine multiple Results into a single Result of an array.
   * Short-circuits on the first Err encountered.
   *
   * @example
   * const results = Result.all([Ok(1), Ok(2), Ok(3)]);
   * // Ok([1, 2, 3])
   *
   * const withErr = Result.all([Ok(1), Err("failed"), Ok(3)]);
   * // Err("failed")
   */
  all: <T, E>(results: readonly Result<T, E>[]): Result<T[], E> => {
    const values: T[] = [];
    for (const result of results) {
      if (result.isErr()) {
        return result as unknown as Result<T[], E>;
      }
      values.push(result.value);
    }
    return Ok(values);
  },

  /** Alias for {@link all} — Rust's collect pattern. */
  collect: <T, E>(results: readonly Result<T, E>[]): Result<T[], E> => Result.all(results),
} as const;
