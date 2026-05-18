import { Option } from "rustlike";

// Demonstrate explicit matching for nullable input
function getGreeting(name: string | null | undefined): string {
  return Option.from(name).match({
    some: (n) => `Hello, ${n}!`,
    none: () => "Hello, world!",
  });
}

// Example 1: With a name
console.log(getGreeting("World"));

// Example 2: Without a name
console.log(getGreeting(null));

// Example 3: Empty string - Option.from treats "" as Some("")
console.log(getGreeting(""));
