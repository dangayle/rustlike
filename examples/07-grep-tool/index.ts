import { Result, Err, tryCatch } from "rustlike";
import * as fs from "fs";

// Read file with error handling
function formatError(error: unknown, prefix: string): string {
  if (error instanceof Error) {
    return `${prefix}: ${error.message}`;
  }
  return `${prefix}: ${String(error)}`;
}

function readFile(filepath: string): Result<string, string> {
  return tryCatch(() => {
    const content = fs.readFileSync(filepath, "utf-8");
    return content;
  }).mapErr((error) => formatError(error, "Failed to read file"));
}

// Parse search pattern, returns Result with RegExp
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

function parsePattern(pattern: string, options: SearchOptions = {}): Result<RegExp, string> {
  if (!pattern || pattern.length === 0) {
    return Err("Search pattern cannot be empty");
  }

  return tryCatch(() => {
    const flags: string[] = [];
    if (options.caseInsensitive) flags.push("i");
    if (options.multiline) flags.push("m");

    return new RegExp(pattern, flags.join(""));
  }).mapErr((error) => formatError(error, "Invalid pattern"));
}

// Search for pattern in text
function search(
  text: string,
  pattern: string,
  options: SearchOptions = {},
): Result<TextMatch[], string> {
  return parsePattern(pattern, options).map((regex) => {
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
  });
}

// Search in file
function searchFile(
  filepath: string,
  pattern: string,
  options: SearchOptions = {},
): Result<FileSearchResult, string> {
  return readFile(filepath)
    .andThen((content) => search(content, pattern, options))
    .map((matches) => ({
      filepath,
      matches,
      count: matches.length,
    }));
}

// Count matches without details
function countMatches(
  text: string,
  pattern: string,
  options: SearchOptions = {},
): Result<number, string> {
  return search(text, pattern, options).map((matches) => matches.length);
}

// Get context lines around a match
// Format match results
function formatResults(result: FileSearchResult, showContext = false) {
  if (result.matches.length === 0) {
    return `No matches found in ${result.filepath}`;
  }

  const lines = [`Found ${result.count} match(es) in ${result.filepath}:`];

  result.matches.forEach((match) => {
    lines.push(`  Line ${match.lineNumber}: ${match.line.trim()}`);

    if (showContext) {
      // Show where the match is in the line
      const pointer = " ".repeat(match.matchIndex + 2) + "^".repeat(match.matchText.length);
      lines.push(pointer);
    }
  });

  return lines.join("\n");
}

// Safe file helpers
function createSampleFile(filepath: string, content: string): Result<string, string> {
  return tryCatch(() => {
    fs.writeFileSync(filepath, content);
    return filepath;
  }).mapErr((error) => formatError(error, "Failed to create sample file"));
}

function cleanupSampleFile(filepath: string): Result<boolean, string> {
  return tryCatch(() => {
    fs.unlinkSync(filepath);
    return true;
  }).mapErr((error) => formatError(error, "Failed to clean up file"));
}

// Demo
console.log("=== Grep Tool Demo ===\n");

// Create a sample file for testing
const sampleFile = "sample.txt";
const sampleContent = `Hello World
This is a test file.
The quick brown fox jumps over the lazy dog.
JavaScript and TypeScript are great.
Another test line here.
HELLO again!
Final line.`;

const prepared = createSampleFile(sampleFile, sampleContent).match({
  ok: () => {
    console.log(`Created sample file: ${sampleFile}\n`);
    return true;
  },
  err: (e) => {
    console.error(e);
    return false;
  },
});

if (prepared) {
  // Test 1: Basic search
  console.log('Test 1: Search for "test"');
  searchFile(sampleFile, "test").match({
    ok: (result) => console.log(formatResults(result)),
    err: (e) => console.error(`Error: ${e}`),
  });

  // Test 2: Case-insensitive search
  console.log('\nTest 2: Case-insensitive search for "hello"');
  searchFile(sampleFile, "hello", { caseInsensitive: true }).match({
    ok: (result) => console.log(formatResults(result, true)),
    err: (e) => console.error(`Error: ${e}`),
  });

  // Test 3: Pattern matching
  console.log('\nTest 3: Search for words starting with "T"');
  searchFile(sampleFile, "\\bT\\w+", { caseInsensitive: false }).match({
    ok: (result) => console.log(formatResults(result)),
    err: (e) => console.error(`Error: ${e}`),
  });

  // Test 4: Count matches
  console.log('\nTest 4: Count occurrences of "the"');
  readFile(sampleFile)
    .andThen((content) => countMatches(content, "the", { caseInsensitive: true }))
    .match({
      ok: (count) => console.log(`Found ${count} occurrence(s)`),
      err: (e) => console.error(`Error: ${e}`),
    });

  // Test 5: Invalid pattern
  console.log("\nTest 5: Invalid regex pattern");
  searchFile(sampleFile, "[invalid").match({
    ok: (result) => console.log(formatResults(result)),
    err: (e) => console.error(`Error: ${e}`),
  });

  // Test 6: Non-existent file
  console.log("\nTest 6: Search in non-existent file");
  searchFile("nonexistent.txt", "test").match({
    ok: (result) => console.log(formatResults(result)),
    err: (e) => console.error(`Error: ${e}`),
  });

  // Clean up
  cleanupSampleFile(sampleFile).match({
    ok: () => console.log(`\nCleaned up ${sampleFile}`),
    err: (e) => console.error(`\n${e}`),
  });
}
