/**
 * CSV Sales Report Generator - Rust-like Implementation
 *
 * Demonstrates lazy synchronous iterators (Iter<T>) for a real
 * data-processing pipeline: parse CSV → validate → aggregate → report.
 *
 * Iter methods used naturally:
 *   iterLinesSync, skip, enumerate, map, partition, fold,
 *   take, chain, collect, any, all, filter, inspect,
 *   Iter.sum, Iter.max
 */

import { Result, Ok, Err, Option, Some, None, iter, Iter } from "rustlike";
import { iterLinesSync } from "rustlike/node";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

type Category = "Electronics" | "Clothing" | "Food";
type Region = "North" | "South" | "East" | "West";

type SaleRecord = {
  readonly line: number;
  readonly date: string;
  readonly product: string;
  readonly category: Category;
  readonly region: Region;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly revenue: number;
};

type ParseError = {
  readonly line: number;
  readonly reason: string;
};

type Aggregation = {
  readonly totalRevenue: number;
  readonly totalUnits: number;
  readonly recordCount: number;
  readonly byCategory: Record<string, { revenue: number; units: number }>;
  readonly byRegion: Record<string, { revenue: number; units: number }>;
  readonly byProduct: Record<string, { revenue: number; units: number }>;
  readonly highestSale: Option<{ product: string; revenue: number }>;
};

const EMPTY_AGGREGATION: Aggregation = {
  totalRevenue: 0,
  totalUnits: 0,
  recordCount: 0,
  byCategory: {},
  byRegion: {},
  byProduct: {},
  highestSale: None,
};

const VALID_CATEGORIES = new Set<string>(["Electronics", "Clothing", "Food"]);
const VALID_REGIONS = new Set<string>(["North", "South", "East", "West"]);

// ============================================================================
// Parsing
// ============================================================================

function parseCategory(s: string): Option<Category> {
  return VALID_CATEGORIES.has(s) ? Some(s as Category) : None;
}

function parseRegion(s: string): Option<Region> {
  return VALID_REGIONS.has(s) ? Some(s as Region) : None;
}

function parseRow(line: number, raw: string): Result<SaleRecord, ParseError> {
  const fields = raw.split(",");
  if (fields.length !== 6) {
    return Err({ line, reason: `Expected 6 fields, got ${fields.length}` });
  }

  const [date, product, categoryStr, regionStr, qtyStr, priceStr] = fields;

  // Validate product name is non-empty
  if (!product || product.trim() === "") {
    return Err({ line, reason: "Empty product name" });
  }

  // Validate category
  const category = parseCategory(categoryStr!);
  if (category.isNone()) {
    return Err({ line, reason: `Invalid category: "${categoryStr}"` });
  }

  // Validate region
  const region = parseRegion(regionStr!);
  if (region.isNone()) {
    return Err({ line, reason: `Invalid region: "${regionStr}"` });
  }

  // Parse quantity
  const quantity = Number(qtyStr);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return Err({ line, reason: `Invalid quantity: "${qtyStr}"` });
  }

  // Parse unit price
  const unitPrice = Number(priceStr);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return Err({ line, reason: `Invalid unit price: "${priceStr}"` });
  }

  return Ok({
    line,
    date: date!,
    product: product.trim(),
    category: category.unwrap(),
    region: region.unwrap(),
    quantity,
    unitPrice,
    revenue: Math.round(quantity * unitPrice * 100) / 100,
  });
}

// ============================================================================
// Aggregation
// ============================================================================

function addToBucket(
  bucket: Record<string, { revenue: number; units: number }>,
  key: string,
  revenue: number,
  units: number,
): Record<string, { revenue: number; units: number }> {
  const prev = bucket[key] ?? { revenue: 0, units: 0 };
  return {
    ...bucket,
    [key]: { revenue: prev.revenue + revenue, units: prev.units + units },
  };
}

function aggregateSale(acc: Aggregation, sale: SaleRecord): Aggregation {
  const newHighest = acc.highestSale.match({
    some: (h) =>
      sale.revenue > h.revenue
        ? Some({ product: sale.product, revenue: sale.revenue })
        : acc.highestSale,
    none: () => Some({ product: sale.product, revenue: sale.revenue }),
  });

  return {
    totalRevenue: acc.totalRevenue + sale.revenue,
    totalUnits: acc.totalUnits + sale.quantity,
    recordCount: acc.recordCount + 1,
    byCategory: addToBucket(acc.byCategory, sale.category, sale.revenue, sale.quantity),
    byRegion: addToBucket(acc.byRegion, sale.region, sale.revenue, sale.quantity),
    byProduct: addToBucket(acc.byProduct, sale.product, sale.revenue, sale.quantity),
    highestSale: newHighest,
  };
}

