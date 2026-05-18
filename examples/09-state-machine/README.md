# Order State Machine

"Making Invalid States Unrepresentable" using discriminated unions.

## Run

```bash
pnpm state-machine           # Runs index.ts (rust-like)
pnpm tsx 09-state-machine/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- Discriminated unions for order states (`Draft`, `Review`, `Paid`, `Shipped`)
- State transitions enforced at the type level (can't ship a `Draft`)
- Immutable state objects returned from transitions
- Moving runtime checks into type definitions

## Key Differences

### Idiomatic TypeScript (`idiomatic.ts`)

Uses a **Class** with a `status` field.

- **Problem:** Fields like `paymentId` and `trackingNumber` are nullable because they don't exist in the `Draft` state.
- **Problem:** You can accidentally access `paymentId` when the status is `Draft` (runtime check required).
- **Problem:** You can call `ship()` on a `Draft` order. It throws a runtime error, but the compiler allows it.

### Rust-like TypeScript (`index.ts`)

Uses **Discriminated Unions** and strict state transitions.

- **Benefit:** `Draft` type _does not have_ a `paymentId`. It is physically impossible to access it.
- **Benefit:** Transition functions like `ship(order: Paid)` only accept `Paid` orders. Passing a `Draft` is a **compile-time error**.
- **Benefit:** State transitions are explicit and return new immutable state objects.
