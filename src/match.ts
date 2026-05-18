/**
 * Exhaustive pattern matching utilities
 *
 * Ensures all cases are handled in discriminated unions.
 */

import { toPanicString } from "./core";

/**
 * Use in the default case of a switch to ensure exhaustiveness.
 * If the switch is not exhaustive, TypeScript will error because
 * the unhandled case type cannot be assigned to 'never'.
 *
 * @example
 * type Shape = { kind: 'circle'; radius: number } | { kind: 'rect'; w: number; h: number };
 *
 * function area(s: Shape): number {
 *   switch (s.kind) {
 *     case 'circle': return Math.PI * s.radius ** 2;
 *     case 'rect': return s.w * s.h;
 *     default: return assertNever(s);
 *   }
 * }
 */
export function assertNever(x: never, message?: string): never {
  if (message) {
    throw new Error(message);
  }
  throw new Error(`Unexpected value: ${toPanicString(x)}`);
}

/**
 * Type-safe exhaustive matching for discriminated unions.
 * Supports an optional catch-all '_' handler.
 *
 * @example
 * type Action =
 *   | { type: 'increment'; amount: number }
 *   | { type: 'decrement'; amount: number }
 *   | { type: 'reset' };
 *
 * const result = match(action, 'type', {
 *   increment: (a) => state + a.amount,
 *   decrement: (a) => state - a.amount,
 *   reset: () => 0,
 * });
 *
 * // With catch-all
 * const result = match(action, 'type', {
 *   increment: (a) => state + a.amount,
 *   _: () => state // catch-all
 * });
 */
export function match<T extends Record<K, string>, K extends keyof T, R>(
  value: T,
  discriminant: K,
  handlers:
    | { [P in T[K]]: (value: Extract<T, Record<K, P>>) => R }
    | ({ [P in T[K]]?: (value: Extract<T, Record<K, P>>) => R } & { _: (value: T) => R }),
): R {
  const key = value[discriminant] as T[K];
  const handlersRecord = handlers as Record<PropertyKey, ((value: T) => R) | undefined>;
  const handler = handlersRecord[key];

  if (handler) {
    return handler(value);
  }

  const catchAll = handlersRecord._;
  if (catchAll) {
    return catchAll(value);
  }

  // This should be unreachable if types are correct
  return assertNever(value as never, `Unhandled variant: ${key}`);
}

/**
 * Match on a discriminated union using the 'kind' discriminant (common pattern).
 *
 * @example
 * type Shape =
 *   | { kind: 'circle'; radius: number }
 *   | { kind: 'rect'; w: number; h: number };
 *
 * const area = matchKind(shape, {
 *   circle: (s) => Math.PI * s.radius ** 2,
 *   rect: (s) => s.w * s.h,
 * });
 *
 * // With catch-all
 * const isCircle = matchKind(shape, {
 *   circle: () => true,
 *   _: () => false
 * });
 */
export function matchKind<T extends { kind: string }, R>(
  value: T,
  handlers:
    | { [P in T["kind"]]: (value: Extract<T, { kind: P }>) => R }
    | ({ [P in T["kind"]]?: (value: Extract<T, { kind: P }>) => R } & { _: (value: T) => R }),
): R {
  return match(
    value,
    "kind",
    handlers as { [P in T["kind"]]: (value: Extract<T, Record<"kind", P>>) => R },
  );
}

/**
 * Match on a discriminated union using the 'type' discriminant (common pattern).
 *
 * @example
 * type Action =
 *   | { type: 'add'; item: string }
 *   | { type: 'remove'; id: number };
 *
 * const result = matchType(action, {
 *   add: (a) => [...items, a.item],
 *   remove: (a) => items.filter((_, i) => i !== a.id),
 * });
 */
export function matchType<T extends { type: string }, R>(
  value: T,
  handlers:
    | { [P in T["type"]]: (value: Extract<T, { type: P }>) => R }
    | ({ [P in T["type"]]?: (value: Extract<T, { type: P }>) => R } & { _: (value: T) => R }),
): R {
  return match(
    value,
    "type",
    handlers as { [P in T["type"]]: (value: Extract<T, Record<"type", P>>) => R },
  );
}