// ============================================================================
// Report formatting
// ============================================================================

function currency(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatReport(agg: Aggregation, errors: readonly ParseError[]): string {
  // --- Header section ---
  const header = iter(["=== Sales Report ===", ""]);

  // --- Summary section ---
  const summary = iter([
    "Summary:",
    `  Records processed: ${agg.recordCount}`,
    `  Total revenue:     ${currency(agg.totalRevenue)}`,
    `  Total units sold:  ${agg.totalUnits}`,
    agg.highestSale.match({
      some: (h) => `  Highest single sale: ${h.product} (${currency(h.revenue)})`,
      none: () => "  Highest single sale: N/A",
    }),
    "",
  ]);

  // --- Revenue by category ---
  const categoryEntries = Object.entries(agg.byCategory).sort(
    ([, a], [, b]) => b.revenue - a.revenue,
  );

  const categorySection = iter([
    "Revenue by Category:",
    ...categoryEntries.map(
      ([cat, data]) =>
        `  ${cat.padEnd(12)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`,
    ),
    "",
  ]);

  // --- Revenue by region ---
  const regionEntries = Object.entries(agg.byRegion).sort(([, a], [, b]) => b.revenue - a.revenue);

  const regionSection = iter([
    "Revenue by Region:",
    ...regionEntries.map(
      ([region, data]) =>
        `  ${region.padEnd(12)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`,
    ),
    "",
  ]);

  // --- Top 5 products by revenue ---
  const sortedProducts = Object.entries(agg.byProduct).sort(
    ([, a], [, b]) => b.revenue - a.revenue,
  );

  const top5Lines = iter(sortedProducts)
    .take(5)
    .map(
      ([product, data]) =>
        `  ${product.padEnd(14)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`,
    )
    .collect();

  const productsSection = iter(["Top 5 Products by Revenue:", ...top5Lines, ""]);

  // --- Data quality section ---
  const qualityLines: string[] = ["Data Quality:"];

  const allPositiveRevenue = iter(Object.values(agg.byProduct)).all((p) => p.revenue > 0);
  qualityLines.push(`  All products have positive revenue: ${allPositiveRevenue ? "YES" : "NO"}`);

  const hasHighVolume = iter(Object.entries(agg.byProduct)).any(([, data]) => data.units > 100);
  qualityLines.push(`  Any product with 100+ units: ${hasHighVolume ? "YES" : "NO"}`);

  const totalCategoryRevenue = Iter.sum(iter(Object.values(agg.byCategory)).map((c) => c.revenue));
  const revenueCheck = Math.abs(totalCategoryRevenue - agg.totalRevenue) < 0.01;
  qualityLines.push(`  Category totals match: ${revenueCheck ? "YES" : "NO"}`);

  if (errors.length > 0) {
    qualityLines.push("");
    qualityLines.push(`  Parse warnings (${errors.length}):`);
    for (const err of errors) {
      qualityLines.push(`    Line ${err.line}: ${err.reason}`);
    }
  }

  const qualitySection = iter(qualityLines);

  // --- Compose all sections with chain ---
  return header
    .chain(summary)
    .chain(categorySection)
    .chain(regionSection)
    .chain(productsSection)
    .chain(qualitySection)
    .collect()
    .join("\n");
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const csvFile = path.join(__dirname, "sales_data.csv");

  console.log("Sales Report Generator (Rust-like Iter Implementation)");
  console.log(`Reading: ${csvFile}`);
  console.log("");

  // Stage 1: Read file and parse rows
  const fileResult = iterLinesSync(csvFile);

  if (fileResult.isErr()) {
    console.error(`Error: ${fileResult.unwrapErr()}`);
    process.exit(1);
  }

  const lines = fileResult.unwrap();

  // skip(1) drops the header, enumerate() gives us line numbers (offset +2 for 1-based + header)
  // partition() is a terminal operation — the lazy pipeline feeds directly into it
  const [validResults, errorResults] = lines
    .skip(1)
    .enumerate()
    .map(([i, raw]) => parseRow(i + 2, raw))
    .partition((r) => r.isOk());

  const sales = iter(validResults)
    .map((r) => r.unwrap())
    .collect();

  const errors = iter(errorResults)
    .map((r) => r.unwrapErr())
    .collect();

  // Stage 3: Single-pass aggregation via fold
  const aggregation = iter(sales).fold(EMPTY_AGGREGATION, aggregateSale);

  // Stage 4: Format and print report
  console.log(formatReport(aggregation, errors));
}

main();
