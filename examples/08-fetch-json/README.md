# Fetch JSON

Boundary validation for HTTP JSON responses.

## Run

```bash
pnpm fetch-json           # Runs index.ts (rust-like)
pnpm tsx 08-fetch-json/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- Wrapping `fetch` with `AsyncResult.fromThrowable` to capture network errors
- Chaining with `.andThen()` for multi-step validation
- Rejecting non-200 responses early
- Enforcing `application/json` content type with `Option.filter().okOr()`
- Validating the decoded JSON shape ("Parse, Don't Validate")
- Failing fast (example.com serves HTML, so the validation stops before unsafe usage)
