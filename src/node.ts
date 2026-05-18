/**
 * Node.js-specific utilities for rustlike.
 *
 * This module contains functions that depend on Node.js built-in modules
 * (fs, readline) and should only be imported in Node.js environments.
 * Browser and edge runtime consumers should use the main 'rustlike' entry point.
 *
 * Import from 'rustlike/node' to access these functions.
 */

import * as fs from "fs";
import * as readline from "readline";
import { Result, Ok, Err } from "./core";
import { iter } from "./iter";
import { asyncIter } from "./async-iter";
import type { Iter } from "./iter";
import type { AsyncIter } from "./async-iter";

// ============================================================================
// File Reading (Sync)
// ============================================================================

/**
 * Create an Iter that lazily reads lines from a file.
 * Uses Node.js fs.readFileSync but yields lines lazily via generator.
 *
 * Note: This reads the entire file into memory but yields lines lazily.
 * For truly streaming line-by-line reading, use asyncIterLines.
 *
 * @param filepath - Path to the file to read
 * @returns Result with Iter<string> on success, error message on failure
 *
 * @example
 * const lines = iterLinesSync('data.txt');
 * lines.match({
 *   ok: (iter) => iter.skip(1).map(parseLine).collect(),
 *   err: (e) => console.error(e)
 * });
 */
export function iterLinesSync(filepath: string): Result<Iter<string>, string> {
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const lines = content.split("\n");
    // Remove trailing empty line if file ends with newline
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    return Ok(iter(lines));
  } catch (error) {
    if (error instanceof Error) {
      return Err(`Failed to read file '${filepath}': ${error.message}`);
    }
    return Err(`Failed to read file '${filepath}': ${String(error)}`);
  }
}

// ============================================================================
// File Reading (Async)
// ============================================================================

/**
 * Create an AsyncIter that reads lines from a file using streaming.
 * Truly memory-efficient - reads lines on-demand without loading entire file.
 *
 * Uses Node.js readline with createReadStream for efficient streaming.
 *
 * @param filepath - Path to the file to read
 * @returns Promise of Result with AsyncIter<string> on success, error message on failure
 *
 * @example
 * const result = await asyncIterLines('large-log.txt');
 * result.match({
 *   ok: async (iter) => {
 *     const errors = await iter
 *       .filter(line => line.includes('ERROR'))
 *       .take(100)
 *       .collect();
 *   },
 *   err: (e) => console.error(e)
 * });
 */
export async function asyncIterLines(filepath: string): Promise<Result<AsyncIter<string>, string>> {
  // Check if file exists first
  try {
    await fs.promises.access(filepath, fs.constants.R_OK);
  } catch (error) {
    if (error instanceof Error) {
      return Err(`Failed to access file '${filepath}': ${error.message}`);
    }
    return Err(`Failed to access file '${filepath}': ${String(error)}`);
  }

  // Create the async iterator using readline
  const asyncIterator = (async function* () {
    const fileStream = fs.createReadStream(filepath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity, // Handle both \n and \r\n
    });

    try {
      for await (const line of rl) {
        yield line;
      }
    } finally {
      rl.close();
      fileStream.destroy();
    }
  })();

  return Ok(asyncIter(asyncIterator));
}
