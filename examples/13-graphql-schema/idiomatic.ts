/**
 * GraphQL Schema Validator & Query Executor - Idiomatic TypeScript Implementation
 *
 * Standard TypeScript approach:
 * - switch/case for discriminated unions with manual casts
 * - try/catch for error handling
 * - null/undefined for missing values
 * - Plain string/number types (no branded types)
 * - Mutable data structures
 * - Array methods for data transformation
 *
 * Contrast with index.ts which uses:
 * - match() for exhaustive pattern matching on __typename
 * - assertNever() for exhaustive switch guards
 * - tryAsync() for async error wrapping
 * - safeCall() for nullable-to-Option conversion
 * - DeepReadonly<T> for immutable schema
 * - Brand<T,B> + newtype() for validated scalar types
 * - tryCatch() for sync error wrapping
 * - Result/Option for explicit error handling
 * - iter() for lazy transformations
 */

// ============================================================================
// Types — Discriminated unions with __typename
// ============================================================================

type ScalarTypeDef = { __typename: "ScalarTypeDef"; name: string };
type EnumTypeDef = { __typename: "EnumTypeDef"; name: string; values: string[] };
type ObjectTypeDef = { __typename: "ObjectTypeDef"; name: string; fields: FieldDef[] };

type TypeDef = ScalarTypeDef | EnumTypeDef | ObjectTypeDef;

type FieldDef = {
  name: string;
  type: string;
  nonNull: boolean;
  isList: boolean;
  args: ArgDef[];
};

type ArgDef = {
  name: string;
  type: string;
  nonNull: boolean;
};

type SelectionField = {
  name: string;
  args: Record<string, string>;
  selections: SelectionField[];
};

type ParsedQuery = {
  name: string;
  selections: SelectionField[];
};

// ============================================================================
// Branded type validators — plain functions returning result objects
// ============================================================================

function validateGraphQLID(s: string): { ok: true; value: string } | { ok: false; error: string } {
  if (s.length > 0) return { ok: true, value: s };
  return { ok: false, error: `Invalid ID: "${s}" (must be non-empty)` };
}

// validateNonEmptyString and validateGraphQLInt omitted — not demonstrated in main,
// but would follow the same pattern as validateGraphQLID and validateNonNegativeInt.

function validateNonNegativeInt(
  n: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (Number.isInteger(n) && n >= 0) return { ok: true, value: n };
  return { ok: false, error: `Expected non-negative integer, got ${n}` };
}

// ============================================================================
// Schema Definition — mutable Map
// ============================================================================

const schema = new Map<string, TypeDef>();

schema.set("ID", { __typename: "ScalarTypeDef", name: "ID" });
schema.set("String", { __typename: "ScalarTypeDef", name: "String" });
schema.set("Int", { __typename: "ScalarTypeDef", name: "Int" });
schema.set("Boolean", { __typename: "ScalarTypeDef", name: "Boolean" });

schema.set("PostStatus", {
  __typename: "EnumTypeDef",
  name: "PostStatus",
  values: ["DRAFT", "PUBLISHED", "ARCHIVED"],
});

schema.set("User", {
  __typename: "ObjectTypeDef",
  name: "User",
  fields: [
    { name: "id", type: "ID", nonNull: true, isList: false, args: [] },
    { name: "name", type: "String", nonNull: true, isList: false, args: [] },
    { name: "email", type: "String", nonNull: true, isList: false, args: [] },
    { name: "posts", type: "Post", nonNull: true, isList: true, args: [] },
  ],
});

schema.set("Post", {
  __typename: "ObjectTypeDef",
  name: "Post",
  fields: [
    { name: "id", type: "ID", nonNull: true, isList: false, args: [] },
    { name: "title", type: "String", nonNull: true, isList: false, args: [] },
    { name: "body", type: "String", nonNull: true, isList: false, args: [] },
    { name: "author", type: "User", nonNull: true, isList: false, args: [] },
    { name: "status", type: "PostStatus", nonNull: true, isList: false, args: [] },
  ],
});

