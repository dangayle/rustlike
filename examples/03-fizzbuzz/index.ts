import { Result, Ok, Err, matchType } from "rustlike";

type FizzBuzzKind = "fizzbuzz" | "fizz" | "buzz" | "number";

type FizzBuzzResult = {
  type: FizzBuzzKind;
  number: number;
  value: string;
};

// Define our FizzBuzz result type
const createFizzBuzzResult = (n: number, output: FizzBuzzKind): FizzBuzzResult => ({
  type: output,
  number: n,
  value:
    output === "fizzbuzz"
      ? "FizzBuzz"
      : output === "fizz"
        ? "Fizz"
        : output === "buzz"
          ? "Buzz"
          : n.toString(),
});

// FizzBuzz logic using exhaustive pattern matching
function fizzbuzz(n: number): Result<FizzBuzzResult, string> {
  if (n < 1) {
    return Err("Number must be positive");
  }

  const divisibleBy3 = n % 3 === 0;
  const divisibleBy5 = n % 5 === 0;

  if (divisibleBy3 && divisibleBy5) {
    return Ok(createFizzBuzzResult(n, "fizzbuzz"));
  } else if (divisibleBy3) {
    return Ok(createFizzBuzzResult(n, "fizz"));
  } else if (divisibleBy5) {
    return Ok(createFizzBuzzResult(n, "buzz"));
  } else {
    return Ok(createFizzBuzzResult(n, "number"));
  }
}

// Process a range of numbers
function fizzbuzzRange(start: number, end: number): Result<FizzBuzzResult[], string> {
  if (start > end) {
    return Err("Start must be less than or equal to end");
  }

  const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  // Result.all combines an array of Results into a single Result containing an array of values
  // It short-circuits on the first error
  return Result.all(range.map(fizzbuzz));
}

// Format output using pattern matching
// Each branch handles its type differently - if you add a new FizzBuzzKind,
// TypeScript will error until you handle it here.
function formatOutput(result: FizzBuzzResult): string {
  return matchType(result, {
    fizzbuzz: (r: FizzBuzzResult) => `${r.number}: *** ${r.value} ***`,
    fizz: (r: FizzBuzzResult) => `${r.number}: ${r.value} (divisible by 3)`,
    buzz: (r: FizzBuzzResult) => `${r.number}: ${r.value} (divisible by 5)`,
    number: (r: FizzBuzzResult) => `${r.number}`,
  });
}

// Demo
console.log("=== FizzBuzz Demo ===\n");

// Test individual numbers
console.log("Testing specific numbers:");
[1, 3, 5, 15, 0, -1].forEach((n) => {
  fizzbuzz(n).match({
    ok: (result) => console.log(`  ${formatOutput(result)}`),
    err: (e) => console.error(`  Error for ${n}: ${e}`),
  });
});

console.log("\nFizzBuzz 1-30:");
fizzbuzzRange(1, 30).match({
  ok: (results) => {
    results.forEach((result) => {
      console.log(`  ${formatOutput(result)}`);
    });
  },
  err: (e) => console.error(e),
});

// Collect only the Fizz results
console.log('\nOnly "Fizz" results from 1-30:');
fizzbuzzRange(1, 30)
  .map((results) => results.filter((r) => r.type === "fizz"))
  .match({
    ok: (fizzResults) => {
      fizzResults.forEach((r) => console.log(`  ${r.number}`));
    },
    err: (e) => console.error(e),
  });
