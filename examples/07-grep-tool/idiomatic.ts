// Idiomatic TypeScript version - using exceptions and null
import * as fs from "fs";

type SearchOptions = {
  caseInsensitive?: boolean;
  multiline?: boolean;
};

type TextMatch = {
  lineNumber: number;
  line: string;
  matchText: string;
  matchIndex: number;
};

type FileSearchResult = {
  filepath: string;
  matches: TextMatch[];
  count: number;
};

// Read file, throw on error
function readFile(filepath: string): string {
  return fs.readFileSync(filepath, "utf-8");
}

// Parse pattern, throw on error
function parsePattern(pattern: string, options: SearchOptions = {}): RegExp {
  if (!pattern || pattern.length === 0) {
    throw new Error("Search pattern cannot be empty");
  }

  const flags: string[] = [];
  if (options.caseInsensitive) flags.push("i");
  if (options.multiline) flags.push("m");

  return new RegExp(pattern, flags.join(""));
}

// Search for pattern in text
function search(text: string, pattern: string, options: SearchOptions = {}): TextMatch[] {
  const regex = parsePattern(pattern, options);
  const lines = text.split("\n");
  const matches: TextMatch[] = [];

  lines.forEach((line, index) => {
    const match = line.match(regex);
    if (match) {
      const matchIndex = match.index ?? 0;
      matches.push({
        lineNumber: index + 1,
        line: line,
        matchText: match[0],
        matchIndex,
      });
    }
  });

  return matches;
}

// Search in file
function searchFile(
  filepath: string,
  pattern: string,
  options: SearchOptions = {},
): FileSearchResult {
  const content = readFile(filepath);
  const matches = search(content, pattern, options);
  return {
    filepath,
    matches,
    count: matches.length,
  };
}

// Count matches
function countMatches(text: string, pattern: string, options: SearchOptions = {}): number {
  return search(text, pattern, options).length;
}

// Format results
function formatResults(result: FileSearchResult, showContext = false): string {
  if (result.matches.length === 0) {
    return `No matches found in ${result.filepath}`;
  }

  const lines = [`Found ${result.count} match(es) in ${result.filepath}:`];

  result.matches.forEach((match) => {
    lines.push(`  Line ${match.lineNumber}: ${match.line.trim()}`);

    if (showContext) {
      const pointer = " ".repeat(match.matchIndex + 2) + "^".repeat(match.matchText.length);
      lines.push(pointer);
    }
  });

  return lines.join("\n");
}

// File helpers with exceptions
function createSampleFile(filepath: string, content: string): void {
  fs.writeFileSync(filepath, content);
}

function cleanupSampleFile(filepath: string): void {
  fs.unlinkSync(filepath);
}

// Demo
console.log("=== Grep Tool Demo ===\n");

const sampleFile = "sample.txt";
const sampleContent = `Hello World
This is a test file.
The quick brown fox jumps over the lazy dog.
JavaScript and TypeScript are great.
Another test line here.
HELLO again!
Final line.`;

try {
  createSampleFile(sampleFile, sampleContent);
  console.log(`Created sample file: ${sampleFile}\n`);

  // Test 1: Basic search
  console.log('Test 1: Search for "test"');
  const result1 = searchFile(sampleFile, "test");
  console.log(formatResults(result1));

  // Test 2: Case-insensitive search
  console.log('\nTest 2: Case-insensitive search for "hello"');
  const result2 = searchFile(sampleFile, "hello", { caseInsensitive: true });
  console.log(formatResults(result2, true));

  // Test 3: Pattern matching
  console.log('\nTest 3: Search for words starting with "T"');
  const result3 = searchFile(sampleFile, "\\bT\\w+", { caseInsensitive: false });
  console.log(formatResults(result3));

  // Test 4: Count matches
  console.log('\nTest 4: Count occurrences of "the"');
  const content = readFile(sampleFile);
  const count = countMatches(content, "the", { caseInsensitive: true });
  console.log(`Found ${count} occurrence(s)`);

  // Test 5: Invalid pattern
  console.log("\nTest 5: Invalid regex pattern");
  try {
    searchFile(sampleFile, "[invalid");
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
  }

  // Test 6: Non-existent file
  console.log("\nTest 6: Search in non-existent file");
  try {
    searchFile("nonexistent.txt", "test");
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
  }

  // Clean up
  cleanupSampleFile(sampleFile);
  console.log(`\nCleaned up ${sampleFile}`);
} catch (e) {
  console.error(`Error: ${(e as Error).message}`);
}
