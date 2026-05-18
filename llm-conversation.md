How can I begin to write Typescript in a Rust-like way? I want to get into the habit of writing JS/TS in a way that facilitates how to think in Rust. For instance, not using classes, focusing on immutable code, etc

---

This is a fantastic exercise. Rust imposes strict discipline regarding memory safety, types, and error handling. By adopting these patterns in TypeScript, you not only prepare yourself for Rust, but you will also likely write more robust, bug-free TypeScript.

Here is a guide to writing TypeScript in a "Rust-like" style.

---

### 1. Separate Data from Behavior

Rust does not use classes in the traditional OOP sense. Instead, it uses `structs` (to hold data) and `impl` blocks (to define behavior). In TypeScript, avoid `class`. Instead, use `type`/`interface` for data and standalone functions for behavior.

**The "Standard" TS Way (OOP):**

```typescript
class Player {
  constructor(public health: number) {}

  takeDamage(amount: number) {
    this.health -= amount;
  }
}
```

**The Rust-like Way:**
Define the data shape, then define functions that operate on that data.

```typescript
// The "Struct"
type Player = {
  readonly health: number;
  readonly name: string;
};

// The "Impl" (Behavior)
const Player = {
  create: (name: string): Player => ({ name, health: 100 }),

  // Return a NEW state rather than mutating 'this'
  takeDamage: (player: Player, amount: number): Player => ({
    ...player,
    health: player.health - amount,
  }),
};

// Usage
const p1 = Player.create("Hero");
const p2 = Player.takeDamage(p1, 10);
```

### 2. Embrace Immutability

Rust variables are immutable by default. To emulate this in TypeScript, you must be disciplined, as TS is mutable by default.

- **Use `const` exclusively:** Never use `let` or `var`.
- **Use `readonly`:** Mark all properties in your types as `readonly`.
- **Use `ReadonlyArray`:** Standard arrays are mutable.

```typescript
type Vector3 = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

// ❌ Bad (Mutable)
// function move(v: Vector3) { v.x += 1; }

// ✅ Good (Immutable / Rust-like)
function move(v: Vector3): Vector3 {
  return { ...v, x: v.x + 1 };
}
```

### 3. Algebraic Data Types (ADTs) & Discriminated Unions

Rust Enums are powerful—they can hold data. This is often called an "Algebraic Data Type." TypeScript supports this natively via **Discriminated Unions**. This is the single most important bridge concept between TS and Rust.

**Rust Concept:**

```rust
enum Shape {
    Circle(f64),
    Rectangle(f64, f64)
}

```

**TypeScript Implementation:**
Use a literal `kind` or `type` tag to differentiate variants.

```typescript
type Circle = { readonly kind: "Circle"; readonly radius: number };
type Rect = { readonly kind: "Rect"; readonly width: number; readonly height: number };

// This Union is your "Enum"
type Shape = Circle | Rect;

const area = (s: Shape): number => {
  switch (s.kind) {
    case "Circle":
      return Math.PI * s.radius ** 2; // TS knows s is Circle here
    case "Rect":
      return s.width * s.height; // TS knows s is Rect here
  }
};
```

### 4. Exhaustive Pattern Matching

Rust forces you to handle every possibility in a `match` statement. TypeScript's `switch` does not enforce this by default. You can simulate "Exhaustiveness Checking" using the `never` type.

If you add a new shape later (e.g., `Triangle`) and forget to update the switch case, the compiler will error here, just like Rust would.

```typescript
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

const area = (s: Shape): number => {
  switch (s.kind) {
    case "Circle":
      return Math.PI * s.radius ** 2;
    case "Rect":
      return s.width * s.height;
    default:
      // If 's' is not never here, the compiler errors!
      return assertNever(s);
  }
};
```

### 5. Errors as Values (Result Pattern)

Rust hates Exceptions (`try/catch`). Exceptions are invisible control flow. Rust returns a `Result<T, E>`. In TypeScript, stop throwing errors. Return them.

You can implement a simple `Result` type or use a library like `neverthrow`.

**The Rust-like Way:**

```typescript
type Result<T, E> = { success: true; value: T } | { success: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { success: false, error: "Cannot divide by zero" };
  }
  return { success: true, value: a / b };
}

// Usage requires handling the error explicitly
const outcome = divide(10, 0);
if (outcome.success) {
  console.log(outcome.value);
} else {
  console.error(outcome.error);
}
```

This forces the caller to acknowledge that the function might fail, removing "surprise" runtime crashes.

### 6. No `null` or `undefined` (Option Pattern)

Rust does not have `null`. It has `Option<T>` (Some or None). In TypeScript, strict null checks help, but you can go further by explicitly modeling the absence of a value rather than passing `undefined` around silently.

```typescript
type Option<T> = T | null; // Or use a wrapper object similar to Result above

function findUser(id: number): Option<string> {
  // Explicitly return null if not found, forcing a check
  return id === 1 ? "Alice" : null;
}
```

_Note: While `undefined` is idiomatic JS, treating it as an explicit `None` case (and never ignoring it) aligns you with Rust thinking._

### 7. Composition over Inheritance

Rust uses **Traits** to share behavior, not class inheritance. In TypeScript, prefer intersection types and functional composition.

**The Rust-like Way:**
Instead of `class Dog extends Animal`, describe capabilities.

```typescript
type HasPosition = { x: number; y: number };
type HasHealth = { health: number };

// Composition
type GameEntity = HasPosition & HasHealth & { name: string };

function move(entity: HasPosition, dx: number): HasPosition {
  return { ...entity, x: entity.x + dx };
}
```

---

### Summary Checklist for Rust-like TS

| Feature          | Standard TS / JS          | Rust-like TS                        |
| ---------------- | ------------------------- | ----------------------------------- |
| **Data**         | Classes with methods      | `type`/`interface` (Data only)      |
| **Behavior**     | Class methods             | Pure functions accepting data       |
| **State**        | `let`, mutable properties | `const`, `readonly`, spread copies  |
| **Polymorphism** | Inheritance (`extends`)   | Discriminated Unions (ADTs)         |
| **Flow Control** | `if/else`                 | `switch` with exhaustiveness checks |
| **Errors**       | `throw` / `try-catch`     | Return `Result` objects             |
| **Nulls**        | `undefined` everywhere    | `Option` type or strict checks      |

### A High-Value Next Step

Would you like me to rewrite a specific small snippet of your current "Class-based" TypeScript code into this "Rust-like" style so you can see a direct comparison?
