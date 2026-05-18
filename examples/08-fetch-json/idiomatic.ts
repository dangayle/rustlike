// Idiomatic TypeScript version - standard async/await with null checks
type ExamplePayload = {
  readonly title: string;
  readonly description: string;
};

// Standard async/await with null/undefined checks
async function fetchExampleJson(url: string): Promise<ExamplePayload> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText || ""}`.trim());
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`Expected application/json but got ${contentType ?? "unknown"}`);
  }

  const data = await response.json();

  if (typeof data !== "object" || data === null) {
    throw new Error("Response is not an object");
  }

  const value = data as Record<string, unknown>;

  if (typeof value.title !== "string") {
    throw new Error('Missing string "title" field');
  }

  if (typeof value.description !== "string") {
    throw new Error('Missing string "description" field');
  }

  return {
    title: value.title,
    description: value.description,
  };
}

async function main() {
  const url = "https://example.com/";

  console.log("=== Fetch JSON with boundary validation ===");
  console.log(`Requesting: ${url}\n`);

  try {
    const payload = await fetchExampleJson(url);
    console.log("Success:");
    console.log(`  title: ${payload.title}`);
    console.log(`  description: ${payload.description}`);
  } catch (e) {
    console.error("Request failed:");
    console.error(`  ${(e as Error).message}`);
  }
}

main();
