/**
 * GraphQL Schema Validator & Query Executor - Rust-like Implementation
 *
 * Demonstrates 14+ distinct rustlike APIs in a GraphQL schema validation
 * and query execution context:
 *
 *  1. Ok / Err              - Result constructors for validation/execution outcomes
 *  2. Some / None           - Option constructors for type lookups
 *  3. Result.andThen        - Chain fallible validation operations
 *  4. Result.mapErr         - Transform error types in tryCatch
 *  5. Result.all            - Collect multiple validation Results
 *  6. Result.match          - Handle ok/err outcomes for display
 *  7. Option.okOr           - Convert Option to Result with error message
 *  8. match(v, '__typename') - Generic exhaustive matching on __typename discriminant
 *  9. assertNever           - Exhaustive switch on QueryValue __typename
 * 10. safeCall              - Wrap Map.get to return Option instead of T | undefined
 * 11. tryCatch              - Wrap throwing parser into Result
 * 12. tryAsync              - Async query execution returning Result
 * 13. newtype / Brand       - Branded scalar types (GraphQLID, NonEmptyString, etc.)
 * 14. DeepReadonly           - Immutable schema definition
 * 15. iter().map().collect() - Lazy iteration for TypeScript code generation
 * 16. iter().filter()        - Filter schema types during generation
 */

import {
  match,
  assertNever,
  tryAsync,
  safeCall,
  tryCatch,
  newtype,
  Ok,
  Err,
  Result,
  iter,
} from "rustlike";
import type { Brand, DeepReadonly } from "rustlike";

// ============================================================================
// Branded Scalar Types — validated at construction time via newtype()
// ============================================================================

type GraphQLID = Brand<string, "GraphQLID">;
const GraphQLID = newtype<string, "GraphQLID">(
  (s) => s.length > 0,
  (s) => `Invalid ID: "${s}" (must be non-empty)`,
);

type NonEmptyString = Brand<string, "NonEmptyString">;
const NonEmptyString = newtype<string, "NonEmptyString">(
  (s) => s.trim().length > 0,
  (s) => `Empty string not allowed: "${s}"`,
);

type GraphQLInt = Brand<number, "GraphQLInt">;
const GraphQLInt = newtype<number, "GraphQLInt">(
  (n) => Number.isInteger(n),
  (n) => `Invalid integer: ${n}`,
);

type NonNegativeInt = Brand<number, "NonNegativeInt">;
const NonNegativeInt = newtype<number, "NonNegativeInt">(
  (n) => Number.isInteger(n) && n >= 0,
  (n) => `Expected non-negative integer, got ${n}`,
);

// ============================================================================
// Schema Type Definitions — all use __typename discriminant
// ============================================================================

// GraphQL uses `__typename`, not `kind`/`type` — so we use the generic
// `match()` instead of `matchKind`/`matchType`.

type ScalarTypeDef = {
  readonly __typename: "ScalarTypeDef";
  readonly name: string;
};

type EnumTypeDef = {
  readonly __typename: "EnumTypeDef";
  readonly name: string;
  readonly values: readonly string[];
};

type FieldDef = {
  readonly name: string;
  readonly typeName: string;
  readonly isList: boolean;
  readonly isNonNull: boolean;
  readonly args: readonly ArgumentDef[];
};

type ArgumentDef = {
  readonly name: string;
  readonly typeName: string;
  readonly isNonNull: boolean;
};

type ObjectTypeDef = {
  readonly __typename: "ObjectTypeDef";
  readonly name: string;
  readonly fields: readonly FieldDef[];
};

type SchemaTypeDef = ScalarTypeDef | EnumTypeDef | ObjectTypeDef;

// ============================================================================
// Query AST Types — also use __typename discriminant
// ============================================================================

type StringValue = { readonly __typename: "StringValue"; readonly value: string };
type IntValue = { readonly __typename: "IntValue"; readonly value: number };
type BoolValue = { readonly __typename: "BoolValue"; readonly value: boolean };
type QueryValue = StringValue | IntValue | BoolValue;

type ArgumentNode = { readonly name: string; readonly value: QueryValue };

type FieldNode = {
  readonly __typename: "FieldNode";
  readonly name: string;
  readonly args: readonly ArgumentNode[];
  readonly selections: readonly FieldNode[];
};

type QueryDocument = {
  readonly operationName: string;
  readonly selections: readonly FieldNode[];
};

