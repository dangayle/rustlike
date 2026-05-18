import { describe, it, expect } from "vitest";
import { assertNever, match, matchKind, matchType } from "./match";

describe("assertNever", () => {
  it("throws with default message", () => {
    expect(() => assertNever("unexpected" as never)).toThrow('Unexpected value: "unexpected"');
  });

  it("throws with custom message", () => {
    expect(() => assertNever("value" as never, "Custom error")).toThrow("Custom error");
  });

  it("stringifies objects", () => {
    expect(() => assertNever({ a: 1 } as never)).toThrow('Unexpected value: {"a":1}');
  });
});

describe("match", () => {
  type Action =
    | { type: "increment"; amount: number }
    | { type: "decrement"; amount: number }
    | { type: "reset" };

  it("matches on discriminant", () => {
    const action: Action = { type: "increment", amount: 5 };

    const result = match(action as Action, "type", {
      increment: (a: Action & { type: "increment" }) => a.amount,
      decrement: (a: Action & { type: "decrement" }) => -a.amount,
      reset: () => 0,
    });

    expect(result).toBe(5);
  });

  it("matches decrement variant", () => {
    const action: Action = { type: "decrement", amount: 3 };

    const result = match(action as Action, "type", {
      increment: (a: Action & { type: "increment" }) => a.amount,
      decrement: (a: Action & { type: "decrement" }) => -a.amount,
      reset: () => 0,
    });

    expect(result).toBe(-3);
  });

  it("matches reset variant", () => {
    const action: Action = { type: "reset" };

    const result = match(action as Action, "type", {
      increment: (a: Action & { type: "increment" }) => a.amount,
      decrement: (a: Action & { type: "decrement" }) => -a.amount,
      reset: () => 0,
    });

    expect(result).toBe(0);
  });

  it("supports catch-all handler", () => {
    const action: Action = { type: "decrement", amount: 5 };

    const result = match(action as Action, "type", {
      increment: (a: Action & { type: "increment" }) => a.amount,
      _: () => 0,
    });

    expect(result).toBe(0);
  });

  it("prefers specific handler over catch-all", () => {
    const action: Action = { type: "increment", amount: 10 };

    const result = match(action as Action, "type", {
      increment: (a: Action & { type: "increment" }) => a.amount,
      _: () => 0,
    });

    expect(result).toBe(10);
  });

  it("throws for unhandled variant without catch-all", () => {
    const action: Action = { type: "reset" };

    // Missing reset handler
    expect(() =>
      match(action as Action, "type", {
        increment: () => 1,
        decrement: () => 2,
      } as any),
    ).toThrow("Unhandled variant: reset");
  });

  it("works with different discriminant names", () => {
    type Event =
      | { eventType: "click"; x: number; y: number }
      | { eventType: "keypress"; key: string };

    const event: Event = { eventType: "click", x: 10, y: 20 };

    const result = match(event as Event, "eventType", {
      click: (e: Event & { eventType: "click" }) => `clicked at ${e.x},${e.y}`,
      keypress: (e: Event & { eventType: "keypress" }) => `pressed ${e.key}`,
    });

    expect(result).toBe("clicked at 10,20");
  });
});

describe("matchKind", () => {
  type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rect"; w: number; h: number }
    | { kind: "triangle"; base: number; height: number };

  it("matches circle", () => {
    const shape: Shape = { kind: "circle", radius: 5 };

    const area = matchKind(shape as Shape, {
      circle: (s: Shape & { kind: "circle" }) => Math.PI * s.radius ** 2,
      rect: (s: Shape & { kind: "rect" }) => s.w * s.h,
      triangle: (s: Shape & { kind: "triangle" }) => (s.base * s.height) / 2,
    });

    expect(area).toBeCloseTo(Math.PI * 25);
  });

  it("matches rect", () => {
    const shape: Shape = { kind: "rect", w: 4, h: 5 };

    const area = matchKind(shape as Shape, {
      circle: (s: Shape & { kind: "circle" }) => Math.PI * s.radius ** 2,
      rect: (s: Shape & { kind: "rect" }) => s.w * s.h,
      triangle: (s: Shape & { kind: "triangle" }) => (s.base * s.height) / 2,
    });

    expect(area).toBe(20);
  });

  it("matches triangle", () => {
    const shape: Shape = { kind: "triangle", base: 6, height: 4 };

    const area = matchKind(shape as Shape, {
      circle: (s: Shape & { kind: "circle" }) => Math.PI * s.radius ** 2,
      rect: (s: Shape & { kind: "rect" }) => s.w * s.h,
      triangle: (s: Shape & { kind: "triangle" }) => (s.base * s.height) / 2,
    });

    expect(area).toBe(12);
  });

  it("supports catch-all", () => {
    const shape: Shape = { kind: "triangle", base: 6, height: 4 };

    const isCircle = matchKind(shape as Shape, {
      circle: () => true,
      _: () => false,
    });

    expect(isCircle).toBe(false);
  });
});

describe("matchType", () => {
  type Message =
    | { type: "text"; content: string }
    | { type: "image"; url: string; alt: string }
    | { type: "video"; url: string; duration: number };

  it("matches text message", () => {
    const msg: Message = { type: "text", content: "Hello" };

    const summary = matchType(msg as Message, {
      text: (m: Message & { type: "text" }) => m.content,
      image: (m: Message & { type: "image" }) => `Image: ${m.alt}`,
      video: (m: Message & { type: "video" }) => `Video: ${m.duration}s`,
    });

    expect(summary).toBe("Hello");
  });

  it("matches image message", () => {
    const msg: Message = { type: "image", url: "pic.jpg", alt: "A picture" };

    const summary = matchType(msg as Message, {
      text: (m: Message & { type: "text" }) => m.content,
      image: (m: Message & { type: "image" }) => `Image: ${m.alt}`,
      video: (m: Message & { type: "video" }) => `Video: ${m.duration}s`,
    });

    expect(summary).toBe("Image: A picture");
  });

  it("matches video message", () => {
    const msg: Message = { type: "video", url: "vid.mp4", duration: 120 };

    const summary = matchType(msg as Message, {
      text: (m: Message & { type: "text" }) => m.content,
      image: (m: Message & { type: "image" }) => `Image: ${m.alt}`,
      video: (m: Message & { type: "video" }) => `Video: ${m.duration}s`,
    });

    expect(summary).toBe("Video: 120s");
  });

  it("supports catch-all", () => {
    const msg: Message = { type: "video", url: "vid.mp4", duration: 120 };

    const isText = matchType(msg as Message, {
      text: () => true,
      _: () => false,
    });

    expect(isText).toBe(false);
  });
});

describe("exhaustiveness checking", () => {
  it("provides access to narrowed type in handlers", () => {
    type Animal = { kind: "dog"; bark: () => string } | { kind: "cat"; meow: () => string };

    const dog: Animal = { kind: "dog", bark: () => "woof" };

    const sound = matchKind(dog as Animal, {
      dog: (a: Animal & { kind: "dog" }) => a.bark(),
      cat: (a: Animal & { kind: "cat" }) => a.meow(),
    });

    expect(sound).toBe("woof");
  });
});
