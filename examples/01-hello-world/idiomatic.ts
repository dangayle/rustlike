// Idiomatic TypeScript version - the standard way
function getGreeting(name: string | null | undefined): string {
  if (name != null) {
    return `Hello, ${name}!`;
  }
  return "Hello, world!";
}

// Example 1: With a name
console.log(getGreeting("World"));

// Example 2: Without a name
console.log(getGreeting(null));

// Example 3: Empty string - still a valid name
console.log(getGreeting(""));