// ============================================================================
// Execution Result Types
// ============================================================================

type ScalarResult = {
  readonly __typename: "ScalarResult";
  readonly value: string | number | boolean;
};
type ObjectResult = {
  readonly __typename: "ObjectResult";
  readonly fields: ReadonlyMap<string, ExecutionValue>;
};
type ListResult = { readonly __typename: "ListResult"; readonly items: readonly ExecutionValue[] };
type NullResult = { readonly __typename: "NullResult" };
type ExecutionValue = ScalarResult | ObjectResult | ListResult | NullResult;

// ============================================================================
// Schema Definition + safeCall lookup
// ============================================================================

type Schema = {
  types: Map<string, SchemaTypeDef>;
};

const schema: DeepReadonly<Schema> = {
  types: new Map<string, SchemaTypeDef>([
    ["ID", { __typename: "ScalarTypeDef", name: "ID" }],
    ["String", { __typename: "ScalarTypeDef", name: "String" }],
    ["Int", { __typename: "ScalarTypeDef", name: "Int" }],
    ["Boolean", { __typename: "ScalarTypeDef", name: "Boolean" }],
    [
      "PostStatus",
      {
        __typename: "EnumTypeDef",
        name: "PostStatus",
        values: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      },
    ],
    [
      "User",
      {
        __typename: "ObjectTypeDef",
        name: "User",
        fields: [
          { name: "id", typeName: "ID", isList: false, isNonNull: true, args: [] },
          { name: "name", typeName: "String", isList: false, isNonNull: true, args: [] },
          { name: "email", typeName: "String", isList: false, isNonNull: true, args: [] },
          { name: "posts", typeName: "Post", isList: true, isNonNull: true, args: [] },
        ],
      },
    ],
    [
      "Post",
      {
        __typename: "ObjectTypeDef",
        name: "Post",
        fields: [
          { name: "id", typeName: "ID", isList: false, isNonNull: true, args: [] },
          { name: "title", typeName: "String", isList: false, isNonNull: true, args: [] },
          { name: "body", typeName: "String", isList: false, isNonNull: true, args: [] },
          { name: "author", typeName: "User", isList: false, isNonNull: true, args: [] },
          { name: "status", typeName: "PostStatus", isList: false, isNonNull: true, args: [] },
        ],
      },
    ],
    [
      "Query",
      {
        __typename: "ObjectTypeDef",
        name: "Query",
        fields: [
          {
            name: "user",
            typeName: "User",
            isList: false,
            isNonNull: false,
            args: [{ name: "id", typeName: "ID", isNonNull: true }],
          },
          {
            name: "posts",
            typeName: "Post",
            isList: true,
            isNonNull: true,
            args: [{ name: "limit", typeName: "Int", isNonNull: false }],
          },
        ],
      },
    ],
  ]),
};

// safeCall wraps Map.get to return Option instead of T | undefined
const lookupType = safeCall((name: string) => schema.types.get(name));

// ============================================================================
// Query Parser (simplified)
// ============================================================================

/**
 * Simplified recursive descent parser. Wraps the entire parse in tryCatch()
 * so any thrown error becomes Result.Err.
 */
