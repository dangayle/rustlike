# Fibonacci

Recursive algorithms with memoization.

## Run

```bash
pnpm fibonacci           # Runs index.ts (rust-like)
pnpm tsx 04-fibonacci/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- Recursive functions returning `Result`
- Using `andThen()` to chain dependent computations
- Memoization with `Option` for cache lookups
- Early returns on errors
- Transforming results with `map()`
