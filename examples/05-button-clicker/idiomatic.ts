// Idiomatic TypeScript version — mutable state, classes, exceptions, null

type ClickRecord = { count: number; timestamp: number };

class Clicker {
  private count = 0;
  private history: ClickRecord[] = [];
  private maxClicks: number;
  private maxHistory: number;

  constructor(maxClicks = 200, maxHistory = 10) {
    this.maxClicks = maxClicks;
    this.maxHistory = maxHistory;
  }

  click(): void {
    this.addClicks(1);
  }

  multiClick(amount: number): void {
    if (amount <= 0) throw new Error(`Invalid click amount: ${amount}`);
    this.addClicks(amount);
  }

  private addClicks(n: number): void {
    if (this.count + n > this.maxClicks) {
      throw new Error(`Click limit of ${this.maxClicks} reached (current: ${this.count})`);
    }
    if (this.count + n >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Counter overflow");
    }

    const timestamp = Date.now();
    for (let i = 1; i <= n; i++) {
      this.history.push({ count: this.count + i, timestamp });
    }
    this.count += n;

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  undo(): void {
    if (this.history.length === 0) throw new Error("Nothing to undo");
    this.history.pop();
    this.count = this.history.length > 0 ? this.history[this.history.length - 1]!.count : 0;
  }

  reset(): number {
    const previous = this.count;
    this.count = 0;
    this.history = [];
    return previous;
  }

  getCount(): number {
    return this.count;
  }

  getHistory(): ClickRecord[] {
    return [...this.history];
  }

  getClickRate(): number | null {
    if (this.history.length < 2) return null;

    const recent = this.history.slice(-5);
    const first = recent[0]!;
    const last = recent[recent.length - 1]!;
    const span = last.timestamp - first.timestamp;
    if (span === 0) return null;

    return ((recent.length - 1) / span) * 1000;
  }

  getAchievement(): string | null {
    if (this.count >= 100) return "Click Master";
    if (this.count >= 50) return "Century";
    if (this.count >= 10) return "Getting started";
    return null;
  }

  getHistoryStats(): { earliest: number; latest: number; span: string } | null {
    if (this.history.length === 0) return null;

    const timestamps = this.history.map((r) => r.timestamp);
    const earliest = Math.min(...timestamps);
    const latest = Math.max(...timestamps);
    return { earliest, latest, span: `${((latest - earliest) / 1000).toFixed(1)}s` };
  }
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

type ClickerAction =
  | { type: "click" }
  | { type: "multi_click"; amount: number }
  | { type: "reset" }
  | { type: "undo" };

function dispatchAction(clicker: Clicker, action: ClickerAction): void {
  switch (action.type) {
    case "click":
      clicker.click();
      break;
    case "multi_click":
      clicker.multiClick(action.amount);
      break;
    case "reset":
      clicker.reset();
      break;
    case "undo":
      clicker.undo();
      break;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateActions(
  clicker: Clicker,
  actions: ClickerAction[],
  delayMs: number,
): Promise<void> {
  console.log(`\nDispatching ${actions.length} actions (${delayMs}ms delay)...\n`);

  for (const action of actions) {
    try {
      dispatchAction(clicker, action);

      if (clicker.getCount() % 10 === 0 && clicker.getCount() > 0) {
        console.log(`  Click #${clicker.getCount()}`);
        const achievement = clicker.getAchievement();
        if (achievement) {
          console.log(`    Achievement unlocked: ${achievement}`);
        }
      }
    } catch (e) {
      console.error(`Simulation stopped: ${(e as Error).message}`);
      return;
    }
    await sleep(delayMs);
  }
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

console.log("=== Button Clicker Demo ===");

const clicker = new Clicker(200, 10);

// Build action sequence: 45 single clicks, then a 5x multi-click
const actions: ClickerAction[] = [
  ...Array.from({ length: 45 }, () => ({ type: "click" as const })),
  { type: "multi_click", amount: 5 },
];

await simulateActions(clicker, actions, 5);

// --- Stats ---
console.log("\nStats:");
console.log(`  Total clicks: ${clicker.getCount()}`);

const rate = clicker.getClickRate();
if (rate !== null) {
  console.log(`  Click rate: ${rate.toFixed(2)} clicks/sec`);
} else {
  console.log("  Click rate: N/A");
}

const achievement = clicker.getAchievement();
if (achievement) {
  console.log(`  Achievement: ${achievement}`);
} else {
  console.log("  Achievement: None yet");
}

const stats = clicker.getHistoryStats();
if (stats) {
  console.log(`  History span: ${stats.span}`);
}

// --- Recent history ---
console.log("\nRecent clicks:");
clicker.getHistory().forEach((record, i) => {
  console.log(`  [${i}] #${record.count} at ${new Date(record.timestamp).toISOString()}`);
});

// --- Undo ---
console.log("\nUndo last click...");
try {
  clicker.undo();
  console.log(`  Count is now ${clicker.getCount()}`);
} catch (e) {
  console.error(`  ${(e as Error).message}`);
}

// --- Undo on fresh state (error case) ---
const emptyClicker = new Clicker();
try {
  emptyClicker.undo();
} catch (e) {
  console.log(`\nUndo on fresh state: ${(e as Error).message}`);
}

// --- Bad multi-click (error case) ---
try {
  clicker.multiClick(-3);
} catch (e) {
  console.log(`Bad multi-click: ${(e as Error).message}`);
}

// --- Overflow attempt ---
try {
  clicker.multiClick(9999);
} catch (e) {
  console.log(`Overflow attempt: ${(e as Error).message}`);
}

// --- Reset ---
console.log("\nResetting counter...");
const previous = clicker.reset();
console.log(`  Reset from ${previous} to ${clicker.getCount()}`);

// --- JSON round-trip ---
console.log("\nSerialize/deserialize state with try/catch:");
try {
  const json = JSON.stringify({
    count: clicker.getCount(),
    history: clicker.getHistory(),
  });
  const parsed = JSON.parse(json);
  console.log(`  Round-trip OK — count: ${parsed.count}, history length: ${parsed.history.length}`);
} catch (e) {
  console.error(`  Serialization failed: ${(e as Error).message}`);
}

export {};
