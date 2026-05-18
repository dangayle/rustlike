/**
 * AsyncResult<T, E> - Handling asynchronous Results chaining
 */

import { Result, Ok, Err, Option } from "./core";

export class AsyncResult<T, E> implements PromiseLike<Result<T, E>> {
  constructor(private readonly promise: Promise<Result<T, E>>) {}

  /**
   * Create an AsyncResult from a Promise<Result<T, E>>
   */
  static fromPromise<T, E>(promise: Promise<Result<T, E>>): AsyncResult<T, E> {
    return new AsyncResult(promise);
  }

  /**
   * Create an AsyncResult that resolves to Ok(value)
   */
  static ok<T, E = never>(value: T): AsyncResult<T, E> {
    return new AsyncResult(Promise.resolve(Ok(value)));
  }

  /**
   * Create an AsyncResult that resolves to Err(error)
   */
  static err<E, T = never>(error: E): AsyncResult<T, E> {
    return new AsyncResult(Promise.resolve(Err(error)));
  }

  /**
   * Wrap an async function that might reject into an AsyncResult.
   * This is the async equivalent of Result.fromThrowable().
   *
   * @example
   * const result = await AsyncResult.fromThrowable(() => fetch('/api/users'));
   * // AsyncResult<Response, unknown>
   */
  static fromThrowable<T, E = unknown>(fn: () => Promise<T>): AsyncResult<T, E> {
    try {
      return new AsyncResult(
        fn()
          .then((value) => Ok(value) as Result<T, E>)
          // Cast: TypeScript catch blocks type errors as `unknown`. The caller
          // narrows via the E parameter (defaulting to `unknown`).
          .catch((error: unknown) => Err(error as E) as Result<T, E>),
      );
    } catch (e) {
      return new AsyncResult(Promise.resolve(Err(e as E) as Result<T, E>));
    }
  }

