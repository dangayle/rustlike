# rustlike

TypeScript utilities for writing Rust-like code.

## Why?

Rust is great for performance-critical systems work. This library... isn't for that.

What it _is_ is a way to learn and apply Rust mental models to TypeScript.

Rust enforces computer science principles (explicit error handling, null safety, exhaustive matching, immutability) that most languages leave optional. This library brings those principles to TypeScript: both as a **learning tool** for building Rust mental models and as a **practical library** for writing safer, more predictable code.

- **Structs + functions.** Separate data from behavior. No classes, just object literals and functions.
- **Errors are values.** Return `Result<T, E>` instead of throwing. Exceptions are for panics, not control flow.
- **No null surprises.** Return `Option<T>` instead of `null`. You can't use a value without handling the absent case first.
- **Immutability by default.** Data is `readonly`. No mutations hiding in called functions.
- **Transformation pipelines.** Chain `.map()`, `.andThen()`, `.unwrapOr()` instead of imperative if/else checks.
- **Exhaustive matching.** Handle every variant of a union. The compiler catches what you miss.
- **Parse, don't validate.** Use branded types to make invalid states unrepresentable at the type level.

**We're not trying to recreate Rust in Typescript.** This library focuses on Rust's _logic handling_ patterns like error propagation, null safety, pattern matching, lazy iterators, and nominal typing. It does not attempt to model Rust's _resource and memory management_ concepts (ownership, borrowing, lifetimes, `Drop`) which don't have meaningful equivalents in a garbage-collected runtime.

## Install

Not yet published to npm. Install directly from the repo:

```bash
pnpm add @dangayle/rustlike
# or
npm install @dangayle/rustlike
```

## Examples

See the [`examples/`](./examples) directory for working demonstrations:

- **01-hello-world** - Basic `Option` usage
- **02-todo-app** - State management with `Result` and `Option`
- **03-fizzbuzz** - Pattern matching and control flow
- **04-fibonacci** - Recursive algorithms with memoization
- **05-button-clicker** - UI state management simulation
- **06-iris-classification** - k-NN classifier with validation
- **07-grep-tool** - File I/O and text search
- **08-fetch-json** - Boundary validation for HTTP JSON responses
- **09-state-machine** - "Making Invalid States Unrepresentable" using discriminated unions
- **10-log-analyzer** - Lazy iterators for memory-efficient log file processing
- **11-sales-report-generator** - Composable data processing with lazy iterator combinators
- **12-markdown-parser** - CommonMark-subset Markdown-to-HTML parser exercising 19+ rustlike APIs
- **13-graphql-schema** - GraphQL schema validator exercising `match()`, `assertNever()`, `tryAsync()`, `safeCall()`, and `DeepReadonly`

Each example directory contains two implementations:

- `idiomatic.ts` - **Standard TypeScript** showing idiomatic TS approaches to solving a problem.
- `index.ts` - **Rust-like approach** using `rustlike` library patterns, showing the same application re-imagined in a way that is more Rust-like. This lets you see the philosophical differences side-by-side. Run either:

```bash
cd examples/<example>
pnpm install
pnpm start  # runs index.ts (rust-like)
pnpm tsx idiomatic.ts  # runs idiomatic version
```

## The Rust Mental Model

Again, we're not trying to recreate Rust in Typescript. We're trying to adopt the mental model and apply some of its beneficial patterns. This library reinforces specific habits that transfer directly to Rust.

### 1. Errors as Values (`Result`)

**Habit:** Exceptions are for unrecoverable system crashes (panics). For everything else (validation, network, missing data), return a `Result`.

- **Don't `throw`.** Return `Err()`.
- **Don't `try/catch`.** Use `Result.fromThrowable()`.

**Feature: `Result<T, E>`**
Error handling without exceptions. Methods chain directly on values, like Rust.

```typescript
import { Ok, Err, Result } from "rustlike";

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err("Cannot divide by zero");
  return Ok(a / b);
}

// Method chaining (Rust-like)
const value = divide(10, 2)
  .map((x) => x * 2)
  .andThen((x) => divide(x, 2))
  .unwrapOr(0);

// Pattern match
const message = divide(10, 0).match({
  ok: (value) => `Result: ${value}`,
  err: (error) => `Error: ${error}`,
});

// Interop with Option
const opt = divide(10, 2).toOption(); // Some(5)

// Type narrowing still works
const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.value); // TypeScript knows this is number
}

// expect() for documenting invariants
const adminUser = findAdmin().expect("Admin user must exist in database");

// Collecting multiple Results
const items = [1, 2, 3];
const validated = Result.collect(items.map((x) => validate(x)));
// Result<ValidatedItem[], Error> - short-circuits on first error
```

