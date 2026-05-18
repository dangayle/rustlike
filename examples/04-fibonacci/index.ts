import { Result, Ok, Err, Option, iterFromGenerator, Iter } from "rustlike";

// Recursive fibonacci with memoization using Option
function fibonacci(n: number, memo: Map<number, number> = new Map()): Result<number, string> {
  if (n < 0) {
    return Err("Fibonacci is not defined for negative numbers");
  }

  if (n === 0) return Ok(0);
  if (n === 1) return Ok(1);

  // Check memo
  const cached = Option.from(memo.get(n));
  return cached.match({
    some: (value) => Ok(value),
    none: () =>
      fibonacci(n - 1, memo).andThen((a) =>
        fibonacci(n - 2, memo).andThen((b) => {
          const result = a + b;
          memo.set(n, result);
          return Ok(result);
        }),
      ),
  });
}

// Infinite fibonacci generator — yields [0, 1, 1, 2, 3, 5, 8, ...]
function* fibGen(): Generator<number> {
  let a = 0,
    b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

// Generate fibonacci sequence using lazy iterators
function fibonacciSequence(n: number): Result<number[], string> {
  if (n < 1) {
    return Err("Must request at least 1 term");
  }
  return Ok(iterFromGenerator(fibGen).take(n).collect());
}

// Find the first fibonacci number greater than a threshold using iterators
function findFirstFibAbove(threshold: number): Result<{ index: number; value: number }, string> {
  if (threshold < 0) {
    return Err("Threshold must be non-negative");
  }

  // Use enumerate + find to get the index and value lazily
  return iterFromGenerator(fibGen)
    .take(1000) // safety limit
    .enumerate()
    .find(([_, value]) => value > threshold)
    .map(([index, value]) => ({ index, value }))
    .okOr("Exceeded maximum iterations");
}

// Demo
console.log("=== Fibonacci Demo ===\n");

// Test specific numbers
console.log("Individual fibonacci numbers:");
[0, 1, 5, 10, 20, -1].forEach((n) => {
  fibonacci(n).match({
    ok: (value) => console.log(`  fib(${n}) = ${value}`),
    err: (e) => console.error(`  fib(${n}): Error - ${e}`),
  });
});

// Generate sequence using infinite generator + take
console.log("\nFirst 15 fibonacci numbers:");
fibonacciSequence(15).match({
  ok: (seq) => console.log(`  ${seq.join(", ")}`),
  err: (e) => console.error(`  Error: ${e}`),
});

// Find first number above threshold
console.log("\nFirst fibonacci number above 1000:");
findFirstFibAbove(1000).match({
  ok: ({ index, value }) => console.log(`  fib(${index}) = ${value}`),
  err: (e) => console.error(`  Error: ${e}`),
});

// Sum via Iter.sum
console.log("\nSum of first 10 fibonacci numbers:");
fibonacciSequence(10)
  .map((seq) => Iter.sum(Iter.from(seq)))
  .match({
    ok: (sum) => console.log(`  Sum = ${sum}`),
    err: (e) => console.error(`  Error: ${e}`),
  });

// Error handling
console.log("\nError handling:");
fibonacciSequence(0).match({
  ok: (seq) => console.log(`  Sequence: ${seq}`),
  err: (e) => console.error(`  Error: ${e}`),
});
