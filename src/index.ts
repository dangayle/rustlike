/**
 * rustlike - TypeScript utilities for Rust-like programming
 *
 * Write TypeScript with Rust patterns: Result, Option, exhaustive matching,
 * immutability helpers, branded types, and lazy iterators.
 */

// Core ADTs (Result & Option)
export {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
  isOk,
  isErr,
  isSome,
  isNone,
  type Ok as OkType,
  type Err as ErrType,
  type Some as SomeType,
  type None as NoneType,
  type Result as ResultType,
  type Option as OptionType,
} from "./core";

// Async Result
export { AsyncResult } from "./async";

// Pattern matching
export { assertNever, match, matchKind, matchType } from "./match";

// Types and utilities
export {
  brand,
  newtype,
  isNonEmpty,
  nonEmpty,
  head,
  type DeepReadonly,
  type ReadonlyPick,
  type Brand,
  type NonEmptyArray,
} from "./types";

// Interop helpers
export {
  tryCatch,
  tryAsync,
  safeCall,
  safeCallAsync,
  safeTry,
  toThrowable,
  toThrowableAsync,
  toNullable,
  toNullableAsync,
  intoThrowable,
  intoNullable,
} from "./interop";

// Lazy iterators (sync)
export {
  iter,
  iterFromArray,
  iterFromGenerator,
  Iter,
  type Iter as IterType,
  type PeekableIter as PeekableIterType,
} from "./iter";

// Lazy iterators (async)
export {
  asyncIter,
  asyncIterFromArray,
  asyncIterFromIterable,
  asyncIterFromGenerator,
  AsyncIter,
  type AsyncIter as AsyncIterType,
  type PeekableAsyncIter as PeekableAsyncIterType,
} from "./async-iter";