### 2. No Null Surprises (`Option`)

**Habit:** Check First, Then Use. In TypeScript, you can often access a property and get `undefined`. In Rust (and this library), you physically cannot get the value without handling the absent case first.

- **Bad Habit.** `if (user && user.id)`
- **Rust Habit.** `user.map(u => u.id).unwrapOr(default)`

**Feature: `Option<T>`**
Explicit handling of nullable values. Methods chain directly on values.

```typescript
import { Some, None, Option } from "rustlike";

function findUser(id: number): Option<string> {
  return id === 1 ? Some("Alice") : None;
}

// Method chaining (Rust-like)
const greeting = findUser(1)
  .map((name) => name.toUpperCase())
  .unwrapOr("ANONYMOUS");

// Pattern match
const message = findUser(2).match({
  some: (name) => `Hello, ${name}`,
  none: () => "User not found",
});

// Create from nullable
const maybeValue = Option.from(possiblyNullValue);

// Interop with Result
const res = findUser(1).okOr("User missing"); // Ok("Alice") or Err("User missing")

// Type narrowing still works
const user = findUser(1);
if (user.some) {
  console.log(user.value); // TypeScript knows this is string
}

// expect() for documenting invariants
const config = loadConfig().expect("Config file must be present");

// Collecting multiple Options
const ids = [1, 2, 3];
const users = Option.collect(ids.map((id) => findUser(id)));
// Option<User[]> - None if ANY lookup fails
```

### 3. Transformation Pipelines

**Habit:** Instead of imperatively checking for success/failure, use combinators to build a pipeline.

- **Transform.** `.map()` / `.mapErr()` - "If I have a value, change it."
- **Chain.** `.andThen()` - "If this succeeds, try this next risky thing."
- **Extract.** `.unwrapOr()` / `.match()` - "Get me out of the wrapper."

_This pattern is visible in the `Result` and `Option` examples above._

### 4. Exhaustive Matching

**Habit:** Always handle every case of a discriminated union.

- Use `switch` statements with `assertNever(x)` in the `default` case.
- This ensures that if you add a new error type or state later, the compiler forces you to update every call site.

**Feature: Pattern Matching**
Ensure all cases are handled in discriminated unions.

```typescript
import { assertNever, matchKind, matchType } from "rustlike";

type Shape = { kind: "circle"; radius: number } | { kind: "rect"; w: number; h: number };

// Using matchKind helper
const area = matchKind(shape, {
  circle: (s) => Math.PI * s.radius ** 2,
  rect: (s) => s.w * s.h,
});

// Using assertNever in switch
function getArea(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.w * s.h;
    default:
      return assertNever(s); // Compile error if case missing
  }
}
```

### 5. Parse, Don't Validate (Branded Types)

**Habit:** Make invalid states unrepresentable.
Implement Rust's "make invalid states unrepresentable" pattern using branded types with validation. This forces validation at construction time. You cannot create an invalid value.

**Feature: Branded Types**
Nominal typing for type-safe IDs and domain values.

```typescript
import { Brand, brand } from "rustlike";

type UserId = Brand<number, "UserId">;
type OrderId = Brand<number, "OrderId">;

const UserId = brand<number, "UserId">();
const OrderId = brand<number, "OrderId">();

const userId = UserId(42);
const orderId = OrderId(42);

// These are now incompatible even though both are numbers
// orderId = userId; // Type error!
```

**Feature: Validation Helpers**

Pattern 1: Manual (using Brand + Result directly)

```typescript
import { Brand, Result, Ok, Err } from "rustlike";

// Define the branded type
type EmailAddress = Brand<string, "Email">;

// Create a namespace with validation
const EmailAddress = {
  parse: (input: string): Result<EmailAddress, string> => {
    if (input.includes("@")) {
      return Ok(input as EmailAddress);
    }
    return Err("Invalid email");
  },

  unsafe: (input: string): EmailAddress => input as EmailAddress,
};

// Usage - validation is mandatory
const email = EmailAddress.parse(userInput);

email.match({
  ok: (validEmail) => sendWelcome(validEmail),
  err: (msg) => console.error(msg),
});

// This function can ONLY accept validated emails
function sendWelcome(email: EmailAddress) {
  // No need to validate - type system guarantees it
}
```

