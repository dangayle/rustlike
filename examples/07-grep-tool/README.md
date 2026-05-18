# Grep Tool

File I/O and text search.

## Run

```bash
pnpm grep           # Runs index.ts (rust-like)
pnpm tsx 07-grep-tool/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- File I/O with `Result` using `tryCatch()`
- Regex pattern validation
- Chaining operations with `andThen()`
- Error transformation with `mapErr()`
- Pattern matching for formatted output
- Handling multiple error sources (file not found, invalid regex, etc.)
