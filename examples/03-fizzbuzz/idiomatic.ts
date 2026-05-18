// Idiomatic TypeScript version - simple imperative approach
type FizzBuzzKind = "fizzbuzz" | "fizz" | "buzz" | "number";

function fizzbuzz(n: number): { kind: FizzBuzzKind; value: string } {
  if (n < 1) {
    throw new Error("Number must be positive");
  }

  if (n % 3 === 0 && n % 5 === 0) {
    return { kind: "fizzbuzz", value: "FizzBuzz" };
  } else if (n % 3 === 0) {
    return { kind: "fizz", value: "Fizz" };
  } else if (n % 5 === 0) {
    return { kind: "buzz", value: "Buzz" };
  }
  return { kind: "number", value: n.toString() };
}

// Format output based on kind
// Note: if you add a new FizzBuzzKind variant, this switch compiles fine
// but silently falls through (no compiler error for missing cases).
function formatOutput(n: number, result: { kind: FizzBuzzKind; value: string }): string {
  switch (result.kind) {
    case "fizzbuzz":
      return `${n}: *** ${result.value} ***`;
    case "fizz":
      return `${n}: ${result.value} (divisible by 3)`;
    case "buzz":
      return `${n}: ${result.value} (divisible by 5)`;
    case "number":
      return `${n}`;
  }
}

// Process a range of numbers
function fizzbuzzRange(
  start: number,
  end: number,
): { n: number; result: { kind: FizzBuzzKind; value: string } }[] {
  if (start > end) {
    throw new Error("Start must be less than or equal to end");
  }

  const results: { n: number; result: { kind: FizzBuzzKind; value: string } }[] = [];
  for (let i = start; i <= end; i++) {
    results.push({ n: i, result: fizzbuzz(i) });
  }
  return results;
}

// Demo
console.log("=== FizzBuzz Demo ===\n");

// Test individual numbers
console.log("Testing specific numbers:");
[1, 3, 5, 15, 0, -1].forEach((n) => {
  try {
    const result = fizzbuzz(n);
    console.log(`  ${formatOutput(n, result)}`);
  } catch (e) {
    console.error(`  Error for ${n}: ${(e as Error).message}`);
  }
});

// FizzBuzz 1-30
console.log("\nFizzBuzz 1-30:");
try {
  const results = fizzbuzzRange(1, 30);
  results.forEach(({ n, result }) => {
    console.log(`  ${formatOutput(n, result)}`);
  });
} catch (e) {
  console.error((e as Error).message);
}

// Collect only the Fizz results
console.log('\nOnly "Fizz" results from 1-30:');
try {
  const results = fizzbuzzRange(1, 30);
  results
    .filter((item) => item.result.kind === "fizz")
    .forEach((item) => {
      console.log(`  ${item.n}`);
    });
} catch (e) {
  console.error((e as Error).message);
}
