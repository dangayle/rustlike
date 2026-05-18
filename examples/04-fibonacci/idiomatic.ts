// Idiomatic TypeScript version - simple recursive approach with try/catch
function fibonacci(n: number, memo: Map<number, number> = new Map()): number {
  if (n < 0) {
    throw new Error("Fibonacci is not defined for negative numbers");
  }

  if (n === 0) return 0;
  if (n === 1) return 1;

  const cached = memo.get(n);
  if (cached !== undefined) {
    return cached;
  }

  const result = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  memo.set(n, result);
  return result;
}

// Generate fibonacci sequence up to n terms
function fibonacciSequence(n: number): number[] {
  if (n < 1) {
    throw new Error("Must request at least 1 term");
  }

  const memo = new Map();
  const results: number[] = [];
  for (let i = 0; i < n; i++) {
    results.push(fibonacci(i, memo));
  }
  return results;
}

// Find the first fibonacci number greater than a threshold
function findFirstFibAbove(threshold: number): { n: number; value: number } {
  if (threshold < 0) {
    throw new Error("Threshold must be non-negative");
  }

  let n = 0;
  const memo = new Map();

  while (n <= 1000) {
    const value = fibonacci(n, memo);
    if (value > threshold) {
      return { n, value };
    }
    n++;
  }

  throw new Error("Exceeded maximum iterations");
}

// Demo
console.log("=== Fibonacci Demo ===\n");

// Test specific numbers
console.log("Individual fibonacci numbers:");
[0, 1, 5, 10, 20, -1].forEach((n) => {
  try {
    console.log(`  fib(${n}) = ${fibonacci(n)}`);
  } catch (e) {
    console.error(`  fib(${n}): Error - ${(e as Error).message}`);
  }
});

// Generate sequence
console.log("\nFirst 15 fibonacci numbers:");
try {
  const seq = fibonacciSequence(15);
  console.log(`  ${seq.join(", ")}`);
} catch (e) {
  console.error(`  Error: ${(e as Error).message}`);
}

// Find first number above threshold
console.log("\nFirst fibonacci number above 1000:");
try {
  const result = findFirstFibAbove(1000);
  console.log(`  fib(${result.n}) = ${result.value}`);
} catch (e) {
  console.error(`  Error: ${(e as Error).message}`);
}

// Calculate sum of first 10
console.log("\nSum of first 10 fibonacci numbers:");
try {
  const seq = fibonacciSequence(10);
  const sum = seq.reduce((acc, n) => acc + n, 0);
  console.log(`  Sum = ${sum}`);
} catch (e) {
  console.error(`  Error: ${(e as Error).message}`);
}

// Error handling
console.log("\nError handling:");
try {
  fibonacciSequence(0);
} catch (e) {
  console.error(`  Error: ${(e as Error).message}`);
}