Pattern 2: Using the `newtype()` helper

```typescript
import { newtype } from "rustlike";

// Single line definition
const EmailAddress = newtype<string, "Email">((s) => s.includes("@"), "Invalid email");

// Same usage, same type safety
const email = EmailAddress.parse(userInput);

// More examples
const PositiveNumber = newtype<number, "Positive">(
  (n) => n > 0,
  (n) => `Expected positive, got ${n}`,
);

const NonEmptyString = newtype<string, "NonEmpty">((s) => s.length > 0, "String cannot be empty");

const StrongPassword = newtype<string, "StrongPassword">(
  (s) => s.length >= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s),
  "Password must be 8+ chars with uppercase and number",
);
```

## Additional Features

### Immutability Helpers

```typescript
import { DeepReadonly, NonEmptyArray, isNonEmpty, head } from "rustlike";

// Deep immutability
type Config = DeepReadonly<{
  server: { host: string; port: number };
  options: string[];
}>;

// Non-empty arrays
const items: NonEmptyArray<string> = ["a", "b", "c"];
const first = head(items); // Guaranteed to exist

// Type guard for arrays
if (isNonEmpty(arr)) {
  const first = head(arr); // Safe!
}
```

### Interop Helpers

Wrappers for integrating with third-party libraries and code that throws or returns nullable values.

```typescript
import { tryCatch, tryAsync, safeCall, safeTry } from "rustlike";

// One-off sync try/catch
const parsed = tryCatch(() => JSON.parse(userInput));
// Result<unknown, unknown>

// One-off async try/catch (e.g., axios, fetch)
const response = await tryAsync(() => axios.get<User[]>("/api/users"));
// Result<AxiosResponse<User[]>, AxiosError>

// Create reusable wrapper for nullable functions
const safeFind = safeCall((id: number) => users.find((u) => u.id === id));
const user = safeFind(42);
// Option<User>

// Create reusable wrapper for throwing functions
const safeJsonParse = safeTry(JSON.parse);
const data = safeJsonParse(input);
// Result<unknown, unknown>
```

For nullable values, use `Option.from`:

```typescript
const user = Option.from(map.get("user")); // Option<User>
const item = Option.from(arr.find((x) => x.id)); // Option<Item>
```

### Lazy Iterators (`Iter<T>`, `AsyncIter<T>`)

Rust-like lazy iterators for composable, memory-efficient data processing.

```typescript
import { iter, iterLinesSync, asyncIterLines, Iter, AsyncIter, Ok, Err } from "rustlike";

// Basic pipeline
const doubled = iter([1, 2, 3, 4, 5])
  .filter((x) => x % 2 === 0)
  .map((x) => x * 2)
  .collect(); // [4, 8]

// Lazy evaluation - nothing executes until collect()
const pipeline = iter(hugeArray).filter(expensive).map(transform).take(10); // Only processes first 10 matches

const results = pipeline.collect();

// File reading with Result error handling
iterLinesSync("data.csv").match({
  ok: (lines) => {
    const parsed = lines
      .skip(1) // skip header
      .map((line) => line.split(","))
      .filter((cols) => cols.length >= 3)
      .collect();
  },
  err: (e) => console.error(e),
});

// Async streaming for large files
const result = await asyncIterLines("huge.log");
result.match({
  ok: async (lines) => {
    const errors = await lines
      .filter((line) => line.includes("ERROR"))
      .take(100)
      .collect();
  },
  err: (e) => console.error(e),
});

// Pagination pattern with flatten()
const allItems = iter(pages)
  .map((page) => page.items)
  .flatten()
  .filter((item) => item.active)
  .collect();

// Error recovery with Result + collectResult()
const results = iter(inputs)
  .map((input) => (validate(input) ? Ok(parse(input)) : Err("invalid")))
  .collectResult();

// Combining data sources with chain()
const combined = iter(localData).chain(remoteData).map(normalize).collect();

// Zip for parallel iteration
const pairs = iter(keys).zip(values).collect(); // [[key1, val1], [key2, val2], ...]

// Enumerate for indices
const numbered = iter(lines)
  .enumerate()
  .map(([i, line]) => `${i + 1}: ${line}`)
  .collect();

// Peek for look-ahead (useful for multi-line parsing)
const iterator = iter(logLines).peekable();
while (iterator.peek().isSome()) {
  const line = iterator.next().value;
  // Check if next line is a continuation
  if (
    iterator
      .peek()
      .map((l) => l.startsWith(" "))
      .unwrapOr(false)
  ) {
    // Handle multi-line entry
  }
}
```

