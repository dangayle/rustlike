/**
 * Immutability and utility types for Rust-like TypeScript
 */

import { Result, Ok, Err } from "./core";

/**
 * Recursively make all properties readonly (deep immutability)
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends object
        ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
        : T;

/**
 * Make specific properties readonly
 */
export type ReadonlyPick<T, K extends keyof T> = Omit<T, K> & Readonly<Pick<T, K>>;

/**
 * Branded type for nominal typing (like Rust's newtype pattern)
 *
 * @example
 * type UserId = Brand<number, 'UserId'>;
 * type OrderId = Brand<number, 'OrderId'>;
 *
 * // These are now incompatible even though both are numbers
 * const userId: UserId = 1 as UserId;
 * const orderId: OrderId = userId; // Error!
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Create a branded type constructor
 *
 * @example
 * const UserId = brand<number, 'UserId'>();
 * const id = UserId(42); // type is Brand<number, 'UserId'>
 */
export const brand =
  <T, B>() =>
  (value: T): Brand<T, B> =>
    value as Brand<T, B>;

/**
 * NonEmpty array type - guarantees at least one element
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Check if array is non-empty (type guard)
 */
export const isNonEmpty = <T>(arr: readonly T[]): arr is NonEmptyArray<T> => arr.length > 0;

/**
 * Create a non-empty array from values
 */
export const nonEmpty = <T>(first: T, ...rest: T[]): NonEmptyArray<T> => [first, ...rest];

/**
 * Get the first element of a non-empty array (guaranteed to exist)
 */
export const head = <T>(arr: NonEmptyArray<T>): T => arr[0];

/**
 * Create a newtype with validation (Rust's newtype pattern + smart constructor).
 * Implements the "parse, don't validate" pattern - make invalid states unrepresentable.
 *
 * @example
 * const EmailAddress = newtype<string, 'Email'>(
 *   (s) => s.includes('@'),
 *   "Invalid email"
 * );
 *
 * const email = EmailAddress.parse(userInput);
 * // Result<Brand<string, 'Email'>, string>
 *
 * @example
 * const PositiveNumber = newtype<number, 'Positive'>(
 *   (n) => n > 0,
 *   (n) => `Expected positive, got ${n}`
 * );
 */
export const newtype = <T, B, E = string>(
  validate: (value: T) => boolean,
  error: E | ((value: T) => E),
): {
  parse: (value: T) => Result<Brand<T, B>, E>;
  unsafe: (value: T) => Brand<T, B>;
} => {
  const getError = (value: T): E => {
    if (typeof error === "function") {
      return (error as (value: T) => E)(value);
    }
    return error;
  };

  return {
    /**
     * Parse and validate the input, returning a Result with the branded type on success.
     */
    parse: (value: T): Result<Brand<T, B>, E> => {
      if (validate(value)) {
        return Ok(value as Brand<T, B>);
      }
      return Err(getError(value));
    },

    /**
     * Unsafely cast a value to the branded type without validation.
     * Use only when you know the value is valid (e.g., from a trusted source).
     */
    unsafe: (value: T): Brand<T, B> => value as Brand<T, B>,
  };
};
