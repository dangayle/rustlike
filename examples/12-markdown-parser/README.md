# Markdown Parser

CommonMark-subset Markdown-to-HTML parser exercising 19+ rustlike APIs.

## Run

```bash
pnpm install
pnpm markdown           # Runs index.ts (rust-like)
pnpm tsx idiomatic.ts   # Runs idiomatic version
```

## What it demonstrates

- **Peekable iterators**: `iter([...text]).peekable()` for character lookahead during inline parsing
- **Async peekable**: `asyncIterLines()` + `AsyncIter.peekable()` for streaming file-based parsing
- **Discriminated unions**: Recursive AST with `kind` discriminant for block and inline nodes
- **Exhaustive matching**: `matchKind` over 7 block variants and 7 inline variants for HTML rendering
- **Result chains**: `map`, `andThen`, `mapErr` for error propagation through parsing phases
- **Option chaining**: `Option.orElse()` for lazy block detection (heading, code block, blockquote, list, etc.)
- **collectResult**: Collecting parsed inline nodes with short-circuit on first error
- **Iterator combinators**: `fold`, `filter`, `enumerate`, `forEach` for AST statistics

## Architecture

The parser has three layers:

1. **AST** - Discriminated unions for block nodes (Heading, Paragraph, CodeBlock, Blockquote, ThematicBreak, UnorderedList, OrderedList) and inline nodes (Text, InlineCode, Emphasis, Strong, StrongEmphasis, Link, HardBreak)
2. **Parser** - Two-phase: block scanner using peekable line iteration, then inline parser using peekable character iteration
3. **Renderer** - Two exhaustive `matchKind` calls that convert AST nodes to HTML

## Key Differences

### Rust-like (`index.ts`)

```typescript
// Block detection with Option.orElse() chaining
const block = tryThematicBreak(trimmed)
  .orElse(() => tryHeading(trimmed))
  .orElse(() => tryFencedCode(trimmed, lines, lineNum))
  .orElse(() => tryBlockquote(trimmed, lines, lineNum))
  .orElse(() => tryUnorderedList(trimmed, lines, lineNum))
  .orElse(() => tryOrderedList(trimmed, lines, lineNum));

// Exhaustive rendering with matchKind
const html = matchKind(node, {
  Heading: (n) => `<h${n.level}>${renderInlines(n.children)}</h${n.level}>`,
  Paragraph: (n) => `<p>${renderInlines(n.children)}</p>`,
  CodeBlock: (n) => `<pre><code class="language-${n.language}">${escapeHtml(n.code)}</code></pre>`,
  // ... all variants handled
});

// Async file parsing with AsyncIter.peekable()
const result = await asyncIterLines(filepath);
result.andThen(async (lines) => {
  const peekable = lines.peekable();
  // peek() returns Promise<Option<string>>
});
```

### Idiomatic TypeScript (`idiomatic.ts`)

```typescript
// Block detection with if/else chain
let block = tryThematicBreak(trimmed);
if (!block) block = tryHeading(trimmed);
if (!block) block = tryFencedCode(trimmed, lines, lineIdx);
// ...

// Rendering with switch/case
switch (node.type) {
  case "Heading":
    return `<h${(node as HeadingNode).level}>...`;
  case "Paragraph":
    return `<p>...</p>`;
  // ...
}

// Async file parsing with readline + array index
const rl = readline.createInterface({ input: fs.createReadStream(filepath) });
for await (const line of rl) {
  lines.push(line);
}
```

## Supported Markdown Features

| Feature            | Syntax                              |
| ------------------ | ----------------------------------- |
| ATX Headings       | `# H1` through `###### H6`          |
| Paragraphs         | Plain text separated by blank lines |
| Fenced Code Blocks | ` ```language ... ``` `             |
| Blockquotes        | `> text`                            |
| Thematic Breaks    | `---`, `***`, `___`                 |
| Unordered Lists    | `- item`                            |
| Ordered Lists      | `1. item`                           |
| Emphasis           | `*italic*`                          |
| Strong             | `**bold**`                          |
| Strong Emphasis    | `***bold-italic***`                 |
| Inline Code        | `` `code` ``                        |
| Links              | `[text](url)`                       |
| Hard Line Breaks   | `\` at end of line                  |

## Output

Both implementations produce identical HTML from the same input, including a sync parse of an embedded string and an async parse of `sample.md`.
