# Button Clicker

UI state management simulation with a reducer-style dispatch loop.

## Run

```bash
pnpm tsx examples/05-button-clicker/index.ts       # rustlike version
pnpm tsx examples/05-button-clicker/idiomatic.ts    # idiomatic TS version
```

## What it demonstrates

### Rustlike version (`index.ts`)

- **Discriminated union actions** dispatched through `matchType()` for exhaustive handling
- **Structured error union** (`ClickerError`) with its own discriminants, formatted via `matchType()`
- **Immutable state threading** — every transition returns `Result<ClickerState, ClickerError>`
- **`Option` method chaining** — `option.okOr()`, `.andThen()`, `.map()`, `.zip()`, `.inspect()` instead of `if (x != null)`
- **`Result` method chaining** — `.inspect()`, `.inspectErr()`, `.andThen()`, `.mapErr()` instead of try/catch
- **Lazy iterators** — `iter()`, `Iter.range()`, `Iter.repeat()`, `Iter.min()`, `Iter.max()`, `.enumerate()`, `.skip()`, `.find()`
- **`tryCatch`** for safe JSON serialization round-trip
- **`DeepReadonly`** for enforcing immutable state at the type level
- **`Option.from()`** to convert nullable values into Options

### Idiomatic version (`idiomatic.ts`)

- Mutable class with methods that throw on invalid operations
- `switch` statement for action dispatch (not exhaustive by default)
- `null` returns for absent values
- `try/catch` for error handling at call sites
