/**
 * CSV Sales Report Generator - Idiomatic TypeScript Implementation
 *
 * Standard TypeScript approach:
 * - fs.readFileSync + try/catch for file I/O
 * - Array.slice() for skipping the header
 * - Manual index tracking for line numbers
 * - null returns for parse errors + push to error array
 * - for-loop with mutable accumulators for aggregation
 * - Array.sort().slice(0, 5) for top-N
 * - lines.push(...) to build report output
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

type Category = "Electronics" | "Clothing" | "Food";
type Region = "North" | "South" | "East" | "West";

interface SaleRecord {
  line: number;
  date: string;
  product: string;
  category: Category;
  region: Region;
  quantity: number;
  unitPrice: number;
  revenue: number;
}

interface ParseError {
  line: number;
  reason: string;
}

interface BucketEntry {
  revenue: number;
  units: number;
}

interface Aggregation {
  totalRevenue: number;
  totalUnits: number;
  recordCount: number;
  byCategory: Record<string, BucketEntry>;
  byRegion: Record<string, BucketEntry>;
  byProduct: Record<string, BucketEntry>;
  highestSale: { product: string; revenue: number } | null;
}

const VALID_CATEGORIES = new Set<string>(["Electronics", "Clothing", "Food"]);
const VALID_REGIONS = new Set<string>(["North", "South", "East", "West"]);

// ============================================================================
// Parsing
// ============================================================================

function parseRow(line: number, raw: string): { sale: SaleRecord } | { error: ParseError } {
  const fields = raw.split(",");
  if (fields.length !== 6) {
    return { error: { line, reason: `Expected 6 fields, got ${fields.length}` } };
  }

  const [date, product, categoryStr, regionStr, qtyStr, priceStr] = fields;

  if (!product || product.trim() === "") {
    return { error: { line, reason: "Empty product name" } };
  }
  if (!categoryStr || !VALID_CATEGORIES.has(categoryStr)) {
    return { error: { line, reason: `Invalid category: "${categoryStr}"` } };
  }
  if (!regionStr || !VALID_REGIONS.has(regionStr)) {
    return { error: { line, reason: `Invalid region: "${regionStr}"` } };
  }

  const quantity = Number(qtyStr);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: { line, reason: `Invalid quantity: "${qtyStr}"` } };
  }

  const unitPrice = Number(priceStr);
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: { line, reason: `Invalid unit price: "${priceStr}"` } };
  }

  return {
    sale: {
      line,
      date: date!,
      product: product.trim(),
      category: categoryStr as Category,
      region: regionStr as Region,
      quantity,
      unitPrice,
      revenue: Math.round(quantity * unitPrice * 100) / 100,
    },
  };
}

// ============================================================================
// Aggregation
// ============================================================================

function addToBucket(
  bucket: Record<string, BucketEntry>,
  key: string,
  revenue: number,
  units: number,
): void {
  if (!bucket[key]) {
    bucket[key] = { revenue: 0, units: 0 };
  }
  bucket[key].revenue += revenue;
  bucket[key].units += units;
}

function aggregate(sales: SaleRecord[]): Aggregation {
  let totalRevenue = 0;
  let totalUnits = 0;
  const byCategory: Record<string, BucketEntry> = {};
  const byRegion: Record<string, BucketEntry> = {};
  const byProduct: Record<string, BucketEntry> = {};
  let highestSale: { product: string; revenue: number } | null = null;

  for (const sale of sales) {
    totalRevenue += sale.revenue;
    totalUnits += sale.quantity;

    addToBucket(byCategory, sale.category, sale.revenue, sale.quantity);
    addToBucket(byRegion, sale.region, sale.revenue, sale.quantity);
    addToBucket(byProduct, sale.product, sale.revenue, sale.quantity);

    if (highestSale === null || sale.revenue > highestSale.revenue) {
      highestSale = { product: sale.product, revenue: sale.revenue };
    }
  }

  return {
    totalRevenue,
    totalUnits,
    recordCount: sales.length,
    byCategory,
    byRegion,
    byProduct,
    highestSale,
  };
}

// ============================================================================
// Report formatting
// ============================================================================

function currency(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatReport(agg: Aggregation, errors: ParseError[]): string {
  const lines: string[] = [];

  // Header
  lines.push("=== Sales Report ===");
  lines.push("");

  // Summary
  lines.push("Summary:");
  lines.push(`  Records processed: ${agg.recordCount}`);
  lines.push(`  Total revenue:     ${currency(agg.totalRevenue)}`);
  lines.push(`  Total units sold:  ${agg.totalUnits}`);
  if (agg.highestSale) {
    lines.push(
      `  Highest single sale: ${agg.highestSale.product} (${currency(agg.highestSale.revenue)})`,
    );
  } else {
    lines.push("  Highest single sale: N/A");
  }
  lines.push("");

  // Revenue by category
  const categoryEntries = Object.entries(agg.byCategory).sort(
    ([, a], [, b]) => b.revenue - a.revenue,
  );

  lines.push("Revenue by Category:");
  for (const [cat, data] of categoryEntries) {
    lines.push(`  ${cat.padEnd(12)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`);
  }
  lines.push("");

  // Revenue by region
  const regionEntries = Object.entries(agg.byRegion).sort(([, a], [, b]) => b.revenue - a.revenue);

  lines.push("Revenue by Region:");
  for (const [region, data] of regionEntries) {
    lines.push(
      `  ${region.padEnd(12)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`,
    );
  }
  lines.push("");

  // Top 5 products by revenue
  const top5 = Object.entries(agg.byProduct)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  lines.push("Top 5 Products by Revenue:");
  for (const [product, data] of top5) {
    lines.push(
      `  ${product.padEnd(14)} ${currency(data.revenue).padStart(12)}  (${data.units} units)`,
    );
  }
  lines.push("");

  // Data quality
  lines.push("Data Quality:");

  const allPositiveRevenue = Object.values(agg.byProduct).every((p) => p.revenue > 0);
  lines.push(`  All products have positive revenue: ${allPositiveRevenue ? "YES" : "NO"}`);

  const hasHighVolume = Object.values(agg.byProduct).some((p) => p.units > 100);
  lines.push(`  Any product with 100+ units: ${hasHighVolume ? "YES" : "NO"}`);

  let totalCategoryRevenue = 0;
  for (const data of Object.values(agg.byCategory)) {
    totalCategoryRevenue += data.revenue;
  }
  const revenueCheck = Math.abs(totalCategoryRevenue - agg.totalRevenue) < 0.01;
  lines.push(`  Category totals match: ${revenueCheck ? "YES" : "NO"}`);

  if (errors.length > 0) {
    lines.push("");
    lines.push(`  Parse warnings (${errors.length}):`);
    for (const err of errors) {
      lines.push(`    Line ${err.line}: ${err.reason}`);
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Main
// ============================================================================

function main(): void {
  const csvFile = path.join(__dirname, "sales_data.csv");

  console.log("Sales Report Generator (Idiomatic TypeScript Implementation)");
  console.log(`Reading: ${csvFile}`);
  console.log("");

  try {
    // Read entire file into memory
    const content = fs.readFileSync(csvFile, "utf-8");
    const allLines = content.split("\n").filter((line) => line.trim() !== "");

    // Skip header with slice (eagerly copies the array)
    const dataLines = allLines.slice(1);

    // Parse with manual index tracking
    const sales: SaleRecord[] = [];
    const errors: ParseError[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]!;
      const lineNumber = i + 2; // 1-based + header offset
      const result = parseRow(lineNumber, line);

      if ("sale" in result) {
        sales.push(result.sale);
      } else {
        errors.push(result.error);
      }
    }

    // Aggregate with mutable accumulators
    const aggregation = aggregate(sales);

    // Format and print
    console.log(formatReport(aggregation, errors));
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

main();