schema.set("Query", {
  __typename: "ObjectTypeDef",
  name: "Query",
  fields: [
    {
      name: "user",
      type: "User",
      nonNull: false,
      isList: false,
      args: [{ name: "id", type: "ID", nonNull: true }],
    },
    {
      name: "posts",
      type: "Post",
      nonNull: true,
      isList: true,
      args: [{ name: "limit", type: "Int", nonNull: false }],
    },
  ],
});

// ============================================================================
// Type Lookup — null checks instead of Option
// ============================================================================

function lookupType(name: string): TypeDef | null {
  return schema.get(name) ?? null;
}

// ============================================================================
// Schema Printer
// ============================================================================

function printTypeDef(typeDef: TypeDef): string {
  switch (typeDef.__typename) {
    case "ScalarTypeDef":
      return `scalar ${typeDef.name}`;
    case "EnumTypeDef":
      return `enum ${typeDef.name} = ${typeDef.values.join(" | ")}`;
    case "ObjectTypeDef": {
      const fields = typeDef.fields
        .map((f) => {
          const typeStr = f.isList ? `[${f.type}!]` : f.type;
          const argsStr =
            f.args.length > 0
              ? `(${f.args.map((a) => `${a.name}: ${a.type}${a.nonNull ? "!" : ""}`).join(", ")})`
              : "";
          return `${f.name}${argsStr}: ${typeStr}${f.nonNull ? "!" : ""}`;
        })
        .join(", ");
      return `type ${typeDef.name} { ${fields} }`;
    }
    default:
      throw new Error(`Unexpected type: ${(typeDef as TypeDef).__typename}`);
  }
}

// ============================================================================
// Query Parser — try/catch instead of tryCatch()
// ============================================================================

function parseSelections(body: string): SelectionField[] {
  const fields: SelectionField[] = [];
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === "}") {
      i++;
      continue;
    }

    const fieldMatch = line.match(/^(\w+)(?:\(([^)]*)\))?\s*(\{)?$/);
    if (!fieldMatch) {
      i++;
      continue;
    }

    const name = fieldMatch[1];
    const argsStr = fieldMatch[2] || "";
    const hasBlock = !!fieldMatch[3];

    const args: Record<string, string> = {};
    if (argsStr) {
      const argParts = argsStr.split(",").map((a) => a.trim());
      for (const part of argParts) {
        const [key, val] = part.split(":").map((s) => s.trim());
        if (key && val) args[key] = val.replace(/"/g, "");
      }
    }

    let selections: SelectionField[] = [];
    if (hasBlock) {
      const subLines: string[] = [];
      let depth = 1;
      i++;
      while (i < lines.length && depth > 0) {
        if (lines[i].includes("{")) depth++;
        if (lines[i] === "}") depth--;
        if (depth > 0) subLines.push(lines[i]);
        i++;
      }
      selections = parseSelections(subLines.join("\n"));
    } else {
      i++;
    }

    fields.push({ name, args, selections });
  }

  return fields;
}

