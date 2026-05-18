import { Result, Ok, Err, matchKind, NonEmptyArray, isNonEmpty } from "rustlike";

// Rust-like State Machine
//
// Benefits:
// 1. "Make Invalid States Unrepresentable": A Draft cannot have a paymentId.
// 2. Compile-time Transition Safety: You cannot call ship() on a Draft.
// 3. Explicit Data Flow: State changes return NEW state objects (immutability).

type Item = { id: string; price: number };

// 1. Define distinct states with EXACTLY the data they need
// Notice: No nullable fields. If data is missing, it's not in the type.
type Draft = { kind: "Draft"; items: Item[] };
type Review = { kind: "Review"; items: NonEmptyArray<Item>; subtotal: number };
type Paid = { kind: "Paid"; items: NonEmptyArray<Item>; subtotal: number; paymentId: string };
type Shipped = {
  kind: "Shipped";
  items: NonEmptyArray<Item>;
  subtotal: number;
  paymentId: string;
  tracking: string;
};
type Cancelled = { kind: "Cancelled"; reason: string };

// The Union Type
type Order = Draft | Review | Paid | Shipped | Cancelled;

// Constructors
const Order = {
  new: (): Draft => ({ kind: "Draft", items: [] }),
};

// Transitions
// Note: Each function takes a SPECIFIC state type, not generic Order.
// This enforces the state machine at compile time.

function addItem(order: Draft, item: Item): Draft {
  return { ...order, items: [...order.items, item] };
}

function confirm(order: Draft): Result<Review, string> {
  // Use rustlike's isNonEmpty type guard to narrow Item[] to NonEmptyArray<Item>
  if (isNonEmpty(order.items)) {
    const items = order.items;
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    return Ok({ kind: "Review", items, subtotal });
  }

  return Err("Cannot confirm empty order");
}

function pay(order: Review, paymentDetails: string): Result<Paid, string> {
  if (!paymentDetails) {
    return Err("Payment details required");
  }
  // Simulate payment processing
  const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;
  return Ok({
    kind: "Paid",
    items: order.items,
    subtotal: order.subtotal,
    paymentId,
  });
}

function ship(order: Paid, tracking: string): Result<Shipped, string> {
  if (!tracking) {
    return Err("Tracking number required");
  }
  return Ok({
    kind: "Shipped",
    items: order.items,
    subtotal: order.subtotal,
    paymentId: order.paymentId,
    tracking,
  });
}

// Cancel can happen from multiple states, so we accept a Union subset
// or just handle generic Order and match on it.
function cancel(_order: Draft | Review | Paid, reason: string): Cancelled {
  return { kind: "Cancelled", reason };
}

// Helper to print state
function printOrder(order: Order) {
  matchKind(order, {
    Draft: (o: Draft) => console.log(`[Draft] ${o.items.length} items`),
    Review: (o: Review) => console.log(`[Review] Subtotal: $${o.subtotal}`),
    Paid: (o: Paid) => console.log(`[Paid] ID: ${o.paymentId}`),
    Shipped: (o: Shipped) => console.log(`[Shipped] Tracking: ${o.tracking}`),
    Cancelled: (o: Cancelled) => console.log(`[Cancelled] Reason: ${o.reason}`),
  });
}

// Demo
console.log("=== Rust-like State Machine ===\n");

// 1. Happy Path
console.log("1. Happy Path:");
// We chain the operations. Since state transitions return specific types,
// we can pipe them through.
// Note: In a real app, you might use a pipe() helper or just variable re-assignment.

// Start with Draft
let draft = Order.new();
draft = addItem(draft, { id: "item1", price: 100 });
draft = addItem(draft, { id: "item2", price: 50 });
printOrder(draft);

// Transition to Review
const reviewResult = confirm(draft);

reviewResult.match({
  ok: (review) => {
    printOrder(review);

    // Transition to Paid
    pay(review, "visa-123").match({
      ok: (paid) => {
        printOrder(paid);

        // Transition to Shipped
        ship(paid, "TRACK-999").match({
          ok: (shipped) => {
            printOrder(shipped);
            console.log("Done!");
          },
          err: (e) => console.error(e),
        });
      },
      err: (e) => console.error(e),
    });
  },
  err: (e) => console.error(e),
});

console.log();

// 2. Compile-time Safety
console.log("2. Compile-time Safety:");
// Uncommenting these lines would cause a COMPILER ERROR, not a runtime error.
// You cannot ship a Draft because the types don't match.
// const newDraft = Order.new();
// ship(newDraft, 'TRACK-123');
console.log("  Tried to call ship(draft) -> Caught by TypeScript compiler!");

// 3. Invalid Logic Handling (Empty Order)
console.log("\n3. Logic Safety (Empty Order):");
const emptyDraft = Order.new();
confirm(emptyDraft).match({
  ok: () => console.log("Success (Should not happen)"),
  err: (e) => console.log(`  Error caught: ${e}`),
});

// 4. Cancellation Demo
console.log("\n4. Cancellation:");
let orderToCancel = Order.new();
orderToCancel = addItem(orderToCancel, { id: "item1", price: 100 });
const cancelled = cancel(orderToCancel, "Customer changed their mind");
printOrder(cancelled);
