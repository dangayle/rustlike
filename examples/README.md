# Rustlike Examples

This directory contains example projects demonstrating the `rustlike` library.

## Philosophy

- The **TS code** (`idiomatic.ts`) is rock solid, idiomatic TypeScript.
- The **Rustlike code** (`index.ts`) shows the same application re-imagined in a way that is more Rust-like.

## Setup

The examples use file dependencies, so no linking is needed. Just install and run:

```bash
cd examples/01-hello-world
pnpm install
pnpm start
```

## Examples

### 01. Hello World

Basic `Option` usage with simple greetings.

**Demonstrates:** Creating `Some` and `None`, `unwrapOr()`, chaining with `map()`, pattern matching.

### 02. Todo App

State management and CRUD operations with error handling.

**Demonstrates:** Using `Result` for operations that can fail, `Option` for lookups, converting between types with `okOr()`.

### 03. FizzBuzz

Classic FizzBuzz with pattern matching and validation.

**Demonstrates:** Control flow with `Result`, discriminated unions, exhaustive pattern matching, error handling in loops.

### 04. Fibonacci

Recursive fibonacci with memoization.

**Demonstrates:** Recursive functions with `Result`, chaining with `andThen()`, `Option` for cache lookups, transforming results.

### 05. Button Clicker

Terminal-based clicker app simulating UI state management.

**Demonstrates:** Application state with `Result` and `Option`, handling edge cases, async operations with Result.

### 06. Iris Classification

Simple k-NN classifier for the Iris dataset.

**Demonstrates:** Input validation with `Result`, chaining validations with `andThen()`, data processing pipelines.

### 07. Grep Tool

File search tool with regex pattern matching.

**Demonstrates:** File I/O with `Result`, `tryCatch()` for exception handling, error transformation with `mapErr()`, chaining operations.

### 08. Fetch JSON

Validates HTTP responses before touching data.

**Demonstrates:** Wrapping `fetch` with `Result`, rejecting non-200 or non-JSON responses, parsing JSON safely, shape validation before use.

### 09. Order State Machine

Demonstrates "Making Invalid States Unrepresentable" using discriminated unions.

**Demonstrates:** State transitions where invalid operations (like shipping a draft) are compile-time errors instead of runtime errors.

### 10. Log Analyzer

Memory-efficient log file processing with lazy iterators.

**Demonstrates:** `AsyncIter<T>` for streaming file processing, `peekable()` for multi-line parsing, `fold()` for single-pass aggregation, `Result<T, E>` for error handling.

### 11. Sales Report Generator

Composable data processing with lazy iterators.

**Demonstrates:** `Iter.range()`, `map`, `filter`, `flatMap`, `find`, `fold`, `collect`, `collectResult`, `inspect`, `partition`, `enumerate`.

### 12. Markdown Parser

CommonMark-subset Markdown-to-HTML parser exercising 19+ rustlike APIs.

**Demonstrates:** `iter().peekable()` for character lookahead, `asyncIterLines()` + `AsyncIter.peekable()` for async line parsing, `matchKind` for exhaustive AST rendering, `Result` chains with `map`/`andThen`/`mapErr`, `Option.orElse()` for block detection, `collectResult()` for error collection.

### 13. GraphQL Schema Validator

GraphQL schema validator and query executor showcasing previously unused APIs.

**Demonstrates:** `match()` for generic `__typename` pattern matching, `assertNever()` for exhaustive guards, `tryAsync()` for async error wrapping, `safeCall()` for Option-returning lookups, `DeepReadonly<T>` for immutable schema, `Brand` + `newtype()` for validated scalars, `tryCatch()` for sync parsing, `Result.all()` for validation collection, `iter().map().collect()` for lazy transformation.

## Running Examples

Each example is a standalone pnpm project:

```bash
cd examples/01-hello-world
pnpm install
pnpm start
```
