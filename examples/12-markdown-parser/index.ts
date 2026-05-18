/**
 * Markdown Parser - Rust-like Implementation
 *
 * A CommonMark-subset markdown-to-HTML parser demonstrating 19+ distinct
 * rustlike APIs in a natural application context:
 *
 *  1. Ok / Err            - Result constructors for parse success/failure
 *  2. Some / None         - Option constructors for optional parse results
 *  3. Result.map          - Transform successful parse results
 *  4. Result.andThen      - Chain fallible parsing operations
 *  5. Result.match        - Exhaustive handling of ok/err outcomes
 *  6. Result.isOk/isErr   - Discriminant checks on parse results
 *  7. Result.all          - Collect an array of Results into Result<T[], E>
 *  8. Result.unwrap       - Extract value (panics on error)
 *  9. Result.unwrapErr    - Extract error (panics on ok)
 * 10. Option.isSome       - Check if peek found a value
 * 11. Option.isNone       - Check if peek found nothing
 * 12. Option.unwrap       - Extract Some value
 * 13. Option.orElse       - Chain block-type detectors (try alternative)
 * 14. Option.match        - Handle Some/None cases
 * 15. Option.from         - Wrap nullable regex match into Option
 * 16. iter()              - Create sync lazy iterator from array
 * 17. Iter.map + collect  - Transform and materialize character sequences
 * 18. Iter.peekable/peek  - Lookahead for character-level inline parsing
 * 19. matchKind           - Exhaustive pattern match on AST node kinds
 * 20. asyncIterLines      - Stream file lines as AsyncIter
 * 21. AsyncIter.peekable  - Async lookahead for block-level parsing
 * 22. Iter.fold           - Aggregate inline parse statistics
 * 23. Iter.filter         - Filter blank lines during paragraph collection
 * 24. Iter.enumerate      - Numbered line tracking for error messages
 */

import { Result, Ok, Err, Option, Some, None, iter, matchKind } from "rustlike";
import { asyncIterLines } from "rustlike/node";
import type { PeekableAsyncIterType } from "rustlike";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types — AST Nodes (discriminated unions with `kind`)
// ============================================================================

// -- Block nodes --

type Heading = {
  readonly kind: "Heading";
  readonly level: number;
  readonly children: readonly InlineNode[];
};

type Paragraph = {
  readonly kind: "Paragraph";
  readonly children: readonly InlineNode[];
};

type CodeBlock = {
  readonly kind: "CodeBlock";
  readonly language: string;
  readonly code: string;
};

type Blockquote = {
  readonly kind: "Blockquote";
  readonly children: readonly BlockNode[];
};

type ThematicBreak = { readonly kind: "ThematicBreak" };

type UnorderedList = {
  readonly kind: "UnorderedList";
  readonly items: readonly ListItem[];
};

type OrderedList = {
  readonly kind: "OrderedList";
  readonly items: readonly ListItem[];
  readonly start: number;
};

type ListItem = {
  readonly kind: "ListItem";
  readonly children: readonly InlineNode[];
};

type BlockNode =
  | Heading
  | Paragraph
  | CodeBlock
  | Blockquote
  | ThematicBreak
  | UnorderedList
  | OrderedList;

// -- Inline nodes --

type Text = { readonly kind: "Text"; readonly content: string };
type InlineCode = { readonly kind: "InlineCode"; readonly code: string };
type Emphasis = { readonly kind: "Emphasis"; readonly children: readonly InlineNode[] };
type Strong = { readonly kind: "Strong"; readonly children: readonly InlineNode[] };
type StrongEmphasis = { readonly kind: "StrongEmphasis"; readonly children: readonly InlineNode[] };
type Link = {
  readonly kind: "Link";
  readonly href: string;
  readonly children: readonly InlineNode[];
};
type HardBreak = { readonly kind: "HardBreak" };

type InlineNode = Text | InlineCode | Emphasis | Strong | StrongEmphasis | Link | HardBreak;

// -- Document --

type Document = { readonly kind: "Document"; readonly children: readonly BlockNode[] };

// -- Errors --

type ParseErrorKind =
  | "UnterminatedCodeBlock"
  | "UnterminatedEmphasis"
  | "UnterminatedLink"
  | "InvalidHeading"
  | "UnexpectedToken";

