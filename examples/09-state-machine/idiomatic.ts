// Idiomatic TypeScript - Class-based State Machine
//
// Common issues:
// 1. "Impossible states" are representable (e.g. status='draft' but has paymentId)
// 2. Runtime checks required for every transition
// 3. Nullable fields everywhere because they *might* not be there yet

type Item = { id: string; price: number };

class Order {
  // State is a string string
  status: "draft" | "review" | "paid" | "shipped" | "cancelled";

  // Data fields are often nullable because they aren't available in all states
  items: Item[];
  subtotal: number;
  paymentId: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;

  constructor() {
    this.status = "draft";
    this.items = [];
    this.subtotal = 0;
    this.paymentId = null;
    this.trackingNumber = null;
    this.cancelReason = null;
  }

  addItem(item: Item): void {
    if (this.status !== "draft") {
      throw new Error(`Cannot add items when order is ${this.status}`);
    }
    this.items.push(item);
    this.subtotal += item.price;
  }

  confirm(): void {
    if (this.status !== "draft") {
      throw new Error(`Cannot confirm order from ${this.status}`);
    }
    if (this.items.length === 0) {
      throw new Error("Cannot confirm empty order");
    }
    this.status = "review";
    console.log("Order confirmed. Waiting for payment.");
  }

  pay(paymentDetails: string): void {
    if (this.status !== "review") {
      throw new Error(`Cannot pay for order in ${this.status}`);
    }
    if (!paymentDetails) {
      throw new Error("Payment details required");
    }

    // Simulate payment processing
    this.paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;
    this.status = "paid";
    console.log(`Payment successful: ${this.paymentId}`);
  }

  ship(tracking: string): void {
    if (this.status !== "paid") {
      throw new Error(`Cannot ship order that is ${this.status}`);
    }
    if (!tracking) {
      throw new Error("Tracking number required");
    }

    this.trackingNumber = tracking;
    this.status = "shipped";
    console.log(`Order shipped: ${this.trackingNumber}`);
  }

  cancel(reason: string): void {
    if (this.status === "shipped") {
      throw new Error("Cannot cancel shipped order");
    }
    this.status = "cancelled";
    this.cancelReason = reason;
    console.log(`Order cancelled: ${reason}`);
  }
}

// Demo usage
console.log("=== Idiomatic TS State Machine ===\n");

try {
  // Happy Path
  console.log("1. Happy Path:");
  const order = new Order();
  order.addItem({ id: "item1", price: 100 });
  order.addItem({ id: "item2", price: 50 });
  order.confirm();
  order.pay("visa-123");
  order.ship("TRACK-999");

  // Accessing fields requires null checks or loose typing
  if (order.trackingNumber) {
    console.log(`Done! Tracking: ${order.trackingNumber}`);
  }
  console.log();

  // Invalid Transition
  console.log("2. Invalid Transition (Runtime Error):");
  const badOrder = new Order();
  badOrder.addItem({ id: "item1", price: 100 });
  // Forgot to confirm()
  badOrder.pay("visa-123"); // Throws Error
} catch (e) {
  console.error(`Error: ${(e as Error).message}\n`);
}

try {
  // Invalid State Access
  console.log("3. Invalid State Logic:");
  const confusedOrder = new Order();
  // We can technically set fields that shouldn't exist
  confusedOrder.status = "draft";
  confusedOrder.paymentId = "fake-payment"; // Logic error allowed by type system

  if (confusedOrder.status === "draft" && confusedOrder.paymentId) {
    console.log("Logic Error: A draft order should not have a payment ID!");
  }
} catch (e) {
  console.error(e);
}