**Key Methods:**

| Method              | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `map(fn)`           | Transform each element                                       |
| `filter(pred)`      | Keep matching elements                                       |
| `fold(init, fn)`    | Reduce to single value                                       |
| `tryFold(init, fn)` | Fold with early exit on `Err`                                |
| `tryMap(fn)`        | Map with fallible function                                   |
| `take(n)`           | Take first n elements                                        |
| `skip(n)`           | Skip first n elements                                        |
| `enumerate()`       | Add indices: `[index, value]`                                |
| `zip(other)`        | Pair with another iterator                                   |
| `chain(other)`      | Concatenate iterators                                        |
| `flatten()`         | Flatten nested iterables                                     |
| `peekable()`        | Adapter that enables look-ahead via `peek()`                 |
| `collect()`         | Gather into array                                            |
| `collectResult()`   | Rust-like `Result` collection (short-circuit on first `Err`) |

**Factory Functions:**

```typescript
// Sync iterators
iter([1, 2, 3]); // From iterable
iterFromArray(arr); // From array
iterFromGenerator(gen); // From generator function
iterLinesSync(filepath); // From file (returns Result)
Iter.range(0, 10); // Range of numbers
Iter.repeat(value, n); // Repeat value n times
Iter.once(value); // Single value
Iter.empty(); // Empty iterator

// Async iterators
asyncIter(asyncIterable); // From async iterable
asyncIterFromArray(arr); // From array (async)
asyncIterFromGenerator(gen); // From async generator
asyncIterLines(filepath); // Stream file (returns Promise<Result>)
AsyncIter.range(0, 10); // Async range
```

### Async Chaining (`AsyncResult`)

A powerful wrapper around `Promise<Result<T, E>>` to enable method chaining on async operations.

```typescript
import { AsyncResult, Ok, Err } from "rustlike";

// Instead of:
// const res = await doAsyncThing();
// if (res.isOk()) { ... }

// You can chain:
const user = await AsyncResult.fromPromise(fetchUser(id))
  .map((user) => user.name)
  .andThen((name) => AsyncResult.fromPromise(validateName(name)))
  .unwrapOr("guest");
```

## Design Philosophy

### What we do _not_ implement:

- **Traits.** TypeScript has interfaces; we use those.
- **Borrow Checker.** Impossible to implement in TS without a compiler plugin.
- **Panic/Unwind.** We use standard Exceptions for panics (`expect`, `unwrap` failures).
- **Niche Stdlib Functions.** We don't need `Vec::dedup_by_key` or `BTreeMap`. TypeScript's Arrays and Objects are sufficient.
- **Operator Overloading.** TypeScript doesn't support it.

### Benefits

**Errors become visible in types.** A function returning `Result<User, ApiError>` tells you it can fail. A function returning `User` that silently throws? You'd never know without reading the implementation.

**No null surprises.** `Option<T>` forces you to handle the absent case. No more `Cannot read property 'x' of undefined` at runtime.

**Exhaustive handling.** Add a variant to a union, and the compiler tells you everywhere you forgot to handle it.

**Immutability by default.** Easier to reason about. No mutations hiding in called functions.

**Self-documenting code.** Types encode behavior that would otherwise live in comments or nowhere.

### Tradeoffs

This approach has real costs. Be aware of them.

**Non-idiomatic.** This is not how TypeScript is typically written. Other developers may find it unfamiliar or harder to read. The patterns aren't in most TS style guides.

**Verbosity.** Compare:

```typescript
// Typical TS (minimal, non-exhaustive, common in apps)
const user = getUser(id); // User | undefined
const name = user?.name ?? "guest"; // fine for many teams

// Rust-like TS (more explicit / verbose on purpose)
import { Option, Ok, Err } from "rustlike";

// Option chaining example
const name2 = Option.from(getUser(id))
  .map((u) => u.name)
  .okOr("missing user name") // document failure path
  .andThen((n) => (n.length > 0 ? Ok(n) : Err("empty name")))
  .unwrapOr("guest"); // explicit fallback

// match-based example
const name3 = Option.from(getUser(id))
  .match({
    some: (u) => (u.name.length > 0 ? Ok(u.name) : Err("empty name")),
    none: () => Err("missing user name"),
  })
  .unwrapOr("guest");
```

