# Sales Report Generator

Composable data processing with lazy iterator combinators.

## Run

```bash
cd examples
pnpm install
pnpm sales-report           # Runs index.ts (rust-like)
pnpm tsx 11-sales-report-generator/idiomatic.ts  # Runs idiomatic version
```

## What it demonstrates

- **`iterLinesSync()`** — Read a CSV file into a lazy `Result<Iter<string>, string>`
- **`.skip(1)`** — Drop the CSV header row without copying the array
- **`.enumerate()`** — Track line numbers for error messages
- **`.map(parseRow)`** — Transform each line into `Result<SaleRecord, ParseError>`
- **`.partition()`** — Separate valid records from parse errors in one pass
- **`.fold(init, fn)`** — Single-pass multi-metric aggregation (revenue, units, per-category/region/product breakdowns, highest sale)
- **`.take(5)`** — Lazy top-5 products after sorting
- **`.chain()`** — Compose report sections (header, summary, categories, regions, products, quality) into one output iterator
- **`.collect()`** — Materialize results at pipeline terminals
- **`.all()` / `.any()`** — Data quality assertions
- **`Iter.sum()`** — Numeric aggregation for cross-check
- **`Option<T>`** — Model the "highest sale so far" as `Some`/`None`
- **`Result<T, E>`** — Parse functions return `Ok(record)` or `Err(parseError)`

## Architecture

```
sales_data.csv
      │
      ▼
┌─────────────┐   iterLinesSync → skip(1) → enumerate → map(parseRow)
│  Stage 1:   │   Each line becomes Result<SaleRecord, ParseError>
│  Parse      │
└──────┬──────┘
       │
       ▼
┌─────────────┐   partition(r => r.isOk())
│  Stage 2:   │   → valid SaleRecord[] + ParseError[]
│  Partition   │
└──────┬──────┘
       │
       ▼
┌─────────────┐   fold(EMPTY_AGGREGATION, aggregateSale)
│  Stage 3:   │   Single pass computes all breakdowns
│  Aggregate   │
└──────┬──────┘
       │
       ▼
┌─────────────┐   chain() composing section iterators
│  Stage 4:   │   take(5) for top products, all/any for quality
│  Report     │   collect().join('\n') as terminal
└─────────────┘
```

## Data

`sales_data.csv` contains 32 data rows (30 valid + 2 malformed):

- **3 categories**: Electronics, Clothing, Food
- **4 regions**: North, South, East, West
- **10 products**: Laptop, Smartphone, Tablet, Headphones, T-Shirt, Jeans, Jacket, Rice (5kg), Olive Oil, Pasta
- **2 bad rows**: one with `bad_qty` (non-numeric quantity), one with an empty product name

Both bad rows produce parse errors that are collected and reported — not thrown.

## Key Differences

### File reading & header skip

```typescript
// Rust-like: Result-based, lazy skip
const lines = iterLinesSync(csvFile).unwrap();
const parsed = lines.skip(1).enumerate().map(...)

// Idiomatic: try/catch, eager copy
const content = fs.readFileSync(csvFile, 'utf-8');
const dataLines = content.split('\n').slice(1);
```

### Error handling

```typescript
// Rust-like: Result<SaleRecord, ParseError>
const [valid, errors] = iter(parsed).partition((r) => r.isOk());
const sales = iter(valid)
  .map((r) => r.unwrap())
  .collect();

// Idiomatic: null + manual push
if ("sale" in result) {
  sales.push(result.sale);
} else {
  errors.push(result.error);
}
```

### Aggregation

```typescript
// Rust-like: immutable fold
const agg = iter(sales).fold(EMPTY_AGGREGATION, aggregateSale);

// Idiomatic: mutable for-loop
let totalRevenue = 0;
for (const sale of sales) {
  totalRevenue += sale.revenue; /* ... */
}
```

### Report composition

```typescript
// Rust-like: chain() composing lazy section iterators
return header
  .chain(summary)
  .chain(categories)
  .chain(regions)
  .chain(products)
  .chain(quality)
  .collect()
  .join("\n");

// Idiomatic: push into mutable array
lines.push("=== Sales Report ===");
lines.push(...categoryLines);
return lines.join("\n");
```

## Output

Both implementations produce identical output:

```
=== Sales Report ===

Summary:
  Records processed: 30
  Total revenue:     $41,296.46
  Total units sold:  604
  Highest single sale: Smartphone ($4,899.93)

Revenue by Category:
  Electronics    $28,649.31  (69 units)
  Clothing        $9,448.40  (160 units)
  Food            $3,198.75  (375 units)

Revenue by Region:
  South          $12,218.61  (139 units)
  North          $11,936.19  (131 units)
  East           $10,421.08  (142 units)
  West            $6,720.58  (192 units)

Top 5 Products by Revenue:
  Smartphone       $10,499.85  (15 units)
  Laptop            $8,999.91  (9 units)
  Tablet            $6,749.85  (15 units)
  Jacket            $3,899.70  (30 units)
  Jeans             $3,299.45  (55 units)

Data Quality:
  All products have positive revenue: YES
  Any product with 100+ units: YES
  Category totals match: YES

  Parse warnings (2):
    Line 17: Invalid quantity: "bad_qty"
    Line 23: Empty product name
```

## Trade-offs

**Rust-like approach:**

- Explicit error handling — parse failures are values, not exceptions
- Declarative pipeline composition with `.chain()`
- Single-pass aggregation via `.fold()` is naturally immutable
- More verbose for simple operations

**Idiomatic approach:**

- Familiar to most TypeScript developers
- Less ceremony for simple operations
- Mutable aggregation is straightforward and efficient
- Multiple passes through data (less efficient for large files)
