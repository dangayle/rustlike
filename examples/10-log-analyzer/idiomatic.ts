/**
 * Log Analyzer - Idiomatic TypeScript Implementation
 *
 * Standard TypeScript approach:
 * - Load entire file into memory
 * - Multiple array passes for analysis
 * - try/catch for error handling
 * - null/undefined checks
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  stackTrace: string[];
}

interface AnalysisReport {
  totalEntries: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  errorsByService: Record<string, number>;
  slowRequests: { service: string; durationMs: number }[];
  errors: { service: string; message: string }[];
}

// ============================================================================
// Parsing
// ============================================================================

const LOG_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+(INFO|WARN|ERROR)\s+\[(\w+)\]\s+(.+)$/;
const DURATION_PATTERN = /completed in (\d+)ms/;
const STACK_FRAME_PATTERN = /^\s+at\s+/;

function parseLogLevel(level: string): LogLevel | null {
  if (level === "INFO" || level === "WARN" || level === "ERROR") {
    return level;
  }
  return null;
}

function parseLogLine(line: string): LogEntry | null {
  const match = line.match(LOG_PATTERN);
  if (!match) {
    return null;
  }

  const [, timestampStr, levelStr, service, message] = match;
  if (!timestampStr || !levelStr || !service || !message) {
    return null;
  }

  const level = parseLogLevel(levelStr);
  if (!level) {
    return null;
  }

  const timestamp = new Date(timestampStr);
  if (isNaN(timestamp.getTime())) {
    return null;
  }

  return {
    timestamp,
    level,
    service,
    message,
    stackTrace: [],
  };
}

/**
 * Parse log entries with multi-line support.
 * Stack traces are continuation lines that start with whitespace.
 */
function parseLogEntries(content: string): LogEntry[] {
  const lines = content.split("\n");
  const entries: LogEntry[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Try to parse as a log entry
    const entry = parseLogLine(line);
    if (!entry) {
      // Skip malformed lines
      i++;
      continue;
    }

    // Look ahead for stack trace lines
    i++;
    while (i < lines.length) {
      const stackLine = lines[i];
      if (!stackLine || !STACK_FRAME_PATTERN.test(stackLine)) break;
      entry.stackTrace.push(stackLine.trim());
      i++;
    }

    entries.push(entry);
  }

  return entries;
}

// ============================================================================
// Analysis
// ============================================================================

function extractDuration(message: string): number | null {
  const match = message.match(DURATION_PATTERN);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

function analyzeEntries(entries: LogEntry[]): AnalysisReport {
  // Count by level - requires full pass
  let infoCount = 0;
  let warnCount = 0;
  let errorCount = 0;

  for (const entry of entries) {
    switch (entry.level) {
      case "INFO":
        infoCount++;
        break;
      case "WARN":
        warnCount++;
        break;
      case "ERROR":
        errorCount++;
        break;
    }
  }

  // Errors by service - requires another pass
  const errorsByService: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.level === "ERROR") {
      errorsByService[entry.service] = (errorsByService[entry.service] || 0) + 1;
    }
  }

  // Slow requests - requires another pass
  const slowRequests: { service: string; durationMs: number }[] = [];
  for (const entry of entries) {
    if (entry.message.includes("completed in")) {
      const duration = extractDuration(entry.message);
      if (duration !== null && duration > 1000) {
        slowRequests.push({
          service: entry.service,
          durationMs: duration,
        });
      }
    }
  }

  // Error messages - requires another pass
  const errors: { service: string; message: string }[] = [];
  for (const entry of entries) {
    if (entry.level === "ERROR") {
      errors.push({
        service: entry.service,
        message: entry.message,
      });
    }
  }

  return {
    totalEntries: entries.length,
    errorCount,
    warnCount,
    infoCount,
    errorsByService,
    slowRequests,
    errors,
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

function main(): void {
  const logFile = path.join(__dirname, "sample.log");

  console.log("Log Analyzer (Idiomatic TypeScript Implementation)");
  console.log(`Reading: ${logFile}`);
  console.log("");

  try {
    // Load entire file into memory
    const content = fs.readFileSync(logFile, "utf-8");

    // Parse all entries
    const entries = parseLogEntries(content);

    // Analyze with multiple passes
    const report = analyzeEntries(entries);

    // Output
    console.log(formatReport(report));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

main();