function parseQuery(input: string): Result<QueryDocument, string> {
  return tryCatch<QueryDocument, string>(() => {
    const trimmed = input.trim();

    // Extract operation name: "query GetUserData { ... }"
    const headerMatch = trimmed.match(/^query\s+(\w+)\s*\{/);
    if (!headerMatch) {
      throw new Error("Expected '{' after query name");
    }
    const operationName = headerMatch[1]!;

    // Extract the body between the outermost braces
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error("Unbalanced braces in query");
    }
    const body = trimmed.slice(firstBrace + 1, lastBrace).trim();

    function parseFields(text: string): FieldNode[] {
      const fields: FieldNode[] = [];
      let pos = 0;
      const src = text.trim();

      while (pos < src.length) {
        // Skip whitespace
        while (pos < src.length && /\s/.test(src[pos]!)) pos++;
        if (pos >= src.length) break;

        // Read field name
        let name = "";
        while (pos < src.length && /\w/.test(src[pos]!)) {
          name += src[pos]!;
          pos++;
        }
        if (!name) break;

        // Skip whitespace
        while (pos < src.length && /\s/.test(src[pos]!)) pos++;

        // Parse arguments if present
        const args: ArgumentNode[] = [];
        if (pos < src.length && src[pos] === "(") {
          pos++; // skip '('
          while (pos < src.length && src[pos] !== ")") {
            while (pos < src.length && /\s/.test(src[pos]!)) pos++;
            // Read arg name
            let argName = "";
            while (pos < src.length && /\w/.test(src[pos]!)) {
              argName += src[pos]!;
              pos++;
            }
            // Skip ':'
            while (pos < src.length && /[\s:]/.test(src[pos]!)) pos++;
            // Read value
            let value: QueryValue;
            if (src[pos] === '"') {
              pos++; // skip opening quote
              let strVal = "";
              while (pos < src.length && src[pos] !== '"') {
                strVal += src[pos]!;
                pos++;
              }
              pos++; // skip closing quote
              value = { __typename: "StringValue", value: strVal };
            } else if (src[pos] === "t" || src[pos] === "f") {
              const boolStr = src.slice(pos).match(/^(true|false)/);
              if (!boolStr) throw new Error(`Invalid boolean at position ${pos}`);
              value = { __typename: "BoolValue", value: boolStr[1] === "true" };
              pos += boolStr[1]!.length;
            } else {
              let numStr = "";
              while (pos < src.length && /[\d-]/.test(src[pos]!)) {
                numStr += src[pos]!;
                pos++;
              }
              value = { __typename: "IntValue", value: parseInt(numStr, 10) };
            }
            args.push({ name: argName, value });
            // Skip comma/whitespace
            while (pos < src.length && /[\s,]/.test(src[pos]!)) pos++;
          }
          pos++; // skip ')'
        }

        // Skip whitespace
        while (pos < src.length && /\s/.test(src[pos]!)) pos++;

        // Parse sub-selections if present
        let selections: FieldNode[] = [];
        if (pos < src.length && src[pos] === "{") {
          pos++; // skip '{'
          let depth = 1;
          let subBody = "";
          while (pos < src.length && depth > 0) {
            if (src[pos] === "{") depth++;
            if (src[pos] === "}") depth--;
            if (depth > 0) subBody += src[pos];
            pos++;
          }
          selections = parseFields(subBody);
        }

        fields.push({
          __typename: "FieldNode",
          name,
          args,
          selections,
        });
      }

      return fields;
    }

    const selections = parseFields(body);
    return { operationName, selections };
  }).mapErr((e) => (e instanceof Error ? e.message : String(e)));
}

// ============================================================================
// Schema Validator
// ============================================================================

/**
 * Format a QueryValue for display.
 * Uses switch + assertNever for exhaustive handling of __typename.
 */
function formatQueryValue(value: QueryValue): string {
  switch (value.__typename) {
    case "StringValue":
      return `"${value.value}"`;
    case "IntValue":
      return String(value.value);
    case "BoolValue":
      return String(value.value);
    default:
      return assertNever(value);
  }
}

/**
 * Validate a field against the schema.
 * Uses match() on __typename to handle different schema type definitions.
 */
function validateField(field: FieldNode, parentTypeName: string): Result<string[], string> {
  return lookupType(parentTypeName)
    .okOr(`Unknown type: ${parentTypeName}`)
    .andThen((typeDef) =>
      match(typeDef, "__typename", {
        ScalarTypeDef: () => Err(`Cannot select fields on scalar type "${parentTypeName}"`),
        EnumTypeDef: () => Err(`Cannot select fields on enum type "${parentTypeName}"`),
        ObjectTypeDef: (obj) => {
          const fieldDef = obj.fields.find((f) => f.name === field.name);
          if (!fieldDef) {
            return Err(`Field "${field.name}" not found on type "${parentTypeName}"`);
          }

          const messages: string[] = [`${parentTypeName}.${field.name}`];

          // Recurse into sub-selections
          if (field.selections.length > 0) {
            const subResults = field.selections.map((sub) => validateField(sub, fieldDef.typeName));
            const collected = Result.all(subResults);
            if (collected.isErr()) {
              return Err(collected.unwrapErr());
            }
            for (const subMsgs of collected.unwrap()) {
              messages.push(...subMsgs);
            }
          }

          return Ok(messages);
        },
      }),
    );
}

/**
 * Validate an entire query document against the schema.
 */
function validateQuery(doc: QueryDocument): Result<string[], string> {
  const results = doc.selections.map((field) => validateField(field, "Query"));
  return Result.all(results).map((arrays) => arrays.flat());
}

// ============================================================================
// TypeScript Type Generator
// ============================================================================

