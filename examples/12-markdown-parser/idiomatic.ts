/**
 * Markdown Parser - Idiomatic TypeScript Implementation
 *
 * Standard TypeScript approach to parsing a CommonMark subset:
 * - Class-based AST nodes with `type` discriminant fields
 * - Index-based loops with manual lookahead for inline parsing
 * - Array-based block parsing with line-by-line consumption
 * - try/catch for error handling with a custom ParseError class
 * - switch/case with `as` casts for rendering
 * - Async file reading via readline streams
 *
 * Contrast with index.ts which uses:
 * - Discriminated union ADTs (Result, Option)
 * - Lazy iterators for inline token scanning
 * - Pattern matching via match() for rendering
 * - Result-based error propagation (no exceptions)
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Error Types
// ============================================================================

class ParseError extends Error {
  constructor(
    public readonly errorKind: string,
    public readonly line: number,
    public readonly col: number,
    msg: string,
  ) {
    super(msg);
    this.name = "ParseError";
  }
}

// ============================================================================
// AST — Block Nodes
// ============================================================================

interface BlockNode {
  type: string;
}

class Heading implements BlockNode {
  type = "Heading" as const;
  constructor(
    public level: number,
    public children: InlineNode[],
  ) {}
}

class Paragraph implements BlockNode {
  type = "Paragraph" as const;
  constructor(public children: InlineNode[]) {}
}

class CodeBlock implements BlockNode {
  type = "CodeBlock" as const;
  constructor(
    public language: string,
    public code: string,
  ) {}
}

class Blockquote implements BlockNode {
  type = "Blockquote" as const;
  constructor(public children: BlockNode[]) {}
}

class ThematicBreak implements BlockNode {
  type = "ThematicBreak" as const;
}

class UnorderedList implements BlockNode {
  type = "UnorderedList" as const;
  constructor(public items: ListItem[]) {}
}

class OrderedList implements BlockNode {
  type = "OrderedList" as const;
  constructor(
    public items: ListItem[],
    public start: number,
  ) {}
}

class ListItem implements BlockNode {
  type = "ListItem" as const;
  constructor(public children: InlineNode[]) {}
}

// ============================================================================
// AST — Inline Nodes
// ============================================================================

interface InlineNode {
  type: string;
}

class TextNode implements InlineNode {
  type = "Text" as const;
  constructor(public content: string) {}
}

class InlineCodeNode implements InlineNode {
  type = "InlineCode" as const;
  constructor(public code: string) {}
}

class EmphasisNode implements InlineNode {
  type = "Emphasis" as const;
  constructor(public children: InlineNode[]) {}
}

class StrongNode implements InlineNode {
  type = "Strong" as const;
  constructor(public children: InlineNode[]) {}
}

class StrongEmphasisNode implements InlineNode {
  type = "StrongEmphasis" as const;
  constructor(public children: InlineNode[]) {}
}

class LinkNode implements InlineNode {
  type = "Link" as const;
  constructor(
    public href: string,
    public children: InlineNode[],
  ) {}
}

class HardBreakNode implements InlineNode {
  type = "HardBreak" as const;
}

// ============================================================================
// AST — Document
// ============================================================================

class Document {
  type = "Document" as const;
  constructor(public children: BlockNode[]) {}
}

// ============================================================================
// Helpers
// ============================================================================

function escapeHtml(text: string): string {
  let result = "";
  for (const ch of text) {
    if (ch === "&") result += "&amp;";
    else if (ch === "<") result += "&lt;";
    else if (ch === ">") result += "&gt;";
    else if (ch === '"') result += "&quot;";
    else result += ch;
  }
  return result;
}

function isBlockStart(line: string): boolean {
  if (/^#{1,6}\s/.test(line)) return true;
  if (line.startsWith("```")) return true;
  if (line.startsWith("> ")) return true;
  if (line.startsWith("- ")) return true;
  if (/^\d+\.\s/.test(line)) return true;
  if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) return true;
  return false;
}

// ============================================================================
// Inline Parser
// ============================================================================

function parseInlines(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // --- Backtick: inline code ---
    if (ch === "`") {
      // Flush text buffer
      if (buffer) {
        nodes.push(new TextNode(buffer));
        buffer = "";
      }

      // Find the closing backtick
      const closeIdx = text.indexOf("`", i + 1);
      if (closeIdx === -1) {
        // No closing backtick — treat as literal
        buffer += "`";
        i++;
      } else {
        const code = text.slice(i + 1, closeIdx);
        nodes.push(new InlineCodeNode(code));
        i = closeIdx + 1;
      }
      continue;
    }

    // --- Asterisks: emphasis / strong / strong-emphasis ---
    if (ch === "*") {
      // Count the run of asterisks
      let starCount = 0;
      let j = i;
      while (j < text.length && text[j] === "*") {
        starCount++;
        j++;
      }

      if (starCount === 3) {
        // Strong emphasis: ***text***
        const closeIdx = text.indexOf("***", j);
        if (closeIdx !== -1) {
          if (buffer) {
            nodes.push(new TextNode(buffer));
            buffer = "";
          }
          const inner = text.slice(j, closeIdx);
          nodes.push(new StrongEmphasisNode(parseInlines(inner)));
          i = closeIdx + 3;
          continue;
        }
      }

      if (starCount === 2) {
        // Strong: **text**
        const closeIdx = text.indexOf("**", j);
        if (closeIdx !== -1) {
          if (buffer) {
            nodes.push(new TextNode(buffer));
            buffer = "";
          }
          const inner = text.slice(j, closeIdx);
          nodes.push(new StrongNode(parseInlines(inner)));
          i = closeIdx + 2;
          continue;
        }
      }

      if (starCount === 1) {
        // Emphasis: *text*
        const closeIdx = text.indexOf("*", j);
        if (closeIdx !== -1) {
          if (buffer) {
            nodes.push(new TextNode(buffer));
            buffer = "";
          }
          const inner = text.slice(j, closeIdx);
          nodes.push(new EmphasisNode(parseInlines(inner)));
          i = closeIdx + 1;
          continue;
        }
      }

      // No matching close — treat stars as literal text
      for (let k = 0; k < starCount; k++) {
        buffer += "*";
      }
      i = j;
      continue;
    }

    // --- Square bracket: links [text](url) ---
    if (ch === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          if (buffer) {
            nodes.push(new TextNode(buffer));
            buffer = "";
          }
          const linkText = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          nodes.push(new LinkNode(href, parseInlines(linkText)));
          i = closeParen + 1;
          continue;
        }
      }
      // Not a valid link — treat as literal
      buffer += "[";
      i++;
      continue;
    }

    // --- Backslash: hard break (\ followed by newline) ---
    if (ch === "\\" && i + 1 < text.length && text[i + 1] === "\n") {
      if (buffer) {
        nodes.push(new TextNode(buffer));
        buffer = "";
      }
      nodes.push(new HardBreakNode());
      i += 2; // skip \ and \n
      continue;
    }

    // --- Default: accumulate into text buffer ---
    buffer += ch;
    i++;
  }

  // Flush remaining text buffer
  if (buffer) {
    nodes.push(new TextNode(buffer));
  }

  return nodes;
}

// ============================================================================
// Block Parser
// ============================================================================

function parseBlocks(lines: string[]): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // --- Thematic break (---, ***, ___) ---
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
      blocks.push(new ThematicBreak());
      i++;
      continue;
    }

    // --- ATX Heading ---
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push(new Heading(headingMatch[1].length, parseInlines(headingMatch[2])));
      i++;
      continue;
    }

    // --- Fenced code block ---
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i >= lines.length) {
        throw new ParseError("UnterminatedCodeBlock", i, 0, "Unterminated fenced code block");
      }
      i++; // skip closing fence
      blocks.push(new CodeBlock(lang, codeLines.join("\n")));
      continue;
    }

    // --- Blockquote ---
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const innerBlocks = parseBlocks(quoteLines);
      blocks.push(new Blockquote(innerBlocks));
      continue;
    }

    // --- Unordered list ---
    if (line.startsWith("- ")) {
      const items: ListItem[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(new ListItem(parseInlines(lines[i].slice(2))));
        i++;
      }
      blocks.push(new UnorderedList(items));
      continue;
    }

    // --- Ordered list ---
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      const start = parseInt(orderedMatch[1], 10);
      const items: ListItem[] = [];
      while (i < lines.length) {
        const olMatch = lines[i].match(/^(\d+)\.\s+(.*)$/);
        if (!olMatch) break;
        items.push(new ListItem(parseInlines(olMatch[2])));
        i++;
      }
      blocks.push(new OrderedList(items, start));
      continue;
    }

    // --- Paragraph: accumulate lines until blank or block-start ---
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(new Paragraph(parseInlines(paraLines.join("\n"))));
    }
  }

  return blocks;
}

// ============================================================================
// Renderer
// ============================================================================

function renderInline(node: InlineNode): string {
  switch (node.type) {
    case "Text":
      return escapeHtml((node as TextNode).content);
    case "InlineCode":
      return `<code>${escapeHtml((node as InlineCodeNode).code)}</code>`;
    case "Emphasis":
      return `<em>${renderInlines((node as EmphasisNode).children)}</em>`;
    case "Strong":
      return `<strong>${renderInlines((node as StrongNode).children)}</strong>`;
    case "StrongEmphasis":
      return `<em><strong>${renderInlines((node as StrongEmphasisNode).children)}</strong></em>`;
    case "Link": {
      const link = node as LinkNode;
      return `<a href="${escapeHtml(link.href)}">${renderInlines(link.children)}</a>`;
    }
    case "HardBreak":
      return "<br>";
    default:
      return "";
  }
}

function renderInlines(nodes: InlineNode[]): string {
  let result = "";
  for (const node of nodes) {
    result += renderInline(node);
  }
  return result;
}

function renderNode(node: BlockNode): string {
  switch (node.type) {
    case "Heading": {
      const h = node as Heading;
      return `<h${h.level}>${renderInlines(h.children)}</h${h.level}>`;
    }
    case "Paragraph": {
      const p = node as Paragraph;
      return `<p>${renderInlines(p.children)}</p>`;
    }
    case "CodeBlock": {
      const cb = node as CodeBlock;
      if (cb.language) {
        return `<pre><code class="language-${escapeHtml(cb.language)}">${escapeHtml(cb.code)}</code></pre>`;
      }
      return `<pre><code>${escapeHtml(cb.code)}</code></pre>`;
    }
    case "Blockquote": {
      const bq = node as Blockquote;
      const inner = bq.children.map(renderNode).join("\n");
      return `<blockquote>\n${inner}\n</blockquote>`;
    }
    case "ThematicBreak":
      return "<hr>";
    case "UnorderedList": {
      const ul = node as UnorderedList;
      const items = ul.items.map((item) => `<li>${renderInlines(item.children)}</li>`).join("\n");
      return `<ul>\n${items}\n</ul>`;
    }
    case "OrderedList": {
      const ol = node as OrderedList;
      const startAttr = ol.start !== 1 ? ` start="${ol.start}"` : "";
      const items = ol.items.map((item) => `<li>${renderInlines(item.children)}</li>`).join("\n");
      return `<ol${startAttr}>\n${items}\n</ol>`;
    }
    default:
      return "";
  }
}

function renderDocument(doc: Document): string {
  const rendered: string[] = [];
  for (const block of doc.children) {
    rendered.push(renderNode(block));
  }
  return rendered.join("\n");
}

// ============================================================================
// Top-level API
// ============================================================================

function parse(markdown: string): Document {
  const lines = markdown.split("\n");
  const blocks = parseBlocks(lines);
  return new Document(blocks);
}

function markdownToHtml(markdown: string): string {
  const doc = parse(markdown);
  return renderDocument(doc);
}

// ============================================================================
// Async File Parser
// ============================================================================

async function parseMarkdownFile(filepath: string): Promise<string> {
  const lines: string[] = [];
  const fileStream = fs.createReadStream(filepath, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lines.push(line);
  }

  rl.close();
  fileStream.destroy();

  const doc = parse(lines.join("\n"));
  return renderDocument(doc);
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
  console.log("Markdown Parser (Idiomatic TypeScript Implementation)");
  console.log("=====================================================");
  console.log("");

  // 1. Sync parse of embedded markdown
  console.log("--- Sync: Parse embedded markdown ---");
  console.log("");
  try {
    const html = markdownToHtml(SAMPLE_MARKDOWN);
    console.log(html);
  } catch (e) {
    if (e instanceof ParseError) {
      console.error(`Parse error at ${e.line}:${e.col}: ${e.message}`);
    }
  }

  console.log("");

  // 2. Async parse from file
  console.log("--- Async: Parse from file ---");
  console.log("");
  try {
    const filepath = path.join(__dirname, "sample.md");
    const html = await parseMarkdownFile(filepath);
    console.log(html);
  } catch (e) {
    if (e instanceof ParseError) {
      console.error(`Parse error at ${e.line}:${e.col}: ${e.message}`);
    } else if (e instanceof Error) {
      console.error(`File error: ${e.message}`);
    }
  }

  console.log("");

  // 3. Error handling demo
  console.log("--- Error handling demo ---");
  console.log("");
  try {
    const badMarkdown = "```rust\nfn main() {\n  // no closing fence";
    markdownToHtml(badMarkdown);
    console.log("(unexpected success)");
  } catch (e) {
    if (e instanceof ParseError) {
      console.log(`Caught error: [${e.errorKind}] at line ${e.line}: ${e.message}`);
    }
  }
}

main().catch(console.error);
