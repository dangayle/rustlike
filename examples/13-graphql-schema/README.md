# GraphQL Schema Validator

GraphQL schema validator exercising `match()`, `assertNever()`, `tryAsync()`, `safeCall()`, and `DeepReadonly<T>`.

## Run

```bash
pnpm install
pnpm graphql           # Runs index.ts (rust-like)
pnpm tsx idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- **Generic `match()`**: Pattern matching on `__typename` discriminant (GraphQL convention) — requires `match(v, '__typename', {...})` since `matchKind`/`matchType` only work with `kind`/`type`
- **`assertNever()`**: Exhaustive switch guard ensuring all `__typename` variants are handled
- **`tryAsync()`**: Wraps async query execution into `Promise<Result<T, E>>`
- **`safeCall()`**: Wraps `Map.get()` to return `Option<T>` instead of `T | undefined`
- **`DeepReadonly<T>`**: Immutable schema definition preventing accidental mutation
- **`Brand<T,B>` + `newtype()`**: Validated GraphQL scalar types (GraphQLID, NonEmptyString, GraphQLInt, NonNegativeInt)
- **`tryCatch()`**: Wraps synchronous query parsing
- **`Result` chains**: `map`, `andThen`, `okOr` for error propagation
- **`Result.all()`**: Collecting validation results for multiple fields
- **`Option.from()`**: Wrapping nullable lookups
- **`iter().map().collect()`**: Lazy transformation of schema types

## Architecture

The example has four layers:

1. **Schema** - Type definitions using discriminated unions with `__typename` (Scalar, Enum, Object types)
2. **Parser** - Simplified recursive descent parser producing a query AST, wrapped in `tryCatch()`
3. **Validator** - Schema-aware query validation using `match()` for type dispatch and `Result.all()` for error collection
4. **Executor** - Mock query execution using `tryAsync()` with `match()` for result serialization

## Key Differences

### Rust-like (`index.ts`)

```typescript
// Generic match() on __typename (not matchKind/matchType)
const result = match(typeDef, "__typename", {
  ScalarTypeDef: (t) => `scalar ${t.name}`,
  EnumTypeDef: (t) => `enum ${t.name} = ${t.values.join(" | ")}`,
  ObjectTypeDef: (t) => `type ${t.name} { ... }`,
});

// safeCall wraps Map.get to return Option
const lookupType = safeCall((name: string) => schema.types.get(name));
lookupType("User"); // Option<SchemaTypeDef>

// tryAsync wraps async execution
const result = await tryAsync(() => executeFields(doc.selections));
```

### Idiomatic TypeScript (`idiomatic.ts`)

```typescript
// switch/case with manual exhaustiveness
switch (typeDef.__typename) {
  case 'ScalarTypeDef': return `scalar ${typeDef.name}`;
  case 'EnumTypeDef': return `enum ...`;
  case 'ObjectTypeDef': return `type ...`;
  default: throw new Error(`Unexpected type`);
}

// Direct Map.get with null checks
const typeDef = schema.types.get("User");
if (!typeDef) throw new Error("Unknown type");

// try/catch for async
try { await executeFields(doc.selections); } catch (e) { ... }
```

## Parse, Don't Validate

The branded scalar types in `index.ts` demonstrate the **"parse, don't validate"** pattern. Instead of checking data and continuing to use the original type, you _parse_ it into a new type that makes the invalid state unrepresentable:

```typescript
// Rustlike: parse returns a branded type — proof that validation happened
type GraphQLID = Brand<string, 'GraphQLID'>;
const GraphQLID = newtype<string, 'GraphQLID'>(...);
const id = GraphQLID.parse(input); // Result<Brand<string, 'GraphQLID'>, string>
```

```typescript
// Idiomatic: validate returns a plain string — you're back where you started
function validateGraphQLID(s: string): { ok: true; value: string } | ...
```

In the rustlike version, once you unwrap the `Result`, you have a `GraphQLID` that is **not assignable to `string`** and vice versa. A function that accepts `GraphQLID` can never receive an unvalidated string. The type boundary _is_ the proof of validation.

In the idiomatic version, the validated `value` comes back as plain `string`. Nothing in the type system prevents passing an unvalidated string wherever a "validated" one is expected. The knowledge that validation happened lives in your head, not in the types.

### Branded types are zero-friction at usage time

Because `Brand<T, B>` is defined as `T & { readonly __brand: B }`, a branded `string` is still structurally a `string`. It flows into `string`-accepting functions automatically — `console.log(id)`, `id.toUpperCase()`, template literals all work without casts. The brand is one-directional: `GraphQLID` narrows into `string`, but plain `string` can't widen into `GraphQLID` without going through `parse()` or `unsafe()`. All the safety at the entrance, zero cost at the exit.

## The Verbosity Tradeoff

The rustlike version is significantly more verbose — more type definitions, more wrapper types, more explicit error handling. The idiomatic TypeScript version achieves the same output with far fewer types by trusting the runtime and moving fast.

The tradeoff depends on context:

- **Small script, single author, short-lived** — the idiomatic approach wins. The extra types are ceremony with no payoff.
- **Shared codebase, long-lived, domain logic** — the types start paying for themselves. A new contributor can't accidentally pass a raw string where a `GraphQLID` is expected, can't forget to handle an error case, can't mutate the schema.

This is the same tradeoff Rust itself makes versus dynamically typed languages. The verbosity isn't accidental — it's encoding invariants that would otherwise live in documentation or in someone's head. Not every TypeScript project needs this level of safety, but for projects where correctness matters, the extra keystrokes pay for themselves.

## Demo Schema

```graphql
type Query {
  user(id: ID!): User
  posts(limit: Int): [Post!]!
}
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}
type Post {
  id: ID!
  title: String!
  body: String!
  author: User!
  status: PostStatus!
}
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}
```

## Output

Both implementations produce identical output including schema printing, query parsing, validation, TypeScript generation, query execution, branded scalar validation, and error handling.