/** Map a GraphQL type name to a TypeScript type string. */
function mapGraphQLType(typeName: string, isList: boolean): string {
  const baseType = lookupType(typeName).match({
    some: (t) =>
      match(t, "__typename", {
        ScalarTypeDef: (s) => {
          switch (s.name) {
            case "ID":
              return "string";
            case "String":
              return "string";
            case "Int":
              return "number";
            case "Boolean":
              return "boolean";
            default:
              return "unknown";
          }
        },
        EnumTypeDef: (e) => e.name,
        ObjectTypeDef: (o) => o.name,
      }),
    none: () => "unknown",
  });
  return isList ? `readonly ${baseType}[]` : baseType;
}

/**
 * Generate TypeScript type definitions from schema types.
 * Uses match() on __typename + iter().filter().map().collect().
 */
function generateTypeScript(types: ReadonlyMap<string, DeepReadonly<SchemaTypeDef>>): string {
  return iter([...types.values()])
    .filter((t) => t.name !== "Query")
    .map((typeDef) =>
      match(typeDef, "__typename", {
        ScalarTypeDef: (t) => {
          const tsType = t.name === "Int" ? "number" : t.name === "Boolean" ? "boolean" : "string";
          return `type ${t.name} = ${tsType};`;
        },
        EnumTypeDef: (t) => `type ${t.name} = ${t.values.map((v) => `"${v}"`).join(" | ")};`,
        ObjectTypeDef: (t) => {
          const fields = t.fields
            .map((f) => `  readonly ${f.name}: ${mapGraphQLType(f.typeName, f.isList)};`)
            .join("\n");
          return `interface ${t.name} {\n${fields}\n}`;
        },
      }),
    )
    .collect()
    .join("\n\n");
}

// ============================================================================
// Schema Pretty-Printer
// ============================================================================

/**
 * Convert a schema type definition to a GraphQL SDL string.
 * Uses match() on __typename for exhaustive handling.
 */
function typeDefToString(typeDef: DeepReadonly<SchemaTypeDef>): string {
  return match(typeDef, "__typename", {
    ScalarTypeDef: (t) => `scalar ${t.name}`,
    EnumTypeDef: (t) => `enum ${t.name} = ${t.values.join(" | ")}`,
    ObjectTypeDef: (t) => {
      const fields = t.fields
        .map((f) => {
          const argStr =
            f.args.length > 0
              ? `(${f.args.map((a) => `${a.name}: ${a.typeName}${a.isNonNull ? "!" : ""}`).join(", ")})`
              : "";
          const typeStr = f.isList ? `[${f.typeName}!]!` : `${f.typeName}${f.isNonNull ? "!" : ""}`;
          return `${f.name}${argStr}: ${typeStr}`;
        })
        .join(", ");
      return `type ${t.name} { ${fields} }`;
    },
  });
}

// ============================================================================
// Query Executor
// ============================================================================

/**
 * Serialize an ExecutionValue to a plain JSON-compatible value.
 * Uses match() on __typename for exhaustive handling.
 */
function serializeValue(value: ExecutionValue): unknown {
  return match(value, "__typename", {
    ScalarResult: (v) => v.value,
    NullResult: () => null,
    ListResult: (v) => v.items.map(serializeValue),
    ObjectResult: (v) => {
      const obj: Record<string, unknown> = {};
      v.fields.forEach((val, key) => {
        obj[key] = serializeValue(val);
      });
      return obj;
    },
  });
}

/** Resolve a value from mock data into an ExecutionValue. */
function resolveValue(data: unknown, selections: readonly FieldNode[]): ExecutionValue {
  if (data === null || data === undefined) {
    return { __typename: "NullResult" };
  }
  if (Array.isArray(data)) {
    return {
      __typename: "ListResult",
      items: data.map((item) => resolveValue(item, selections)),
    };
  }
  if (typeof data === "object" && selections.length > 0) {
    const record = data as Record<string, unknown>;
    const fields = new Map<string, ExecutionValue>();
    for (const sel of selections) {
      const fieldData = record[sel.name];
      fields.set(sel.name, resolveValue(fieldData, sel.selections));
    }
    return { __typename: "ObjectResult", fields };
  }
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return { __typename: "ScalarResult", value: data };
  }
  return { __typename: "NullResult" };
}

/**
 * Execute a parsed query against mock data.
 * Uses tryAsync to wrap the async execution in a Result.
 */
