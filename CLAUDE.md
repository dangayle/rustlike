# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**rustlike** is a zero-dependency TypeScript library providing Rust-inspired primitives: `Result<T, E>`, `Option<T>`, exhaustive pattern matching, lazy iterators, branded types, and interop helpers. The goal is building Rust mental models in TypeScript — no classes, no exceptions, no nulls.

## Commands

| Task                            | Command                            |
| ------------------------------- | ---------------------------------- |
| Install                         | `pnpm install`                     |
| Build all (lib + eslint plugin) | `pnpm build`                       |
| Build library only              | `pnpm build:lib`                   |
| Dev (watch mode)                | `pnpm dev`                         |
| Run tests (watch)               | `pnpm test`                        |
| Run tests once (lib + plugin)   | `pnpm test:run`                    |
| Run a single test file          | `pnpm vitest run src/core.test.ts` |
| Test with coverage              | `pnpm test:coverage`               |
| Lint (src + examples)           | `pnpm lint`                        |
| Lint with auto-fix              | `pnpm lint:fix`                    |
| Type check                      | `pnpm typecheck`                   |
| Format all files                | `pnpm fmt`                         |
| Check formatting                | `pnpm fmt:check`                   |

**Package manager**: pnpm (v10.22.0). **Test framework**: Vitest with globals enabled (no imports needed for `describe`/`it`/`expect`). **Build**: tsdown (Rolldown-powered) outputting CJS + ESM + declarations. **Linting**: oxlint (Rust-native, config in `.oxlintrc.json`). **Formatting**: oxfmt (config in `.oxfmtrc.json`).

## Architecture

### Monorepo structure

- `src/` — Main library source
- `packages/eslint-plugin-rustlike/` — ESLint plugin enforcing rustlike usage patterns (also works as oxlint JS plugin)
- `examples/` — 13 numbered examples, each with `index.ts` (rustlike style) and `idiomatic.ts` (standard TS)

### Core modules (src/)

| Module          | Purpose                                                                                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.ts`       | `Result<T,E>` and `Option<T>` ADTs — discriminated unions with method chains (`map`, `andThen`, `match`, `unwrap`, etc.) and namespace helpers (`Result.all`, `Option.from`, `Result.fromThrowable`) |
| `async.ts`      | `AsyncResult<T,E>` — PromiseLike wrapper over `Promise<Result>` enabling chained async error handling                                                                                                |
| `iter.ts`       | `Iter<T>` — lazy synchronous iterator with `map`, `filter`, `fold`, `take`, `zip`, `chain`, `collect`, `collectResult`, `peekable()`. Factory: `iter()`, `Iter.range()`, `iterLinesSync()`           |
| `async-iter.ts` | `AsyncIter<T>` — async counterpart of Iter. Factory: `asyncIter()`, `AsyncIter.range()`, `asyncIterLines()`                                                                                          |
| `match.ts`      | `match()`, `matchKind()`, `matchType()`, `assertNever()` — exhaustive pattern matching on discriminated unions                                                                                       |
| `types.ts`      | `Brand<T,B>`, `newtype()`, `DeepReadonly<T>`, `NonEmptyArray<T>` — nominal typing and type utilities                                                                                                 |
| `interop.ts`    | `tryCatch()`, `tryAsync()`, `safeCall()`, `safeTry()` — wrap throwing/nullable code into Result/Option                                                                                               |
| `index.ts`      | Barrel re-export of all public APIs                                                                                                                                                                  |

### Key patterns

- **ADTs as discriminated unions**: `Result` and `Option` use `_tag` discriminants (`"Ok"`/`"Err"`, `"Some"`/`"None"`) with type guard methods for narrowing.
- **Method chaining**: All transformation methods return wrapped values. `Ok(5).map(x => x * 2).andThen(...).unwrapOr(0)`.
- **Lazy iterators**: Generator-based; nothing evaluates until a terminal method (`collect()`, `fold()`, `forEach()`).
- **Branded types**: `Brand<T, B>` creates nominal types from structural ones. `newtype()` creates validated smart constructors returning `Result`.

### ESLint plugin (`packages/eslint-plugin-rustlike/`)

Four rules in two configs:

- **recommended**: `no-object-spread-on-adt` (warn), `prefer-match` (suggest)
- **strict**: adds `no-unwrap`, `no-throw-in-result-returning-function`

Rules are plain ESLint `Rule.RuleModule` objects (no `@typescript-eslint/utils` dependency) for dual ESLint + oxlint JS plugin compatibility. Plugin has its own tsdown build, vitest tests, and tsconfig.

### Config files

| File                                               | Purpose                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `tsdown.config.ts`                                 | Library build config (CJS + ESM + dts)                                     |
| `.oxlintrc.json`                                   | Oxlint config covering `src/` and `examples/` with file-specific overrides |
| `.oxfmtrc.json`                                    | Oxfmt formatter config (Prettier-compatible defaults)                      |
| `tsconfig.json`                                    | TypeScript strict config                                                   |
| `packages/eslint-plugin-rustlike/tsdown.config.ts` | Plugin build config (CJS only)                                             |

## Coding Conventions

- **Oxlint is strict for library code** (`src/*.ts`): no `any`, no `!` assertions, no unsafe type escapes, explicit return types, `readonly` properties. The `match.ts` file relaxes some unsafe rules for discriminated union type gymnastics.
- **Tests** (`*.test.ts`, `*.typetest.ts`): relaxed lint rules for ergonomics. Type-level tests use `.typetest.ts` extension.
- **TypeScript**: strict mode with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Target ES2020.
- Underscore-prefixed unused parameters are allowed (`_tag`, `_source`).