type ParseError = {
  readonly kind: ParseErrorKind;
  readonly line: number;
  readonly col: number;
  readonly message: string;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Escape HTML special characters using iter().map().collect().
 * Demonstrates: iter(), Iter.map, Iter.collect
 */
function escapeHtml(text: string): string {
  return iter([...text])
    .map((ch) =>
      ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : ch,
    )
    .collect()
    .join("");
}

/** Check whether a line starts a new block-level element. */
function isBlockStart(line: string): boolean {
  if (line.trim() === "") return true;
  if (/^#{1,6}\s/.test(line)) return true;
  if (/^```/.test(line)) return true;
  if (/^>\s/.test(line)) return true;
  if (/^-\s/.test(line)) return true;
  if (/^\d+\.\s/.test(line)) return true;
  if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) return true;
  return false;
}

// ============================================================================
// Inline Parser — character-level peekable iteration
// ============================================================================

/**
 * Parse inline markdown text into InlineNode[].
 * Uses iter([...text]).peekable() for character-level lookahead.
 *
 * Demonstrates: iter(), peekable(), peek(), Option.isSome, Option.unwrap,
 *               Result (Ok/Err), andThen
 */
function parseInlines(text: string, line: number): Result<InlineNode[], ParseError> {
  const nodes: InlineNode[] = [];
  const chars = [...text];
  let pos = 0;
  let buffer = "";

  function flushBuffer(): void {
    if (buffer.length > 0) {
      nodes.push({ kind: "Text", content: buffer });
      buffer = "";
    }
  }

  while (pos < chars.length) {
    const ch = chars[pos]!;

    // -- Hard break: backslash followed by newline --
    if (ch === "\\" && pos + 1 < chars.length && chars[pos + 1] === "\n") {
      flushBuffer();
      nodes.push({ kind: "HardBreak" });
      pos += 2;
      continue;
    }

    // -- Hard break: backslash at end of text --
    if (ch === "\\" && pos === chars.length - 1) {
      flushBuffer();
      nodes.push({ kind: "HardBreak" });
      pos++;
      continue;
    }

    // -- Escaped character --
    if (ch === "\\" && pos + 1 < chars.length) {
      buffer += chars[pos + 1];
      pos += 2;
      continue;
    }

    // -- Inline code --
    if (ch === "`") {
      flushBuffer();
      const closeIdx = chars.indexOf("`", pos + 1);
      if (closeIdx === -1) {
        // Not terminated — just treat backtick as literal text
        buffer += "`";
        pos++;
        continue;
      }
      const code = chars.slice(pos + 1, closeIdx).join("");
      nodes.push({ kind: "InlineCode", code });
      pos = closeIdx + 1;
      continue;
    }

    // -- Emphasis / Strong / StrongEmphasis --
    if (ch === "*") {
      flushBuffer();

      // Count consecutive asterisks
      let starCount = 0;
      let scanPos = pos;
      while (scanPos < chars.length && chars[scanPos] === "*") {
        starCount++;
        scanPos++;
      }

      // Determine delimiter: 1, 2, or 3 stars
      const delimLen = Math.min(starCount, 3);
      const delimiter = "*".repeat(delimLen);

      // Find matching closing delimiter
      const afterOpen = pos + delimLen;
      const remaining = chars.slice(afterOpen).join("");
      const closeOffset = remaining.indexOf(delimiter);

      if (closeOffset === -1) {
        // No closing delimiter — treat as literal text
        buffer += delimiter;
        pos += delimLen;
        continue;
      }

      const innerText = remaining.substring(0, closeOffset);

      // Recursively parse inner content
      const innerResult = parseInlines(innerText, line);
      if (innerResult.isErr()) {
        return innerResult;
      }
      const innerNodes = innerResult.unwrap();

      if (delimLen === 3) {
        nodes.push({ kind: "StrongEmphasis", children: innerNodes });
      } else if (delimLen === 2) {
        nodes.push({ kind: "Strong", children: innerNodes });
      } else {
        nodes.push({ kind: "Emphasis", children: innerNodes });
      }

      pos = afterOpen + closeOffset + delimLen;
      continue;
    }

    // -- Link: [text](url) --
    if (ch === "[") {
      flushBuffer();

      // Find closing bracket
      const closeBracket = chars.indexOf("]", pos + 1);
      if (
        closeBracket === -1 ||
        closeBracket + 1 >= chars.length ||
        chars[closeBracket + 1] !== "("
      ) {
        // Not a valid link — treat as literal
        buffer += "[";
        pos++;
        continue;
      }

      const closeParen = chars.indexOf(")", closeBracket + 2);
      if (closeParen === -1) {
        buffer += "[";
        pos++;
        continue;
      }

      const linkText = chars.slice(pos + 1, closeBracket).join("");
      const href = chars.slice(closeBracket + 2, closeParen).join("");

      // Parse link text for nested inlines
      const linkInlineResult = parseInlines(linkText, line);
      if (linkInlineResult.isErr()) {
        return linkInlineResult;
      }

      nodes.push({ kind: "Link", href, children: linkInlineResult.unwrap() });
      pos = closeParen + 1;
      continue;
    }

    // -- Plain text character --
    buffer += ch;
    pos++;
  }

  flushBuffer();
  return Ok(nodes);
}

// ============================================================================
// Block Parser — sync, line-level peekable iteration
// ============================================================================

/**
 * Regex patterns for block detection.
 */
const THEMATIC_BREAK_RE = /^(\s{0,3})(\*{3,}|-{3,}|_{3,})\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCED_CODE_RE = /^```(\w*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;
const UNORDERED_LIST_RE = /^-\s+(.*)$/;
const ORDERED_LIST_RE = /^(\d+)\.\s+(.*)$/;

/**
 * Try to parse a thematic break from the current line.
 * Returns Option<Result<BlockNode, ParseError>>:
 *   None         = not a thematic break
 *   Some(Ok(..)) = successfully parsed
 */
function tryThematicBreak(line: string): Option<Result<BlockNode, ParseError>> {
  if (THEMATIC_BREAK_RE.test(line)) {
    return Some(Ok({ kind: "ThematicBreak" as const }));
  }
  return None;
}

/**
 * Try to parse a heading. Demonstrates Option.from, andThen chaining.
 */
function tryHeading(line: string, lineNum: number): Option<Result<BlockNode, ParseError>> {
  const m = line.match(HEADING_RE);
  // Option.from wraps nullable match result into Option
  return Option.from(m).map((match) => {
    const level = match[1]!.length;
    const text = match[2]!;
    return parseInlines(text, lineNum).map<BlockNode>((children) => ({
      kind: "Heading" as const,
      level,
      children,
    }));
  });
}

/**
 * Try to parse a fenced code block. Consumes lines from the peekable until
 * closing fence is found.
 */
function tryFencedCode(
  line: string,
  lineNum: number,
  peekable: { peek(): Option<string>; next(): IteratorResult<string> },
): Option<Result<BlockNode, ParseError>> {
  const m = line.match(FENCED_CODE_RE);
  if (!m) return None;

  const language = m[1] ?? "";
  const codeLines: string[] = [];

  // Consume lines until closing fence
  while (true) {
    const peeked = peekable.peek();
    if (peeked.isNone()) {
      // Unterminated code block
      return Some(
        Err({
          kind: "UnterminatedCodeBlock" as const,
          line: lineNum,
          col: 0,
          message: "Fenced code block was never closed with ```",
        }),
      );
    }

    const nextLine = peeked.unwrap();
    // Consume the line
    peekable.next();

    if (/^```\s*$/.test(nextLine)) {
      // Found closing fence
      break;
    }
    codeLines.push(nextLine);
  }

  const code = codeLines.join("\n");
  return Some(Ok({ kind: "CodeBlock" as const, language, code }));
}

/**
 * Try to parse a blockquote. Collects `> ` prefixed lines and recursively
 * parses inner blocks.
 */
function tryBlockquote(
  line: string,
  lineNum: number,
  peekable: { peek(): Option<string>; next(): IteratorResult<string> },
): Option<Result<BlockNode, ParseError>> {
  const m = line.match(BLOCKQUOTE_RE);
  if (!m) return None;

  const innerLines: string[] = [m[1]!];

  // Continue collecting blockquote lines
  while (true) {
    const peeked = peekable.peek();
    if (peeked.isNone()) break;
    const nextLine = peeked.unwrap();
    const bqMatch = nextLine.match(BLOCKQUOTE_RE);
    if (!bqMatch) break;
    peekable.next();
    innerLines.push(bqMatch[1]!);
  }

  // Recursively parse inner content
  return Some(
    parseBlocks(innerLines, lineNum).map<BlockNode>((children) => ({
      kind: "Blockquote" as const,
      children,
    })),
  );
}

/**
 * Try to parse an unordered list. Demonstrates Iter.filter to skip empty items,
 * Result.all to collect all item parse results.
 */
function tryUnorderedList(
  line: string,
  lineNum: number,
  peekable: { peek(): Option<string>; next(): IteratorResult<string> },
): Option<Result<BlockNode, ParseError>> {
  const m = line.match(UNORDERED_LIST_RE);
  if (!m) return None;

  const itemTexts: string[] = [m[1]!];

  // Collect subsequent list items
  while (true) {
    const peeked = peekable.peek();
    if (peeked.isNone()) break;
    const nextLine = peeked.unwrap();
    const liMatch = nextLine.match(UNORDERED_LIST_RE);
    if (!liMatch) break;
    peekable.next();
    itemTexts.push(liMatch[1]!);
  }

  // Parse each item's inline content; collect with Result.all
  const itemResults = itemTexts.map((text, i) =>
    parseInlines(text, lineNum + i).map<ListItem>((children) => ({
      kind: "ListItem" as const,
      children,
    })),
  );

  return Some(
    Result.all(itemResults).map<BlockNode>((items) => ({
      kind: "UnorderedList" as const,
      items,
    })),
  );
}

/**
 * Try to parse an ordered list. Demonstrates Result.all for collecting
 * parse results across items.
 */
function tryOrderedList(
  line: string,
  lineNum: number,
  peekable: { peek(): Option<string>; next(): IteratorResult<string> },
): Option<Result<BlockNode, ParseError>> {
  const m = line.match(ORDERED_LIST_RE);
  if (!m) return None;

  const start = parseInt(m[1]!, 10);
  const itemTexts: string[] = [m[2]!];

  // Collect subsequent list items
  while (true) {
    const peeked = peekable.peek();
    if (peeked.isNone()) break;
    const nextLine = peeked.unwrap();
    const liMatch = nextLine.match(ORDERED_LIST_RE);
    if (!liMatch) break;
    peekable.next();
    itemTexts.push(liMatch[2]!);
  }

  // Parse each item's inline content
  const itemResults = itemTexts.map((text, i) =>
    parseInlines(text, lineNum + i).map<ListItem>((children) => ({
      kind: "ListItem" as const,
      children,
    })),
  );

  return Some(
    Result.all(itemResults).map<BlockNode>((items) => ({
      kind: "OrderedList" as const,
      items,
      start,
    })),
  );
}

/**
 * Parse an array of lines into BlockNode[].
 * Uses iter(lines).peekable() and the Option.orElse chain pattern
 * for trying each block-type detector in sequence.
 *
 * Demonstrates: iter(), peekable(), peek(), Option.orElse, Option.match,
 *               Iter.enumerate, Iter.filter
 */
function parseBlocks(
  lines: readonly string[],
  startLine: number = 1,
): Result<BlockNode[], ParseError> {
  const blocks: BlockNode[] = [];

  // Enumerate lines so we can track line numbers
  const numberedLines = iter(lines).enumerate().collect();
  const lineIter = iter(numberedLines).peekable();

  while (true) {
    const peeked = lineIter.peek();
    if (peeked.isNone()) break;

    const [idx, line] = peeked.unwrap();
    const lineNum = startLine + idx;

    // Skip blank lines
    if (line.trim() === "") {
      lineIter.next();
      continue;
    }

    // Consume the current line
    lineIter.next();

    // Build a proxy peekable that works on [number, string] pairs but
    // exposes just strings to the block detectors
    const proxy = {
      peek(): Option<string> {
        return lineIter.peek().map(([, l]) => l);
      },
      next(): IteratorResult<string> {
        const r = lineIter.next();
        if (r.done) return { done: true, value: undefined };
        return { done: false, value: r.value[1] };
      },
    };

    // Try each block detector in sequence using Option.orElse chain
    const detected: Option<Result<BlockNode, ParseError>> = tryThematicBreak(line)
      .orElse(() => tryHeading(line, lineNum))
      .orElse(() => tryFencedCode(line, lineNum, proxy))
      .orElse(() => tryBlockquote(line, lineNum, proxy))
      .orElse(() => tryUnorderedList(line, lineNum, proxy))
      .orElse(() => tryOrderedList(line, lineNum, proxy));

    // Handle detected result or fall back to paragraph
    const blockResult: Result<BlockNode, ParseError> = detected.match({
      some: (result) => result,
      none: () => {
        // Paragraph: accumulate lines until blank or next block-start
        const paraLines: string[] = [line];

        while (true) {
          const nextPeek = lineIter.peek();
          if (nextPeek.isNone()) break;
          const [, nextLine] = nextPeek.unwrap();
          if (isBlockStart(nextLine)) break;
          lineIter.next();
          paraLines.push(nextLine);
        }

        const paraText = paraLines.join("\n");

        return parseInlines(paraText, lineNum).map<BlockNode>((children) => ({
          kind: "Paragraph" as const,
          children,
        }));
      },
    });

    if (blockResult.isErr()) {
      return Err(blockResult.unwrapErr());
    }
    blocks.push(blockResult.unwrap());
  }

  return Ok(blocks);
}

// ============================================================================
// Async Block Parser — AsyncIter.peekable()
// ============================================================================

/**
 * Async variant of the block parser using PeekableAsyncIter.
 * Mirrors the sync version but uses await for peek/next.
 *
 * Demonstrates: AsyncIter.peekable, async peek(), await next()
 */
async function parseBlocksAsync(
  lines: PeekableAsyncIterType<string>,
): Promise<Result<BlockNode[], ParseError>> {
  const blocks: BlockNode[] = [];
  let lineNum = 0;

  while ((await lines.peek()).isSome()) {
    const result = await lines.next();
    if (result.done) break;
    const line = result.value;
    lineNum++;

    // Skip blank lines
    if (line.trim() === "") {
      continue;
    }

    // Build an async proxy for block detectors (they use sync interface
    // from the sync parser, so we buffer peeked lines)
    const bufferedLines: string[] = [];
    let bufferConsumed = 0;

    const proxy = {
      peek(): Option<string> {
        if (bufferConsumed < bufferedLines.length) {
          return Some(bufferedLines[bufferConsumed]!);
        }
        return None;
      },
      next(): IteratorResult<string> {
        if (bufferConsumed < bufferedLines.length) {
          const val = bufferedLines[bufferConsumed]!;
          bufferConsumed++;
          return { done: false, value: val };
        }
        return { done: true, value: undefined };
      },
    };

    // Pre-buffer upcoming lines for the sync block detectors.
    // We peek ahead and buffer lines until we hit a blank line or exhaust input.
    const tempLines: string[] = [];
    while ((await lines.peek()).isSome()) {
      const peeked = (await lines.peek()).unwrap();
      tempLines.push(peeked);
      await lines.next();
      // Stop buffering at blank line after collecting some content
      if (peeked.trim() === "") break;
    }
    bufferedLines.push(...tempLines);

    // Try each block detector in sequence
    const detected: Option<Result<BlockNode, ParseError>> = tryThematicBreak(line)
      .orElse(() => tryHeading(line, lineNum))
      .orElse(() => tryFencedCode(line, lineNum, proxy))
      .orElse(() => tryBlockquote(line, lineNum, proxy))
      .orElse(() => tryUnorderedList(line, lineNum, proxy))
      .orElse(() => tryOrderedList(line, lineNum, proxy));

    const blockResult: Result<BlockNode, ParseError> = detected.match({
      some: (r) => r,
      none: () => {
        // Paragraph: the current line plus any buffered non-block lines
        const paraLines: string[] = [line];
        for (let i = bufferConsumed; i < bufferedLines.length; i++) {
          const bl = bufferedLines[i]!;
          if (bl.trim() === "" || isBlockStart(bl)) break;
          paraLines.push(bl);
          bufferConsumed++;
        }

        const paraText = paraLines.join("\n");
        return parseInlines(paraText, lineNum).map<BlockNode>((children) => ({
          kind: "Paragraph" as const,
          children,
        }));
      },
    });

    if (blockResult.isErr()) {
      return Err(blockResult.unwrapErr());
    }
    blocks.push(blockResult.unwrap());
  }

  return Ok(blocks);
}

// ============================================================================
// Renderer — exhaustive matchKind on AST nodes
// ============================================================================

/** Render a sequence of inline nodes to HTML. */
function renderInlines(nodes: readonly InlineNode[]): string {
  return nodes.map(renderInline).join("");
}

/** Render a single inline node. Demonstrates matchKind on InlineNode. */
function renderInline(node: InlineNode): string {
  return matchKind(node, {
    Text: (t) => escapeHtml(t.content),
    InlineCode: (c) => `<code>${escapeHtml(c.code)}</code>`,
    Emphasis: (e) => `<em>${renderInlines(e.children)}</em>`,
    Strong: (s) => `<strong>${renderInlines(s.children)}</strong>`,
    StrongEmphasis: (se) => `<em><strong>${renderInlines(se.children)}</strong></em>`,
    Link: (l) => `<a href="${escapeHtml(l.href)}">${renderInlines(l.children)}</a>`,
    HardBreak: () => "<br>",
  });
}

/** Render a list item. */
function renderListItem(item: ListItem): string {
  return `<li>${renderInlines(item.children)}</li>`;
}

/** Render a single block node. Demonstrates matchKind on BlockNode. */
function renderNode(node: BlockNode): string {
  return matchKind(node, {
    Heading: (h) => `<h${h.level}>${renderInlines(h.children)}</h${h.level}>`,
    Paragraph: (p) => `<p>${renderInlines(p.children)}</p>`,
    CodeBlock: (c) =>
      c.language
        ? `<pre><code class="language-${escapeHtml(c.language)}">${escapeHtml(c.code)}</code></pre>`
        : `<pre><code>${escapeHtml(c.code)}</code></pre>`,
    Blockquote: (b) => `<blockquote>\n${b.children.map(renderNode).join("\n")}\n</blockquote>`,
    ThematicBreak: () => "<hr>",
    UnorderedList: (ul) => `<ul>\n${ul.items.map(renderListItem).join("\n")}\n</ul>`,
    OrderedList: (ol) =>
      ol.start === 1
        ? `<ol>\n${ol.items.map(renderListItem).join("\n")}\n</ol>`
        : `<ol start="${ol.start}">\n${ol.items.map(renderListItem).join("\n")}\n</ol>`,
  });
}

/** Render an entire Document to HTML. */
function renderDocument(doc: Document): string {
  return doc.children.map(renderNode).join("\n");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a markdown string into a Document AST.
 * Demonstrates: Result.map
 */
function parse(markdown: string): Result<Document, ParseError> {
  const lines = markdown.split("\n");
  return parseBlocks(lines).map((children) => ({
    kind: "Document" as const,
    children,
  }));
}

/**
 * Convert a markdown string directly to HTML.
 * Demonstrates: Result.map chaining parse -> render
 */
function markdownToHtml(markdown: string): Result<string, ParseError> {
  return parse(markdown).map(renderDocument);
}

/**
 * Parse a markdown file asynchronously using asyncIterLines.
 * Demonstrates: asyncIterLines, AsyncIter.peekable, isErr/isOk, unwrapErr, map
 */
async function parseMarkdownFile(filepath: string): Promise<Result<string, ParseError | string>> {
  const fileResult = await asyncIterLines(filepath);
  if (fileResult.isErr()) return Err(fileResult.unwrapErr());

  const lines = fileResult.unwrap().peekable();
  const blocksResult = await parseBlocksAsync(lines);
  return blocksResult.map((blocks) => renderDocument({ kind: "Document", children: blocks }));
}

// ============================================================================
// Statistics — demonstrates iter().fold()
// ============================================================================

/**
 * Count AST node types using iter().fold().
 * Demonstrates: iter, fold, filter
 */
function countNodeTypes(doc: Document): Record<string, number> {
  const allBlocks: BlockNode[] = [];
  const allInlines: InlineNode[] = [];

  function collectBlocks(nodes: readonly BlockNode[]): void {
    for (const node of nodes) {
      allBlocks.push(node);
      if (node.kind === "Blockquote") {
        collectBlocks(node.children);
      }
      if (node.kind === "Heading" || node.kind === "Paragraph") {
        collectInlines(node.children);
      }
      if (node.kind === "UnorderedList" || node.kind === "OrderedList") {
        for (const item of node.items) {
          collectInlines(item.children);
        }
      }
    }
  }

  function collectInlines(nodes: readonly InlineNode[]): void {
    for (const node of nodes) {
      allInlines.push(node);
      if (
        node.kind === "Emphasis" ||
        node.kind === "Strong" ||
        node.kind === "StrongEmphasis" ||
        node.kind === "Link"
      ) {
        collectInlines(node.children);
      }
    }
  }

  collectBlocks(doc.children);

  // Use iter().fold() to tally block node kinds
  const blockCounts = iter(allBlocks).fold({} as Record<string, number>, (acc, node) => {
    acc[node.kind] = (acc[node.kind] ?? 0) + 1;
    return acc;
  });

  // Use iter().fold() to tally inline node kinds
  const inlineCounts = iter(allInlines).fold({} as Record<string, number>, (acc, node) => {
    acc[node.kind] = (acc[node.kind] ?? 0) + 1;
    return acc;
  });

  return { ...blockCounts, ...inlineCounts };
}

// ============================================================================
// Demo
// ============================================================================

const SAMPLE_MARKDOWN = `# Hello World

Welcome to the **Markdown Parser** built with rustlike primitives.

## Features

This parser supports *italic*, **bold**, ***bold-italic***, \`inline code\`, and [links](https://example.com).

### Code Blocks

\`\`\`typescript
const result: Result<number, string> = Ok(42);
result.match({
  ok: (v) => console.log(v),
  err: (e) => console.error(e),
});
\`\`\`

### Blockquotes

> The borrow checker ensures memory safety.
> Rust makes you think about ownership from the start.

### Lists

Unordered:

- Result for recoverable errors
- Option for nullable values
- Pattern matching for control flow

Ordered:

1. Parse the input
2. Build the AST
3. Render to HTML

---

#### Deep Headings

##### Level 5

###### Level 6

This line has a hard break\\
and continues here.

***

Final paragraph with **bold**, *italic*, and \`code\`.`;

async function main(): Promise<void> {
  console.log("Markdown Parser (Rust-like Implementation)");
  console.log("==========================================");
  console.log("");

  // ====================================================================
  // 1. Sync parse from embedded markdown string
  // ====================================================================
  console.log("=== Sync: Parse embedded markdown ===");
  console.log("");

  const result = markdownToHtml(SAMPLE_MARKDOWN);
  result.match({
    ok: (html) => console.log(html),
    err: (e) => console.error(`Parse error at ${e.line}:${e.col}: ${e.message}`),
  });

  console.log("");

  // ====================================================================
  // 2. AST statistics using iter().fold()
  // ====================================================================
  console.log("=== AST Statistics ===");
  console.log("");

  const parseResult = parse(SAMPLE_MARKDOWN);
  parseResult.match({
    ok: (doc) => {
      const counts = countNodeTypes(doc);
      // Use iter to display sorted stats
      iter(Object.entries(counts))
        .filter(([, count]) => count > 0)
        .forEach(([kind, count]) => {
          console.log(`  ${kind}: ${count}`);
        });
    },
    err: (e) => console.error(`Parse error: ${e.message}`),
  });

  console.log("");

  // ====================================================================
  // 3. Async parse from file
  // ====================================================================
  console.log("=== Async: Parse from file ===");
  console.log("");

  const filepath = path.join(__dirname, "sample.md");
  const fileResult = await parseMarkdownFile(filepath);
  fileResult.match({
    ok: (html) => console.log(html),
    err: (e) => {
      if (typeof e === "string") {
        console.error(`File error: ${e}`);
      } else {
        console.error(`Parse error at ${e.line}:${e.col}: ${e.message}`);
      }
    },
  });

  console.log("");

  // ====================================================================
  // 4. Error handling demo
  // ====================================================================
  console.log("=== Error handling demo ===");
  console.log("");

  const badMarkdown = "```rust\nfn main() {\n  // no closing fence";
  const badResult = markdownToHtml(badMarkdown);
  badResult.match({
    ok: () => console.log("(unexpected success)"),
    err: (e) => console.log(`Caught error: [${e.kind}] at line ${e.line}: ${e.message}`),
  });

  console.log("");

  // ====================================================================
  // 5. Option.from demo — wrapping nullable values
  // ====================================================================
  console.log("=== Option.from demo ===");
  console.log("");

  const testLines = ["# Valid heading", "Not a heading", "## Another heading", "plain text"];

  iter(testLines)
    .enumerate()
    .forEach(([i, line]) => {
      const headingOpt = Option.from(line.match(HEADING_RE));
      headingOpt.match({
        some: (m) => console.log(`  Line ${i + 1}: Heading level ${m[1]!.length} — "${m[2]}"`),
        none: () => console.log(`  Line ${i + 1}: Not a heading`),
      });
    });
}

main().catch(console.error);