Method chaining helps, but it's still more explicit than implicit null checks.

**Runtime overhead.** Every `Ok(value)` creates an object with methods. It's small, but not zero.

**Spreading loses methods.** `{ ...Ok(5) }` becomes a plain object without methods. Same with `Object.assign`. This is similar to Rust. You can't destructure and expect impl methods to follow.

**Ecosystem friction.** Most libraries throw exceptions and return `null`. You'll wrap at boundaries:

```typescript
const result = Result.fromPromise(fetch(url));
const user = Option.from(localStorage.getItem("user"));
```

**TypeScript isn't Rust.** The type system lacks higher-kinded types, true exhaustiveness checking, and default immutability. You're simulating Rust semantics in a system not built for them.

### When to use this

- Personal projects or learning exercises
- Codebases where correctness matters more than convention
- Isolated modules where the pattern stays contained
- Preparing to learn Rust

### When not to

- Large teams unfamiliar with the patterns
- Heavy third-party library integration (constant wrapping)
- Performance-critical inner loops
- When shipping speed matters more than style

## API Summary

### Result<T, E>

| Method / Function           | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `Ok(value)`                 | Create success result                                    |
| `Err(error)`                | Create error result                                      |
| `.map(fn)`                  | Transform success value                                  |
| `.mapOr(default, fn)`       | Transform success value, or return default if Err        |
| `.mapOrElse(defaultFn, fn)` | Transform success value, or compute default from error   |
| `.mapErr(fn)`               | Transform error value                                    |
| `.andThen(fn)`              | Chain Result-returning functions                         |
| `.and(other)`               | Return `other` if Ok, otherwise propagate Err            |
| `.or(other)`                | Return this if Ok, otherwise return `other`              |
| `.orElse(fn)`               | Handle error with fallback Result                        |
| `.contains(value)`          | Check if Ok contains a specific value (strict equality)  |
| `.containsErr(error)`       | Check if Err contains a specific error (strict equality) |
| `.match({ ok, err })`       | Pattern match on result                                  |
| `.unwrap()`                 | Get value or throw                                       |
| `.unwrapOr(default)`        | Get value or default                                     |
| `.unwrapOrElse(fn)`         | Get value or compute default                             |
| `.expect(message)`          | Get value or throw with custom message                   |
| `.unwrapErr()`              | Get the error value or throw                             |
| `.expectErr(message)`       | Get the error value or throw with custom message         |
| `.toOption()`               | Convert Ok to Some, Err to None                          |
| `.err()`                    | Convert Err to Some, Ok to None                          |
| `.isOk()` / `.isErr()`      | Type guards (method form)                                |
| `.flatten()`                | Flatten `Result<Result<T, E>, E>` to `Result<T, E>`      |
| `.inspect(fn)`              | Run effect if Ok (pass-through)                          |
| `.inspectErr(fn)`           | Run effect if Err (pass-through)                         |
| `isOk(result)`              | Standalone type guard function                           |
| `isErr(result)`             | Standalone type guard function                           |
| `Result.fromThrowable(fn)`  | Convert throwing function to Result                      |
| `Result.fromPromise(p)`     | Convert Promise to Result                                |
| `Result.all(results)`       | Combine array of Results, short-circuit on first Err     |
| `Result.collect(results)`   | Alias for Result.all()                                   |
| `Result.transpose(res)`     | Swap `Result<Option<T>, E>` → `Option<Result<T, E>>`     |

### Option<T>

