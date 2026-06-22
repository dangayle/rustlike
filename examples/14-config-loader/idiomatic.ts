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
// Implementation (standard TypeScript)
// ============================================================================

/** Load config from JSON string. Throws ConfigError on failure. */
function loadConfig(raw: string): Config {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw {
      kind: "parse",
      message: e instanceof Error ? e.message : String(e),
    } satisfies ConfigError;
  }

  if (typeof data !== "object" || data === null) {
    throw { kind: "parse", message: "expected an object" } satisfies ConfigError;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.host !== "string") {
    throw {
      kind: "validation",
      field: "host",
      message: `expected string, got ${typeof obj.host}`,
    } satisfies ConfigError;
  }

  if (typeof obj.port !== "number" || !Number.isFinite(obj.port)) {
    throw {
      kind: "validation",
      field: "port",
      message: `expected finite number, got ${typeof obj.port}`,
    } satisfies ConfigError;
  }

  return {
    host: obj.host,
    port: obj.port,
    debug: typeof obj.debug === "boolean" ? obj.debug : false,
  };
}

/** Get an optional string field from config JSON. Returns string | null. */
function getOptionalField(raw: string, field: string): string | null {
  try {
    const config = loadConfig(raw);
    const obj = config as unknown as Record<string, unknown>;
    const value = obj[field];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/** Simulate async config loading (e.g., from a remote source) */
async function loadConfigAsync(raw: string): Promise<Config> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(loadConfig(raw));
      } catch (e) {
        reject(e);
      }
    }, 10);
  });
}

// ============================================================================
// Consumer code — standard TypeScript patterns
// ============================================================================

function formatError(e: unknown): string {
  if (typeof e !== "object" || e === null) return `[unknown] ${String(e)}`;
  const err = e as ConfigError;
  const prefix = "field" in err ? `${err.field}: ` : "";
  return `[${err.kind ?? "unknown"}] ${prefix}${err.message ?? ""}`;
}

async function main() {
  console.log("=== Config Loader (Idiomatic TypeScript) ===\n");

  // --- Valid config ---
  const validJson = JSON.stringify({ host: "localhost", port: 8080, debug: true });

  console.log("1. Loading valid config:");
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

  console.log("\n2. Loading invalid config:");
  try {
    loadConfig(badJson);
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  // --- Malformed JSON ---
  console.log("\n3. Loading malformed JSON:");
  try {
    loadConfig("not json at all");
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  // --- Optional field lookup ---
  console.log("\n4. Optional field lookup:");
  const host = getOptionalField(validJson, "host");
  const missing = getOptionalField(validJson, "region");
  console.log(`   host: ${host ?? "(not set)"}`);
  console.log(`   region: ${missing ?? "(not set)"}`);

  // --- Direct value access ---
  console.log("\n5. One-shot value conversion:");
  const config = loadConfig(validJson);
  console.log(`   intoThrowable: got config with host=${config.host}`);

  const debugFlag =
    typeof ({ debug: true } as Record<string, unknown>).debug === "boolean"
      ? (({ debug: true } as Record<string, unknown>).debug as boolean)
      : null;
  const noFlag =
    typeof ({} as Record<string, unknown>).debug === "boolean"
      ? (({} as Record<string, unknown>).debug as boolean)
      : null;
  console.log(`   intoNullable(Some): ${debugFlag}`);
  console.log(`   intoNullable(None): ${noFlag}`);

  // --- Async loading ---
  console.log("\n6. Async config loading:");
  try {
    const asyncConfig = await loadConfigAsync(validJson);
    console.log(`   host: ${asyncConfig.host}`);
    console.log(`   port: ${asyncConfig.port}`);
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  console.log("\n7. Async config loading with error:");
  try {
    await loadConfigAsync("invalid");
  } catch (e) {
    console.error(`   Error: ${formatError(e)}`);
  }

  console.log("\nDone.");
}

main();
