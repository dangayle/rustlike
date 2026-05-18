# Log Analyzer

Lazy iterators for memory-efficient log file processing.

## What it demonstrates

- **True Lazy iteration**: Process files line-by-line via Node.js streams without loading into memory
- **Multi-line parsing**: Using async iterator `peek()` to handle log entries that span multiple lines
- **Single-pass Aggregation**: Using `fold` to compute multiple statistics in one pass over the stream
- **Error handling**: `Result<T, E>` for file operations and parsing

## Run

```bash
pnpm log-analyzer           # Runs index.ts (rust-like)
pnpm tsx 10-log-analyzer/idiomatic.ts  # Runs idiomatic version
```

## Key Differences

### Rust-like (`index.ts`)

```typescript
// Async Pipeline composition - single pass through entries via fold
const report = await entries.fold(EMPTY_REPORT, (report, entry) => {
  // Aggregate all stats in one pass
  return {
    ...report,
    totalEntries: report.totalEntries + 1,
    // ... update other stats
  };
});

// Truly lazy async streaming
const result = await asyncIterLines(logFile);
result.match({
  ok: async (lines) => {
    // lines is an AsyncIter<string> that streams from disk
  },
  err: (error) => console.error(error),
});

// Option type for potentially missing values
const duration = extractDuration(message);
if (duration.isSome() && duration.unwrap() > 1000) {
  // handle slow request
}
```

### Idiomatic TypeScript (`idiomatic.ts`)

```typescript
// Multiple passes through data
const errorsByService: Record<string, number> = {};
for (const entry of entries) {
  if (entry.level === "ERROR") {
    errorsByService[entry.service] = (errorsByService[entry.service] || 0) + 1;
  }
}

// try/catch for errors
try {
  const content = fs.readFileSync(logFile, "utf-8");
  // process
} catch (error) {
  console.error(error);
}

// null checks
const duration = extractDuration(message);
if (duration !== null && duration > 1000) {
  // handle slow request
}
```

## Log Format

The sample log includes:

- INFO, WARN, ERROR levels
- Multi-line ERROR entries with stack traces
- Request completion times
- Multiple services (OrderService, PaymentService, etc.)

```
2025-12-23T10:15:42Z INFO [OrderService] Starting order processing
2025-12-23T10:16:02Z ERROR [PaymentService] Payment processing failed
  at processPayment (payment.ts:142)
  at handleOrder (order.ts:89)
```

## Output

Both implementations produce the same output:

```
=== Log Analysis Report ===

Summary:
  Total entries: 45
  INFO:  32
  WARN:  7
  ERROR: 6

Errors by Service:
  PaymentService: 3
  DatabaseService: 1
  InventoryService: 1

Slow Requests (>1000ms):
  OrderService: 1850ms
  OrderService: 2250ms

Error Messages:
  [PaymentService] Payment processing failed
  ...
```

## Trade-offs

**Rust-like approach:**

- Explicit error handling (no hidden exceptions)
- Declarative pipeline composition
- More verbose for simple operations

**Idiomatic approach:**

- Familiar to most TypeScript developers
- Less ceremony for simple operations
- Multiple passes through data (less efficient for large files)