function parseQuery(queryStr: string): ParsedQuery {
  const trimmed = queryStr.trim();
  const headerMatch = trimmed.match(/^query\s+(\w+)\s*\{/);
  if (!headerMatch) throw new Error("Expected '{' after query name");

  const name = headerMatch[1];
  const bodyStart = trimmed.indexOf("{") + 1;
  const bodyEnd = trimmed.lastIndexOf("}");
  const body = trimmed.slice(bodyStart, bodyEnd);

  return { name, selections: parseSelections(body) };
}

// ============================================================================
// Validator — switch/case + error array instead of Result.all
// ============================================================================

function validateSelections(
  parentType: string,
  selections: SelectionField[],
  errors: string[],
  visited: Set<string>,
): void {
  const typeDef = lookupType(parentType);
  if (!typeDef) {
    errors.push(`Unknown type: ${parentType}`);
    return;
  }
  if (typeDef.__typename !== "ObjectTypeDef") {
    errors.push(`Cannot select fields on non-object type: ${parentType}`);
    return;
  }

  for (const sel of selections) {
    const field = typeDef.fields.find((f) => f.name === sel.name);
    if (!field) {
      errors.push(`Field "${sel.name}" not found on type "${parentType}"`);
      continue;
    }
    const key = `${parentType}.${sel.name}`;
    if (!visited.has(key)) {
      visited.add(key);
      console.log(`  \u2713 ${key}`);
    }
    if (sel.selections.length > 0) {
      validateSelections(field.type, sel.selections, errors, visited);
    }
  }
}

function validateQuery(query: ParsedQuery): string[] {
  const errors: string[] = [];
  const visited = new Set<string>();
  validateSelections("Query", query.selections, errors, visited);
  return errors;
}

// ============================================================================
// TypeScript Generator — Array methods instead of iter()
// ============================================================================

function scalarToTS(name: string): string {
  switch (name) {
    case "ID":
      return "string";
    case "String":
      return "string";
    case "Int":
      return "number";
    case "Boolean":
      return "boolean";
    default:
      return name;
  }
}

function generateTypeScript(): string {
  const entries = Array.from(schema.values()).filter(
    (t) => t.__typename !== "ObjectTypeDef" || t.name !== "Query",
  );
  const parts: string[] = [];

  for (const typeDef of entries) {
    switch (typeDef.__typename) {
      case "ScalarTypeDef":
        parts.push(`type ${typeDef.name} = ${scalarToTS(typeDef.name)};`);
        break;
      case "EnumTypeDef": {
        const values = typeDef.values.map((v) => `"${v}"`).join(" | ");
        parts.push(`type ${typeDef.name} = ${values};`);
        break;
      }
      case "ObjectTypeDef": {
        const fields = typeDef.fields.map((f) => {
          const tsType = scalarToTS(f.type);
          const fieldType = f.isList ? `readonly ${tsType}[]` : tsType;
          return `  readonly ${f.name}: ${fieldType};`;
        });
        parts.push(`interface ${typeDef.name} {\n${fields.join("\n")}\n}`);
        break;
      }
      default:
        throw new Error(`Unexpected type: ${(typeDef as TypeDef).__typename}`);
    }
  }

  return parts.join("\n\n");
}

// ============================================================================
// Mock Data
// ============================================================================

const mockUsers: Record<string, Record<string, unknown>> = {
  "1": {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    posts: ["101", "102"],
  },
};

const mockPosts: Record<string, Record<string, unknown>> = {
  "101": { id: "101", title: "Hello World", body: "First post", author: "1", status: "PUBLISHED" },
  "102": { id: "102", title: "GraphQL Tips", body: "Second post", author: "1", status: "DRAFT" },
};

// ============================================================================
// Executor — try/catch instead of tryAsync()
// ============================================================================

function resolveField(
  parentType: string,
  parentData: Record<string, unknown>,
  selection: SelectionField,
): unknown {
  const value = parentData[selection.name];

  if (selection.selections.length === 0) return value;

  if (Array.isArray(value)) {
    return value.map((itemId) => {
      const itemData = resolveEntity(parentType, selection.name, String(itemId));
      if (!itemData) return null;
      const result: Record<string, unknown> = {};
      for (const sub of selection.selections) {
        result[sub.name] = resolveField(getFieldType(parentType, selection.name), itemData, sub);
      }
      return result;
    });
  }

  if (typeof value === "string") {
    const entity = resolveEntity(parentType, selection.name, value);
    if (!entity) return null;
    const result: Record<string, unknown> = {};
    for (const sub of selection.selections) {
      result[sub.name] = resolveField(getFieldType(parentType, selection.name), entity, sub);
    }
    return result;
  }

  return value;
}

function resolveEntity(
  parentType: string,
  fieldName: string,
  id: string,
): Record<string, unknown> | null {
  const fieldType = getFieldType(parentType, fieldName);
  if (fieldType === "User") return mockUsers[id] ?? null;
  if (fieldType === "Post") return mockPosts[id] ?? null;
  return null;
}

function getFieldType(parentType: string, fieldName: string): string {
  const typeDef = lookupType(parentType);
  if (!typeDef || typeDef.__typename !== "ObjectTypeDef") return "";
  const field = typeDef.fields.find((f) => f.name === fieldName);
  return field?.type ?? "";
}

async function executeQuery(query: ParsedQuery): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  for (const sel of query.selections) {
    switch (sel.name) {
      case "user": {
        const userId = sel.args["id"] ?? "1";
        const userData = mockUsers[userId];
        if (!userData) {
          result[sel.name] = null;
          break;
        }
        const userResult: Record<string, unknown> = {};
        for (const sub of sel.selections) {
          userResult[sub.name] = resolveField("User", userData, sub);
        }
        result[sel.name] = userResult;
        break;
      }
      case "posts": {
        const limit = sel.args["limit"] ? parseInt(sel.args["limit"], 10) : undefined;
        let postIds = Object.keys(mockPosts);
        if (limit !== undefined) postIds = postIds.slice(0, limit);
        result[sel.name] = postIds.map((id) => {
          const postData = mockPosts[id]!;
          const postResult: Record<string, unknown> = {};
          for (const sub of sel.selections) {
            postResult[sub.name] = resolveField("Post", postData, sub);
          }
          return postResult;
        });
        break;
      }
      default:
        throw new Error(`Unknown root field: ${sel.name}`);
    }
  }

  return result;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("=== GraphQL Schema Validator & Query Executor ===");
  console.log("");

  // --- Schema Definition ---
  console.log("--- Schema Definition ---");
  for (const typeDef of schema.values()) {
    console.log(printTypeDef(typeDef));
  }
  console.log("");

  // --- Parse Query ---
  console.log("--- Parse Query ---");
  const queryStr = `query GetUserData {
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
  posts {
    id
    title
    status
  }
}`;

  let parsedQuery: ParsedQuery;
  try {
    parsedQuery = parseQuery(queryStr);
    console.log(
      `Parsed query "${parsedQuery.name}" with ${parsedQuery.selections.length} root fields`,
    );
  } catch (e) {
    console.error(`Parse error: ${(e as Error).message}`);
    return;
  }
  console.log("");

  // --- Validate Query ---
  console.log("--- Validate Query ---");
  const errors = validateQuery(parsedQuery);
  if (errors.length > 0) {
    for (const err of errors) console.error(`  Error: ${err}`);
    return;
  }
  console.log("");

  // --- Generate TypeScript ---
  console.log("--- Generate TypeScript ---");
  console.log(generateTypeScript());
  console.log("");

  // --- Execute Query ---
  console.log("--- Execute Query ---");
  try {
    const data = await executeQuery(parsedQuery);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Execution error: ${(e as Error).message}`);
  }
  console.log("");

  // --- Branded Scalar Validation ---
  console.log("--- Branded Scalar Validation ---");
  const idResult1 = validateGraphQLID("abc123");
  console.log(
    `GraphQLID("abc123"): ${idResult1.ok ? `Ok(${idResult1.value})` : `Err(${idResult1.error})`}`,
  );

  const idResult2 = validateGraphQLID("");
  console.log(
    `GraphQLID(""): ${idResult2.ok ? `Ok(${idResult2.value})` : `Err(${idResult2.error})`}`,
  );

  const intResult1 = validateNonNegativeInt(42);
  console.log(
    `NonNegativeInt(42): ${intResult1.ok ? `Ok(${intResult1.value})` : `Err(${intResult1.error})`}`,
  );

  const intResult2 = validateNonNegativeInt(-1);
  console.log(
    `NonNegativeInt(-1): ${intResult2.ok ? `Ok(${intResult2.value})` : `Err(${intResult2.error})`}`,
  );
  console.log("");

  // --- Error Handling ---
  console.log("--- Error Handling ---");
  try {
    parseQuery("query BadQuery invalid");
  } catch (e) {
    console.log(`Invalid query error: ${(e as Error).message}`);
  }
}

main().catch(console.error);
