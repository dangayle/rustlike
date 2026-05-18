import { Result, Option, Err, Ok, AsyncResult } from "rustlike";

type ExamplePayload = {
  readonly title: string;
  readonly description: string;
};

// Ensure the HTTP response is OK and JSON before we try to parse it.
function ensureJsonResponse(response: Response): Result<Response, string> {
  if (!response.ok) {
    return Err(`HTTP ${response.status} ${response.statusText || ""}`.trim());
  }

  const contentType = Option.from(response.headers.get("content-type"));

  return contentType
    .filter((ct) => ct.includes("application/json"))
    .okOr(`Expected application/json but got ${contentType.unwrapOr("unknown")}`)
    .map(() => response);
}

// Narrow unknown JSON into the exact shape we expect.
// This implements "Parse, Don't Validate": we check structure and return a typed result.
function parsePayload(data: unknown): Result<ExamplePayload, string> {
  if (typeof data !== "object" || data === null) {
    return Err("Response is not an object");
  }

  const value = data as Record<string, unknown>;

  if (typeof value.title !== "string") {
    return Err('Missing string "title" field');
  }

  if (typeof value.description !== "string") {
    return Err('Missing string "description" field');
  }

  return Ok({
    title: value.title,
    description: value.description,
  });
}

// Fetch, validate response/JSON, then validate shape (async-friendly).
function fetchExampleJson(url: string): AsyncResult<ExamplePayload, string> {
  // We use unknown for the initial error type because fetch() throws Error objects, not strings.
  return AsyncResult.fromThrowable<Response>(() => fetch(url))
    .mapErr((e) => `Network error: ${String(e)}`)
    .andThen(ensureJsonResponse)
    .andThen((response) =>
      // response.json() returns Promise<any>, so we type T as unknown
      AsyncResult.fromThrowable<unknown>(() => response.json())
        .mapErr((e) => `Invalid JSON: ${String(e)}`)
        .andThen(parsePayload),
    );
}

async function main() {
  const url = "https://example.com/";

  // Note: example.com serves HTML, so validation should fail safely.
  console.log("=== Fetch JSON with boundary validation ===");
  console.log(`Requesting: ${url}\n`);

  const result = await fetchExampleJson(url);

  result.match({
    ok: (payload) => {
      console.log("Success:");
      console.log(`  title: ${payload.title}`);
      console.log(`  description: ${payload.description}`);
    },
    err: (message) => {
      console.error("Request failed safely:");
      console.error(`  ${message}`);
      console.error("Stopped before touching unknown data.");
    },
  });
}

main();
