# Config Loader

Config loader demonstrating outbound interop at a library boundary.

## Run

```bash
pnpm config-loader                      # Runs index.ts (rust-like)
pnpm tsx 14-config-loader/idiomatic.ts   # Runs idiomatic version
```

## What it demonstrates

- Using `toThrowable()` to expose a Result-returning parser as a standard throwing function
- Using `toThrowableAsync()` to expose an AsyncResult-returning loader as a standard async function
- Using `toNullable()` to expose an Option-returning lookup as a standard nullable function
- Using `intoThrowable()` for one-shot Result-to-value conversion
- Using `intoNullable()` for one-shot Option-to-nullable conversion
- Internal Rustlike code (`Result`, `Option`, `tryCatch`, `andThen` chains) with a clean public API boundary
- Consumer code that uses try/catch and null checks — cannot tell the internals use Rustlike
