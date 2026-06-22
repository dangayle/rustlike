import {
  Result,
  Option,
  Ok,
  Err,
  Some,
  None,
  AsyncResult,
  tryCatch,
  toThrowable,
  toThrowableAsync,
  toNullable,
  intoThrowable,
  intoNullable,
} from "rustlike";

// ============================================================================
// Types
// ============================================================================

type Config = {
  readonly host: string;
  readonly port: number;
  readonly debug: boolean;
};

type ConfigError =
  | { readonly kind: "parse"; readonly message: string }
  | { readonly kind: "validation"; readonly field: string; readonly message: string };

// ============================================================================
// Internal implementation (Rustlike)
// ============================================================================

/** Parse a JSON string into an unknown value */
function parseJson(raw: string): Result<unknown, ConfigError> {
  return tryCatch(() => JSON.parse(raw)).mapErr((e) => ({
    kind: "parse" as const,
    message: e instanceof Error ? e.message : String(e),
  }));
}

/** Validate and extract a required string field */
function requireString(obj: Record<string, unknown>, field: string): Result<string, ConfigError> {
  const value = obj[field];
  if (typeof value !== "string") {
    return Err({ kind: "validation", field, message: `expected string, got ${typeof value}` });
  }
  return Ok(value);
}

/** Validate and extract a required number field */
function requireNumber(obj: Record<string, unknown>, field: string): Result<number, ConfigError> {
  const value = obj[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return Err({
      kind: "validation",
      field,
      message: `expected finite number, got ${typeof value}`,
    });
  }
  return Ok(value);
}

/** Look up an optional boolean field */
function optionalBool(obj: Record<string, unknown>, field: string): Option<boolean> {
  const value = obj[field];
  return typeof value === "boolean" ? Some(value) : None;
}

/** Parse and validate a config object from JSON */
function _loadConfig(raw: string): Result<Config, ConfigError> {
  return parseJson(raw).andThen((data) => {
    if (typeof data !== "object" || data === null) {
      return Err({ kind: "parse" as const, message: "expected an object" });
    }

    const obj = data as Record<string, unknown>;

    return requireString(obj, "host").andThen((host) =>
      requireNumber(obj, "port").map((port) => ({
        host,
        port,
        debug: intoNullable(optionalBool(obj, "debug")) ?? false,
      })),
    );
  });
}

/** Look up an optional string field from parsed config JSON */
function _getOptionalField(raw: string, field: string): Option<string> {
  const parsed = _loadConfig(raw);
  if (parsed.isErr()) return None;
  const obj = parsed.value as unknown as Record<string, unknown>;
  return Option.from(obj[field] as string | undefined);
}

/** Simulate async config loading (e.g., from a remote source) */
function _loadConfigAsync(raw: string): AsyncResult<Config, ConfigError> {
  return AsyncResult.fromPromise(
    new Promise<Result<Config, ConfigError>>((resolve) => {
      // Simulate async delay
      setTimeout(() => resolve(_loadConfig(raw)), 10);
    }),
  );
}

// ============================================================================
// Public API boundary — outbound interop
// ============================================================================

/** Load config from JSON string. Throws ConfigError on failure. */
const loadConfig = toThrowable(_loadConfig);

/** Load config asynchronously. Rejects with ConfigError on failure. */
const loadConfigAsync = toThrowableAsync(_loadConfigAsync);

/** Get an optional string field from config JSON. Returns string | null. */
const getOptionalField = toNullable(_getOptionalField);

// ============================================================================
// Consumer code — uses standard TypeScript patterns
// ============================================================================

function formatError(e: unknown): string {
  if (typeof e !== "object" || e === null) return `[unknown] ${String(e)}`;
  const err = e as ConfigError;
  const prefix = "field" in err ? `${err.field}: ` : "";
  return `[${err.kind ?? "unknown"}] ${prefix}${err.message ?? ""}`;
}

async function main() {
  console.log("=== Config Loader (Rustlike with outbound interop) ===\n");

  // --- Valid config ---
  const validJson = JSON.stringify({ host: "localhost", port: 8080, debug: true });

  console.log("1. Loading valid config (toThrowable):");
  try {
    const config = loadConfig(validJson);
    console.log(`   host: ${config.host}`);
    console.log(`   port: ${config.port}`);
    console.log(`   debug: ${config.debug}`);
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  // --- Invalid config (missing port) ---
  const badJson = JSON.stringify({ host: "localhost" });

  console.log("\n2. Loading invalid config (toThrowable):");
  try {
    loadConfig(badJson);
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  // --- Malformed JSON ---
  console.log("\n3. Loading malformed JSON (toThrowable):");
  try {
    loadConfig("not json at all");
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  // --- Optional field lookup ---
  console.log("\n4. Optional field lookup (toNullable):");
  const host = getOptionalField(validJson, "host");
  const missing = getOptionalField(validJson, "region");
  console.log(`   host: ${host ?? "(not set)"}`);
  console.log(`   region: ${missing ?? "(not set)"}`);

  // --- One-shot value conversion ---
  console.log("\n5. One-shot value conversion (intoThrowable / intoNullable):");
  const result = _loadConfig(validJson);
  const config = intoThrowable(result);
  console.log(`   intoThrowable: got config with host=${config.host}`);

  const debugFlag = intoNullable(optionalBool({ debug: true }, "debug"));
  const noFlag = intoNullable(optionalBool({}, "debug"));
  console.log(`   intoNullable(Some): ${debugFlag}`);
  console.log(`   intoNullable(None): ${noFlag}`);

  // --- Async loading ---
  console.log("\n6. Async config loading (toThrowableAsync):");
  try {
    const asyncConfig = await loadConfigAsync(validJson);
    console.log(`   host: ${asyncConfig.host}`);
    console.log(`   port: ${asyncConfig.port}`);
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  console.log("\n7. Async config loading with error (toThrowableAsync):");
  try {
    await loadConfigAsync("invalid");
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  console.log("\nDone.");
}

main();