  /**
   * Map the inner Ok value using a synchronous or asynchronous function.
   * If the function returns a Promise, it is awaited.
   */
  map<U>(fn: (value: T) => U | Promise<U>): AsyncResult<U, E> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isErr()) return res as unknown as Result<U, E>;
        // If the mapping function throws, we let Promise rejection propagate
        // to stay consistent with sync map throwing (Rust panics on map errors).
        const value = await fn(res.value);
        return Ok(value);
      }),
    );
  }

  /**
   * Map the inner Err value using a synchronous or asynchronous function.
   */
  mapErr<F>(fn: (error: E) => F | Promise<F>): AsyncResult<T, F> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isOk()) return res as unknown as Result<T, F>;
        const error = await fn(res.error);
        return Err(error);
      }),
    );
  }

  /**
   * Chain another Result-returning operation (sync or async).
   * Supports returning: Result, AsyncResult, or Promise<Result>.
   */
  andThen<U>(
    fn: (value: T) => Result<U, E> | AsyncResult<U, E> | Promise<Result<U, E>>,
  ): AsyncResult<U, E> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isErr()) return res as unknown as Result<U, E>;

        const next = fn(res.value);
        if (next instanceof AsyncResult) {
          return await next.toPromise();
        }
        return await next;
      }),
    );
  }

  /**
   * Handle the error case with another Result-returning operation.
   */
  orElse<F>(
    fn: (error: E) => Result<T, F> | AsyncResult<T, F> | Promise<Result<T, F>>,
  ): AsyncResult<T, F> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isOk()) return res as unknown as Result<T, F>;

        const next = fn(res.error);
        if (next instanceof AsyncResult) {
          return await next.toPromise();
        }
        return await next;
      }),
    );
  }

  /**
   * Inspect the Ok value if present, without modifying it.
   * The callback can be synchronous or asynchronous.
   */
  inspect(fn: (value: T) => void | Promise<void>): AsyncResult<T, E> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isOk()) {
          await fn(res.value);
        }
        return res;
      }),
    );
  }

  /**
   * Inspect the Err value if present, without modifying it.
   * The callback can be synchronous or asynchronous.
   */
  inspectErr(fn: (error: E) => void | Promise<void>): AsyncResult<T, E> {
    return new AsyncResult(
      this.promise.then(async (res) => {
        if (res.isErr()) {
          await fn(res.error);
        }
        return res;
      }),
    );
  }

  /**
   * Pattern match on the result (async).
   */
  match<U>(handlers: {
    ok: (value: T) => U | Promise<U>;
    err: (error: E) => U | Promise<U>;
  }): Promise<U> {
    return this.promise.then((res) => res.match(handlers));
  }

  /**
   * Unwrap the value or throw (reject).
   */
  async unwrap(): Promise<T> {
    const res = await this.promise;
    return res.unwrap();
  }

  /**
   * Unwrap or return default.
   */
  async unwrapOr(defaultValue: T): Promise<T> {
    const res = await this.promise;
    return res.unwrapOr(defaultValue);
  }

  /**
   * Unwrap or compute default.
   */
  async unwrapOrElse(fn: (error: E) => T | Promise<T>): Promise<T> {
    const res = await this.promise;
    if (res.isOk()) return res.value;
    return await fn(res.error);
  }

  /**
   * Returns true if the result is Ok and contains the given value.
   */
  contains(value: T): Promise<boolean> {
    return this.promise.then((r) => r.contains(value));
  }

  /**
   * Returns true if the result is Err and contains the given error.
   */
  containsErr(error: E): Promise<boolean> {
    return this.promise.then((r) => r.containsErr(error));
  }

  /**
   * Returns `other` if the result is Ok, otherwise returns the Err value of self.
   */
  and<U>(other: AsyncResult<U, E>): AsyncResult<U, E> {
    return new AsyncResult(
      this.promise.then((r) =>
        r.isOk() ? other.promise : Promise.resolve(r as unknown as Result<U, E>),
      ),
    );
  }

  /**
   * Returns `other` if the result is Err, otherwise returns the Ok value of self.
   */
  or<F>(other: AsyncResult<T, F>): AsyncResult<T, F> {
    return new AsyncResult(
      this.promise.then((r) =>
        r.isErr() ? other.promise : Promise.resolve(r as unknown as Result<T, F>),
      ),
    );
  }

  /**
   * Converts from AsyncResult<Result<U, E>, E> to AsyncResult<U, E>.
   */
  flatten<U>(this: AsyncResult<Result<U, E>, E>): AsyncResult<U, E> {
    return new AsyncResult(this.promise.then((r) => r.flatten()));
  }

  /**
   * Converts from Result<T, E> to Option<T>, discarding the error if any.
   */
  toOption(): Promise<Option<T>> {
    return this.promise.then((r) => r.toOption());
  }

  /**
   * Converts from Result<T, E> to Option<E>, discarding the success value if any.
   */
  err(): Promise<Option<E>> {
    return this.promise.then((r) => r.err());
  }

  /**
   * Returns the contained Ok value, or throws with the provided message.
   */
  expect(message: string): Promise<T> {
    return this.promise.then((r) => r.expect(message));
  }

  /**
   * Returns the contained Err value, or throws if Ok.
   */
  unwrapErr(): Promise<E> {
    return this.promise.then((r) => r.unwrapErr());
  }

  /**
   * Returns the contained Err value, or throws with the provided message.
   */
  expectErr(message: string): Promise<E> {
    return this.promise.then((r) => r.expectErr(message));
  }

  /**
   * Get the underlying Promise<Result<T, E>>
   */
  toPromise(): Promise<Result<T, E>> {
    return this.promise;
  }

  /**
   * Implement PromiseLike to allow `await asyncResult`
   */
  then<TResult1 = Result<T, E>, TResult2 = never>(
    onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required by PromiseLike interface
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
}