| Method / Function           | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `Some(value)`               | Create Some option                                        |
| `None`                      | The None value                                            |
| `Option.from(val)`          | Create from nullable                                      |
| `.map(fn)`                  | Transform value if present                                |
| `.mapOr(default, fn)`       | Transform value if present, or return default             |
| `.mapOrElse(defaultFn, fn)` | Transform value if present, or compute default            |
| `.andThen(fn)`              | Chain Option-returning functions                          |
| `.and(other)`               | Return `other` if Some, otherwise None                    |
| `.or(other)`                | Return this if Some, else other                           |
| `.orElse(fn)`               | Return this if Some, else compute                         |
| `.xor(other)`               | Return Some if exactly one is Some, else None             |
| `.filter(pred)`             | Keep only if predicate passes                             |
| `.contains(value)`          | Check if Some contains a specific value (strict equality) |
| `.match({ some, none })`    | Pattern match on option                                   |
| `.unwrap()`                 | Get value or throw                                        |
| `.unwrapOr(default)`        | Get value or default                                      |
| `.unwrapOrElse(fn)`         | Get value or compute default                              |
| `.expect(message)`          | Get value or throw with custom message                    |
| `.okOr(error)`              | Convert to Result                                         |
| `.isSome()` / `.isNone()`   | Type guards (method form)                                 |
| `.zip(other)`               | Combine two options into `Option<[T, U]>`                 |
| `.flatten()`                | Flatten `Option<Option<T>>` to `Option<T>`                |
| `.inspect(fn)`              | Run effect if Some (pass-through)                         |
| `isSome(option)`            | Standalone type guard function                            |
| `isNone(option)`            | Standalone type guard function                            |
| `Option.all(options)`       | Combine array of Options, None if any is None             |
| `Option.collect(options)`   | Alias for Option.all()                                    |
| `Option.transpose(opt)`     | Swap `Option<Result<T, E>>` → `Result<Option<T>, E>`      |

### AsyncResult<T, E>

A chainable wrapper around `Promise<Result<T, E>>`.

| Method / Function               | Description                            |
| ------------------------------- | -------------------------------------- |
| `AsyncResult.ok(val)`           | Create async success                   |
| `AsyncResult.err(err)`          | Create async error                     |
| `AsyncResult.fromPromise(p)`    | Create from `Promise<Result>`          |
| `AsyncResult.fromThrowable(fn)` | Create from async throwing function    |
| `.map(fn)`                      | Async transform success value          |
| `.mapErr(fn)`                   | Async transform error value            |
| `.andThen(fn)`                  | Async chain Result-returning functions |
| `.orElse(fn)`                   | Async handle error                     |
| `.match(handlers)`              | Async pattern match                    |
| `.unwrap()`                     | Async get value or throw               |
| `.unwrapOr(default)`            | Async get value or default             |
| `.unwrapOrElse(fn)`             | Async get value or compute default     |
| `.inspect(fn)`                  | Async inspect Ok value                 |
| `.inspectErr(fn)`               | Async inspect Err value                |
| `.toPromise()`                  | Convert back to `Promise<Result>`      |
| `await`                         | `AsyncResult` is `PromiseLike`         |

### Pattern Matching

| Function                               | Description                                                          |
| -------------------------------------- | -------------------------------------------------------------------- |
| `assertNever(x, msg?)`                 | Exhaustiveness check in switch default                               |
| `match(value, discriminant, handlers)` | Generic discriminated union matcher on any discriminant key          |
| `matchKind(value, handlers)`           | Match on `kind` discriminant (shorthand for `match(v, 'kind', ...)`) |
| `matchType(value, handlers)`           | Match on `type` discriminant (shorthand for `match(v, 'type', ...)`) |

All matchers support a catch-all `_` handler for partial matching:

```typescript
const isCircle = matchKind(shape, {
  circle: () => true,
  _: () => false, // catch-all for all other variants
});
```

### Types & Utilities

