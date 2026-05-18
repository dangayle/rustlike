# Todo App

State management and CRUD operations with error handling.

## Run

```bash
pnpm todo           # Runs index.ts (rust-like)
pnpm tsx 02-todo-app/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- **No classes**: Plain objects for data, pure functions for behavior
- **Immutable state**: State is never mutated, always returns new state
- Using `Result` for operations that can fail (add, remove, toggle)
- Using `Option` for lookups (find by id)
- Converting between `Option` and `Result` with `okOr()`
- Pattern matching for handling success/error cases
- Threading state through a series of operations
