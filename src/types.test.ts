import { describe, it, expect } from "vitest";
import {
  brand,
  newtype,
  isNonEmpty,
  nonEmpty,
  head,
  type Brand,
  type NonEmptyArray,
} from "./types";

describe("brand", () => {
  it("creates a branded value", () => {
    const UserId = brand<number, "UserId">();
    const id = UserId(42);
    expect(id).toBe(42);
  });

  it("maintains type at runtime", () => {
    const Email = brand<string, "Email">();
    const email = Email("test@example.com");
    expect(typeof email).toBe("string");
    expect(email).toBe("test@example.com");
  });

  it("creates different branded types", () => {
    const UserId = brand<number, "UserId">();
    const OrderId = brand<number, "OrderId">();

    const userId = UserId(1);
    const orderId = OrderId(1);

    // Runtime values are equal, but types are different
    expect(userId).toBe(orderId);
    // Type system would prevent: orderId = userId
  });
});

describe("newtype", () => {
  describe("parse", () => {
    it("returns Ok for valid input with static error", () => {
      const PositiveNumber = newtype<number, "Positive">((n) => n > 0, "Must be positive");

      const result = PositiveNumber.parse(42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it("returns Err for invalid input with static error", () => {
      const PositiveNumber = newtype<number, "Positive">((n) => n > 0, "Must be positive");

      const result = PositiveNumber.parse(-1);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Must be positive");
    });

    it("returns Err with dynamic error message", () => {
      const PositiveNumber = newtype<number, "Positive">(
        (n) => n > 0,
        (n) => `Expected positive, got ${n}`,
      );

      const result = PositiveNumber.parse(-5);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("Expected positive, got -5");
    });

    it("works with email validation", () => {
      const Email = newtype<string, "Email">((s) => s.includes("@"), "Invalid email");

      expect(Email.parse("test@example.com").isOk()).toBe(true);
      expect(Email.parse("invalid").isErr()).toBe(true);
    });

    it("works with custom error types", () => {
      type ValidationError = { code: string; message: string };

      const NonEmptyString = newtype<string, "NonEmpty", ValidationError>((s) => s.length > 0, {
        code: "EMPTY",
        message: "String cannot be empty",
      });

      const result = NonEmptyString.parse("");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toEqual({ code: "EMPTY", message: "String cannot be empty" });
    });
  });

  describe("unsafe", () => {
    it("bypasses validation", () => {
      const PositiveNumber = newtype<number, "Positive">((n) => n > 0, "Must be positive");

      // This would fail validation but unsafe bypasses it
      const value = PositiveNumber.unsafe(-1);
      expect(value).toBe(-1);
    });

    it("casts to branded type", () => {
      const Email = newtype<string, "Email">((s) => s.includes("@"), "Invalid email");

      const email = Email.unsafe("trusted@source.com");
      expect(email).toBe("trusted@source.com");
    });
  });
});

describe("NonEmptyArray", () => {
  describe("isNonEmpty", () => {
    it("returns true for non-empty array", () => {
      expect(isNonEmpty([1, 2, 3])).toBe(true);
    });

    it("returns true for single element array", () => {
      expect(isNonEmpty([1])).toBe(true);
    });

    it("returns false for empty array", () => {
      expect(isNonEmpty([])).toBe(false);
    });

    it("works as type guard", () => {
      const arr = [1, 2, 3];
      if (isNonEmpty(arr)) {
        // TypeScript knows arr is NonEmptyArray<number>
        const first: number = arr[0];
        expect(first).toBe(1);
      }
    });
  });

  describe("nonEmpty", () => {
    it("creates non-empty array from single value", () => {
      const arr = nonEmpty(1);
      expect(arr).toEqual([1]);
    });

    it("creates non-empty array from multiple values", () => {
      const arr = nonEmpty(1, 2, 3);
      expect(arr).toEqual([1, 2, 3]);
    });

    it("returns readonly tuple type", () => {
      const arr: NonEmptyArray<number> = nonEmpty(1, 2, 3);
      expect(arr.length).toBeGreaterThan(0);
    });
  });

  describe("head", () => {
    it("returns first element", () => {
      const arr = nonEmpty(1, 2, 3);
      expect(head(arr)).toBe(1);
    });

    it("works with single element", () => {
      const arr = nonEmpty("only");
      expect(head(arr)).toBe("only");
    });

    it("works with objects", () => {
      const arr = nonEmpty({ id: 1 }, { id: 2 });
      expect(head(arr)).toEqual({ id: 1 });
    });
  });
});

describe("Brand type", () => {
  it("creates nominal types from structural types", () => {
    type UserId = Brand<number, "UserId">;
    type OrderId = Brand<number, "OrderId">;

    const userId: UserId = 1 as UserId;
    const orderId: OrderId = 2 as OrderId;

    // Both are numbers at runtime
    expect(typeof userId).toBe("number");
    expect(typeof orderId).toBe("number");

    // Type system prevents assignment between them
    // (can't test at runtime, but structure is correct)
    expect(userId).toBe(1);
    expect(orderId).toBe(2);
  });
});