| Type / Function        | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `DeepReadonly<T>`      | Recursive readonly                               |
| `ReadonlyPick<T, K>`   | Pick keys and make them readonly                 |
| `Brand<T, B>`          | Branded/nominal type (newtype pattern)           |
| `brand<T, B>()`        | Create a brand constructor                       |
| `newtype<T, B, E>()`   | Create validated newtype (parse, don't validate) |
| `NonEmptyArray<T>`     | Array with at least one element                  |
| `isNonEmpty(arr)`      | Type guard for NonEmptyArray                     |
| `nonEmpty(a, ...rest)` | Create NonEmptyArray                             |
| `head(arr)`            | Get first element (safe on NonEmptyArray)        |

### Interop Helpers

| Function       | Description                               |
| -------------- | ----------------------------------------- |
| `tryCatch(fn)` | Wrap sync throwing function → Result      |
| `tryAsync(fn)` | Wrap async function → Result              |
| `safeCall(fn)` | Create reusable nullable → Option wrapper |
| `safeTry(fn)`  | Create reusable throwing → Result wrapper |

### Iter\<T\>

Lazy synchronous iterator.

| Method / Function               | Description                                     |
| ------------------------------- | ----------------------------------------------- |
| `iter(source)`                  | Create from iterable                            |
| `iterFromArray(arr)`            | Create from array                               |
| `iterFromGenerator(fn)`         | Create from generator function                  |
| `iterLinesSync(path)`           | Create from file (returns `Result`)             |
| `Iter.range(start, end, step?)` | Range of numbers                                |
| `Iter.repeat(value, n)`         | Repeat value n times                            |
| `Iter.once(value)`              | Single value                                    |
| `Iter.empty()`                  | Empty iterator                                  |
| `Iter.sum(iter)`                | Sum all numbers in an iterator                  |
| `Iter.product(iter)`            | Multiply all numbers in an iterator             |
| `Iter.min(iter)`                | Minimum value, or `None` for empty iterators    |
| `Iter.max(iter)`                | Maximum value, or `None` for empty iterators    |
| `.map(fn)`                      | Transform each element                          |
| `.filter(pred)`                 | Keep matching elements                          |
| `.flatMap(fn)`                  | Map each element to an iterable and flatten     |
| `.inspect(fn)`                  | Run side effect on each element (pass-through)  |
| `.find(pred)`                   | First element matching predicate → `Option<T>`  |
| `.findMap(fn)`                  | Find and transform in one step → `Option<U>`    |
| `.any(pred)`                    | `true` if any element matches predicate         |
| `.all(pred)`                    | `true` if all elements match predicate          |
| `.position(pred)`               | Index of first match → `Option<number>`         |
| `.fold(init, fn)`               | Reduce to single value                          |
| `.reduce(fn)`                   | Reduce without initial value → `Option<T>`      |
| `.tryFold(init, fn)`            | Fold with early exit on `Err`                   |
| `.tryMap(fn)`                   | Map with fallible function                      |
| `.count()`                      | Count elements (consumes iterator)              |
| `.last()`                       | Get last element → `Option<T>`                  |
| `.nth(n)`                       | Get nth element → `Option<T>`                   |
| `.partition(pred)`              | Split into `[matching[], rest[]]`               |
| `.take(n)`                      | Take first n elements                           |
| `.skip(n)`                      | Skip first n elements                           |
| `.stepBy(step)`                 | Yield every nth element                         |
| `.enumerate()`                  | Add indices: `[index, value]`                   |
| `.zip(other)`                   | Pair with another iterator                      |
| `.chain(other)`                 | Concatenate iterators                           |
| `.flatten()`                    | Flatten nested iterables                        |
| `.peekable()`                   | Enable look-ahead via `peek()`                  |
| `.collect()`                    | Gather into array                               |
| `.collectResult()`              | Collect `Result`s, short-circuit on first `Err` |

### AsyncIter\<T\>

Lazy asynchronous iterator. All callbacks accept sync or async functions.

| Method / Function                    | Description                                             |
| ------------------------------------ | ------------------------------------------------------- |
| `asyncIter(source)`                  | Create from async iterable                              |
| `asyncIterFromArray(arr)`            | Create from array                                       |
| `asyncIterFromIterable(iter)`        | Create from sync iterable                               |
| `asyncIterFromGenerator(fn)`         | Create from async generator function                    |
| `asyncIterLines(path)`               | Stream file lines (returns `Promise<Result>`)           |
| `AsyncIter.range(start, end, step?)` | Async range of numbers                                  |
| `AsyncIter.repeat(value, n)`         | Repeat value n times                                    |
| `AsyncIter.once(value)`              | Single value                                            |
| `AsyncIter.empty()`                  | Empty iterator                                          |
| `AsyncIter.sum(iter)`                | Sum all numbers in an async iterator                    |
| `AsyncIter.product(iter)`            | Multiply all numbers in an async iterator               |
| `AsyncIter.min(iter)`                | Minimum value, or `None` for empty iterators            |
| `AsyncIter.max(iter)`                | Maximum value, or `None` for empty iterators            |
| `.map(fn)`                           | Transform each element (sync or async fn)               |
| `.filter(pred)`                      | Keep matching elements (sync or async pred)             |
| `.flatMap(fn)`                       | Map each element to an iterable and flatten             |
| `.inspect(fn)`                       | Run side effect on each element (pass-through)          |
| `.find(pred)`                        | First element matching predicate → `Promise<Option<T>>` |
| `.findMap(fn)`                       | Find and transform in one step → `Promise<Option<U>>`   |
| `.any(pred)`                         | `true` if any element matches predicate                 |
| `.all(pred)`                         | `true` if all elements match predicate                  |
| `.position(pred)`                    | Index of first match → `Promise<Option<number>>`        |
| `.fold(init, fn)`                    | Reduce to single value                                  |
| `.reduce(fn)`                        | Reduce without initial value → `Promise<Option<T>>`     |
| `.tryFold(init, fn)`                 | Fold with early exit on `Err`                           |
| `.tryMap(fn)`                        | Map with fallible function                              |
| `.count()`                           | Count elements (consumes iterator)                      |
| `.last()`                            | Get last element → `Promise<Option<T>>`                 |
| `.nth(n)`                            | Get nth element → `Promise<Option<T>>`                  |
| `.partition(pred)`                   | Split into `Promise<[matching[], rest[]]>`              |
| `.take(n)`                           | Take first n elements                                   |
| `.skip(n)`                           | Skip first n elements                                   |
| `.stepBy(step)`                      | Yield every nth element                                 |
| `.enumerate()`                       | Add indices: `[index, value]`                           |
| `.zip(other)`                        | Pair with another async iterator                        |
| `.chain(other)`                      | Concatenate iterators                                   |
| `.flatten()`                         | Flatten nested iterables                                |
| `.peekable()`                        | Enable look-ahead via `peek()`                          |
| `.collect()`                         | Gather into array                                       |
| `.collectResult()`                   | Collect `Result`s, short-circuit on first `Err`         |

## ESLint Plugin

The library includes an ESLint plugin to help enforce Rust-like patterns in your codebase.

### Installation

```bash
# Install the plugin (once published)
pnpm add -D @dangayle/eslint-plugin-rustlike
```

### Configuration

Add to your ESLint config (`eslint.config.js`):

```javascript
import rustlikePlugin from "@dangayle/eslint-plugin-rustlike";

export default [
  {
    plugins: {
      rustlike: rustlikePlugin,
    },
    rules: {
      // Recommended rules (low-noise)
      "rustlike/no-object-spread-on-adt": "warn",
      "rustlike/prefer-match": "warn",

      // Strict rules (opt-in)
      "rustlike/no-unwrap": "error",
      "rustlike/no-throw-in-result-returning-function": "error",
    },
  },
];
```

### Rules

#### Recommended (low-noise)

| Rule                      | Description                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `no-object-spread-on-adt` | Warns when spreading `Ok/Err/Some/None` objects, which strips methods   |
| `prefer-match`            | Suggests `.match()` for simple `if/else` on `Result/Option` type guards |

#### Strict (opt-in)

| Rule                                    | Description                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `no-unwrap`                             | Bans `.unwrap()`, `.unwrapErr()`, `.expect()` - forces explicit error handling |
| `no-throw-in-result-returning-function` | Disallows `throw` in functions returning `Result` - use `Err()` instead        |

### Private vs Public Linting

This repo uses two ESLint configurations:

- **Internal (src/)**: Heavy-handed TypeScript correctness rules (no `any`, no assertions, etc.) - idiomatic, strict TypeScript.
- **Public (plugin)**: Rust-like pattern enforcement for library consumers - enforces the mental model.

The examples use the public plugin to demonstrate real-world usage.

## Publishing

Releases are PR-driven and fully automated. To cut a new version:

```bash
pnpm release:patch    # 0.1.0 → 0.1.1 (bug fixes)
pnpm release:minor    # 0.1.0 → 0.2.0 (new features, backward compatible)
pnpm release:major    # 0.1.0 → 1.0.0 (breaking changes)
```

The release script bumps both packages in sync on a `release/vX.Y.Z` branch, signs the commit, pushes, and opens a pull request. From there:

1. CI runs lint, typecheck, build, and tests on the PR
2. You squash-merge the PR into `main`
3. The [`Tag release`](.github/workflows/tag-release.yml) workflow detects the version bump and creates the `vX.Y.Z` tag
4. The [`Publish to npm`](.github/workflows/publish.yml) workflow triggers on the tag and:
   - Publishes both packages with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) — a cryptographic attestation linking the package back to this repo and commit
   - Creates a GitHub Release with auto-generated notes

The publish workflow safely skips packages whose version is already on npm, so re-running on an existing tag is a no-op.

### Manual publish (not recommended)

Only needed for the very first publish or recovery scenarios:

```bash
pnpm build
pnpm publish --access public
pnpm -C packages/eslint-plugin-rustlike publish --access public
```

Requires being logged in to npm (`pnpm login`) with publish access to the `@dangayle` scope.

## License

MIT