async function executeQuery(
  doc: QueryDocument,
  mockData: Record<string, unknown>,
): Promise<Result<ExecutionValue, string>> {
  return tryAsync<ExecutionValue, string>(async () => {
    const fields = new Map<string, ExecutionValue>();
    for (const sel of doc.selections) {
      const data = mockData[sel.name];
      fields.set(sel.name, resolveValue(data, sel.selections));
    }
    return { __typename: "ObjectResult" as const, fields };
  });
}

// ============================================================================
// Mock Data
// ============================================================================

const mockData: Record<string, unknown> = {
  user: {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    posts: [
      { id: "101", title: "Hello World", status: "PUBLISHED" },
      { id: "102", title: "GraphQL Tips", status: "DRAFT" },
    ],
  },
  posts: [
    { id: "101", title: "Hello World", status: "PUBLISHED" },
    { id: "102", title: "GraphQL Tips", status: "DRAFT" },
  ],
};

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("=== GraphQL Schema Validator & Query Executor ===");

  // -- Schema Definition --
  console.log("\n--- Schema Definition ---");
  iter([...schema.types.values()]).forEach((typeDef) => {
    console.log(typeDefToString(typeDef));
  });

  // -- Parse Query --
  console.log("\n--- Parse Query ---");
  const queryString = `query GetUserData {
  user(id: "1") {
    id
    name
    email
    posts(limit: 5) {
      id
      title
      status
    }
  }
  posts(limit: 5) {
    id
    title
    status
  }
}`;

  const parseResult = parseQuery(queryString);
  if (parseResult.isErr()) {
    console.log(`Parse error: ${parseResult.unwrapErr()}`);
    return;
  }
  const doc = parseResult.unwrap();
  console.log(`Parsed query "${doc.operationName}" with ${doc.selections.length} root fields`);

  // -- Validate Query --
  console.log("\n--- Validate Query ---");
  const validationResult = validateQuery(doc);
  validationResult.match({
    ok: (messages) => {
      const seen = new Set<string>();
      for (const msg of messages) {
        if (!seen.has(msg)) {
          seen.add(msg);
          console.log(`  \u2713 ${msg}`);
        }
      }
    },
    err: (e) => console.log(`  Validation error: ${e}`),
  });

  // -- Generate TypeScript --
  console.log("\n--- Generate TypeScript ---");
  const tsCode = generateTypeScript(schema.types);
  console.log(tsCode);

  // -- Execute Query --
  console.log("\n--- Execute Query ---");
  const execResult = await executeQuery(doc, mockData);
  execResult.match({
    ok: (value) => {
      const serialized = serializeValue(value);
      console.log(JSON.stringify(serialized, null, 2));
    },
    err: (e) => console.log(`Execution error: ${e}`),
  });

  // -- Branded Scalar Validation --
  console.log("\n--- Branded Scalar Validation ---");
  const id1 = GraphQLID.parse("abc123");
  console.log(
    `GraphQLID("abc123"): ${id1.match({ ok: (v) => `Ok(${v})`, err: (e) => `Err(${e})` })}`,
  );
  const id2 = GraphQLID.parse("");
  console.log(`GraphQLID(""): ${id2.match({ ok: (v) => `Ok(${v})`, err: (e) => `Err(${e})` })}`);
  const n1 = NonNegativeInt.parse(42);
  console.log(
    `NonNegativeInt(42): ${n1.match({ ok: (v) => `Ok(${v})`, err: (e) => `Err(${e})` })}`,
  );
  const n2 = NonNegativeInt.parse(-1);
  console.log(
    `NonNegativeInt(-1): ${n2.match({ ok: (v) => `Ok(${v})`, err: (e) => `Err(${e})` })}`,
  );

  // -- Error Handling --
  console.log("\n--- Error Handling ---");
  const badQuery = "query BadQuery";
  const badResult = parseQuery(badQuery);
  badResult.match({
    ok: () => console.log("(unexpected success)"),
    err: (e) => console.log(`Invalid query error: ${e}`),
  });

  // Demonstrate formatQueryValue uses assertNever for exhaustiveness
  formatQueryValue({ __typename: "StringValue", value: "hello" });
  formatQueryValue({ __typename: "IntValue", value: 42 });
  formatQueryValue({ __typename: "BoolValue", value: true });

  // Demonstrate that unused branded types are exercised
  NonEmptyString.parse("hello");
  GraphQLInt.parse(42);
}

main().catch(console.error);
