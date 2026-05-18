/**
 * Log Analyzer - Rust-like Implementation
 *
 * Demonstrates lazy iterators with:
 * - Memory-efficient line-by-line processing (Async Stream)
 * - Multi-line log entry parsing with peek()
 * - Error handling with Result<T, E>
 * - Single-pass aggregation via fold()
 */

import { Result, Ok, Err, Option, Some, None, AsyncIter } from "rustlike";
import { asyncIterLines } from "rustlike/node";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

type LogLevel = "INFO" | "WARN" | "ERROR";

type LogEntry = {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly service: string;
  readonly message: string;
  readonly stackTrace: readonly string[];
};

type AnalysisReport = {
  readonly totalEntries: number;
  readonly errorCount: number;
  readonly warnCount: number;
  readonly infoCount: number;
  readonly errorsByService: Record<string, number>;
  readonly slowRequests: readonly { service: string; durationMs: number }[];
  readonly errors: readonly { service: string; message: string }[];
};

const EMPTY_REPORT: AnalysisReport = {
  totalEntries: 0,
  errorCount: 0,
  warnCount: 0,
  infoCount: 0,
  errorsByService: {},
  slowRequests: [],
  errors: [],
};

// ============================================================================
// Parsing
// ============================================================================

const LOG_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(INFO|WARN|ERROR)\s+\[(\w+)\]\s+(.+)$/;
const DURATION_PATTERN = /completed in (\d+)ms/;
const STACK_FRAME_PATTERN = /^\s+at\s+/;

function parseLogLevel(level: string): Option<LogLevel> {
  if (level === "INFO" || level === "WARN" || level === "ERROR") {
    return Some(level as LogLevel);
  }
  return None;
}

function parseLogLine(line: string): Result<LogEntry, string> {
  const match = line.match(LOG_PATTERN);
  if (!match) {
    return Err(`Invalid log format: ${line.substring(0, 50)}...`);
  }

  const [, timestampStr, levelStr, service, message] = match;
  if (!timestampStr || !levelStr || !service || !message) {
    return Err(`Invalid log format: missing fields`);
  }

  const level = parseLogLevel(levelStr);
  if (level.isNone()) {
    return Err(`Unknown log level: ${levelStr}`);
  }

  const timestamp = new Date(timestampStr);
  if (isNaN(timestamp.getTime())) {
    return Err(`Invalid timestamp: ${timestampStr}`);
  }

  return Ok({
    timestamp,
    level: level.unwrap(),
    service,
    message,
    stackTrace: [],
  });
}

/**
 * Lazy parser that consumes lines and yields LogEntries.
 * This is an AsyncGenerator that maintains state between yields.
 */
async function* parseLogEntries(lines: AsyncIter<string>): AsyncGenerator<LogEntry> {
  // We use the iterator interface directly to allow peeking
  const iterator = lines.peekable();

  // Manual loop using peek/next pattern for multi-line parsing
  while ((await iterator.peek()).isSome()) {
    const result = await iterator.next();
    if (result.done) break;

    const line = result.value;

    // Skip empty lines
    if (line.trim() === "") {
      continue;
    }

    // Try to parse as a log entry
    const parseResult = parseLogLine(line);
    if (parseResult.isErr()) {
      // Skip malformed lines (error recovery)
      continue;
    }

    let entry = parseResult.unwrap();
    const stackFrames: string[] = [];

    // Look ahead for stack trace lines using peek()
    // Stack frames are indented lines following an entry
    while (
      (await iterator.peek()).isSome() &&
      STACK_FRAME_PATTERN.test((await iterator.peek()).unwrap())
    ) {
      const nextResult = await iterator.next();
      if (!nextResult.done) {
        stackFrames.push(nextResult.value.trim());
      }
    }

    // Add stack frames if any
    if (stackFrames.length > 0) {
      entry = { ...entry, stackTrace: stackFrames };
    }

    yield entry;
  }
}

// ============================================================================
// Analysis
// ============================================================================

function extractDuration(message: string): Option<number> {
  const match = message.match(DURATION_PATTERN);
  if (match && match[1]) {
    return Some(parseInt(match[1], 10));
  }
  return None;
}

/**
 * Single-pass analysis using fold.
 * This updates the report incrementally for each entry.
 */
function analyzeEntry(report: AnalysisReport, entry: LogEntry): AnalysisReport {
  // 1. Update Counts
  const newCounts = {
    info: report.infoCount + (entry.level === "INFO" ? 1 : 0),
    warn: report.warnCount + (entry.level === "WARN" ? 1 : 0),
    error: report.errorCount + (entry.level === "ERROR" ? 1 : 0),
  };

  // 2. Update Errors by Service
  const newErrorsByService = { ...report.errorsByService };
  if (entry.level === "ERROR") {
    newErrorsByService[entry.service] = (newErrorsByService[entry.service] || 0) + 1;
  }

  // 3. Check for Slow Requests
  const newSlowRequests = [...report.slowRequests];
  if (entry.message.includes("completed in")) {
    const duration = extractDuration(entry.message);
    if (duration.isSome() && duration.unwrap() > 1000) {
      newSlowRequests.push({
        service: entry.service,
        durationMs: duration.unwrap(),
      });
    }
  }

  // 4. Collect Error Messages
  const newErrors = [...report.errors];
  if (entry.level === "ERROR") {
    newErrors.push({
      service: entry.service,
      message: entry.message,
    });
  }

  return {
    totalEntries: report.totalEntries + 1,
    infoCount: newCounts.info,
    warnCount: newCounts.warn,
    errorCount: newCounts.error,
    errorsByService: newErrorsByService,
    slowRequests: newSlowRequests,
    errors: newErrors,
  };
}

// ============================================================================
// Output
// ============================================================================

function formatReport(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push("=== Log Analysis Report ===");
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Total entries: ${report.totalEntries}`);
  lines.push(`  INFO:  ${report.infoCount}`);
  lines.push(`  WARN:  ${report.warnCount}`);
  lines.push(`  ERROR: ${report.errorCount}`);
  lines.push("");

  if (Object.keys(report.errorsByService).length > 0) {
    lines.push("Errors by Service:");
    for (const [service, count] of Object.entries(report.errorsByService)) {
      lines.push(`  ${service}: ${count}`);
    }
    lines.push("");
  }

  if (report.slowRequests.length > 0) {
    lines.push("Slow Requests (>1000ms):");
    for (const req of report.slowRequests) {
      lines.push(`  ${req.service}: ${req.durationMs}ms`);
    }
    lines.push("");
  }

  if (report.errors.length > 0) {
    lines.push("Error Messages:");
    for (const err of report.errors) {
      lines.push(`  [${err.service}] ${err.message}`);
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const logFile = path.join(__dirname, "sample.log");

  console.log("Log Analyzer (Rust-like Lazy Implementation)");
  console.log(`Reading: ${logFile}`);
  console.log("");

  // 1. Create async iterator from file stream
  const fileResult = await asyncIterLines(logFile);

  if (fileResult.isErr()) {
    console.error(`Error: ${fileResult.unwrapErr()}`);
    process.exit(1);
  }

  const lines = fileResult.unwrap();

  // 2. Transform lines into LogEntries lazily
  // AsyncIter.fromGenerator takes a generator function
  const entries = AsyncIter.fromGenerator(() => parseLogEntries(lines));

  // 3. Reduce entries into a report (Single Pass)
  const report = await entries.fold(EMPTY_REPORT, analyzeEntry);

  // 4. Output
  console.log(formatReport(report));
}

main().catch((e) => console.error(e));
