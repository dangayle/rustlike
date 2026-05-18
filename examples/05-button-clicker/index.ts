import {
  Result,
  Ok,
  Err,
  Option,
  Some,
  None,
  matchType,
  tryCatch,
  iter,
  Iter,
  type DeepReadonly,
} from "rustlike";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type ClickRecord = DeepReadonly<{ count: number; timestamp: number }>;

type ClickerState = DeepReadonly<{
  count: number;
  history: ClickRecord[];
  maxClicks: number;
  maxHistory: number;
}>;

// Discriminated union for all actions the clicker can handle
type ClickerAction =
  | { type: "click" }
  | { type: "multi_click"; amount: number }
  | { type: "reset" }
  | { type: "undo" };

type ClickerError =
  | { type: "overflow"; max: number }
  | { type: "invalid_amount"; amount: number }
  | { type: "limit_reached"; limit: number; current: number }
  | { type: "nothing_to_undo" };

// ---------------------------------------------------------------------------
// State constructor
// ---------------------------------------------------------------------------

function createState(maxClicks = 200, maxHistory = 10): ClickerState {
  return { count: 0, history: [], maxClicks, maxHistory };
}

// ---------------------------------------------------------------------------
// Error formatting — chained method style
// ---------------------------------------------------------------------------

function formatError(error: ClickerError): string {
  return matchType(error, {
    overflow: (e: { type: "overflow"; max: number }) =>
      `Counter overflow — max safe value is ${e.max}`,
    invalid_amount: (e: { type: "invalid_amount"; amount: number }) =>
      `Invalid click amount: ${e.amount} (must be > 0)`,
    limit_reached: (e: { type: "limit_reached"; limit: number; current: number }) =>
      `Click limit of ${e.limit} reached (current: ${e.current})`,
    nothing_to_undo: () => "Nothing to undo — history is empty",
  });
}

// ---------------------------------------------------------------------------
// Pure state transitions — each returns Result<ClickerState, ClickerError>
// ---------------------------------------------------------------------------

function addClicks(state: ClickerState, n: number): Result<ClickerState, ClickerError> {
  if (n <= 0) {
    return Err({ type: "invalid_amount", amount: n });
  }
  if (state.count + n > state.maxClicks) {
    return Err({ type: "limit_reached", limit: state.maxClicks, current: state.count });
  }
  if (state.count + n >= Number.MAX_SAFE_INTEGER) {
    return Err({ type: "overflow", max: Number.MAX_SAFE_INTEGER - 1 });
  }

  const timestamp = Date.now();

  // Build new history entries with iter — one record per click
  const newRecords: ClickRecord[] = Iter.range(1, n + 1)
    .map((i) => ({ count: state.count + i, timestamp }))
    .collect();

  // Merge old + new history, keep only the last maxHistory items
  const trimmedHistory = iter([...state.history, ...newRecords])
    .skip(Math.max(0, state.history.length + newRecords.length - state.maxHistory))
    .collect();

  return Ok({
    ...state,
    count: state.count + n,
    history: trimmedHistory,
  });
}

function undo(state: ClickerState): Result<ClickerState, ClickerError> {
  return iter(state.history)
    .last() // Option<ClickRecord>
    .okOr({ type: "nothing_to_undo" as const }) // Result<ClickRecord, ClickerError>
    .map((lastRecord) => ({
      ...state,
      count: lastRecord.count - 1,
      history: state.history.slice(0, -1),
    }));
}

function reset(
  state: ClickerState,
): Result<{ state: ClickerState; previous: number }, ClickerError> {
  return Ok({ state: { ...state, count: 0, history: [] }, previous: state.count });
}

// ---------------------------------------------------------------------------
// Dispatch — exhaustive matching on the action union
// ---------------------------------------------------------------------------

function dispatch(state: ClickerState, action: ClickerAction): Result<ClickerState, ClickerError> {
  return matchType(action, {
    click: () => addClicks(state, 1),
    multi_click: (a: { type: "multi_click"; amount: number }) => addClicks(state, a.amount),
    reset: () => reset(state).map((r) => r.state),
    undo: () => undo(state),
  });
}

// ---------------------------------------------------------------------------
// Analytics — lazy iterator pipelines over history
// ---------------------------------------------------------------------------

function getClickRate(state: ClickerState): Option<string> {
  const recent = iter(state.history).collect().slice(-5);

  return Option.from(recent.length >= 2 ? recent : undefined).andThen((records) => {
    const first = records[0]!;
    const last = records[records.length - 1]!;
    const span = last.timestamp - first.timestamp;
    return span > 0 ? Some((((records.length - 1) / span) * 1000).toFixed(2)) : None;
  });
}

type Achievement = { name: string; threshold: number };

const ACHIEVEMENTS: Achievement[] = [
  { name: "Click Master", threshold: 100 },
  { name: "Century", threshold: 50 },
  { name: "Getting started", threshold: 10 },
];

function getAchievement(state: ClickerState): Option<string> {
  return iter(ACHIEVEMENTS)
    .find((a) => state.count >= a.threshold)
    .map((a) => a.name);
}

function getHistoryStats(
  state: ClickerState,
): Option<{ earliest: number; latest: number; span: string }> {
  const timestamps = iter(state.history).map((r) => r.timestamp);

  // Use zip to pair min and max, both are Option<number>
  return Iter.min(iter(state.history).map((r) => r.timestamp))
    .zip(Iter.max(timestamps))
    .map(([earliest, latest]) => ({
      earliest,
      latest,
      span: `${((latest - earliest) / 1000).toFixed(1)}s`,
    }));
}

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulateActions(
  initial: ClickerState,
  actions: ClickerAction[],
  delayMs: number,
): Promise<Result<ClickerState, ClickerError>> {
  console.log(`\nDispatching ${actions.length} actions (${delayMs}ms delay)...\n`);

  // Use tryFold to thread state through each action, short-circuiting on error
  let state = initial;
  for (const action of actions) {
    const result = dispatch(state, action).inspect((s) => {
      if (s.count % 10 === 0 && s.count > 0) {
        console.log(`  Click #${s.count}`);
        getAchievement(s).inspect((a) => console.log(`    Achievement unlocked: ${a}`));
      }
    });

    if (result.isErr()) return result;
    state = result.value;
    await sleep(delayMs);
  }

  return Ok(state);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

console.log("=== Button Clicker Demo ===");

let state = createState(200, 10);

// Build an action sequence: 45 single clicks, then a 5x multi-click
const actions: ClickerAction[] = [
  ...Iter.repeat({ type: "click" as const }, 45).collect(),
  { type: "multi_click", amount: 5 },
];

// Run the simulation — the whole thing is a Result pipeline
const simResult = await simulateActions(state, actions, 5);

state = simResult.match({
  ok: (s) => s,
  err: (e) => {
    console.error(`Simulation stopped: ${formatError(e)}`);
    return state;
  },
});

// --- Stats (chained Option methods instead of if/else) ---
console.log("\nStats:");
console.log(`  Total clicks: ${state.count}`);

getClickRate(state)
  .map((rate) => `  Click rate: ${rate} clicks/sec`)
  .match({
    some: (msg) => console.log(msg),
    none: () => console.log("  Click rate: N/A"),
  });

getAchievement(state)
  .map((a) => `  Achievement: ${a}`)
  .match({
    some: (msg) => console.log(msg),
    none: () => console.log("  Achievement: None yet"),
  });

getHistoryStats(state).inspect((s) => console.log(`  History span: ${s.span}`));

// --- Recent history via iter ---
console.log("\nRecent clicks:");
iter(state.history)
  .enumerate()
  .forEach(([i, record]) =>
    console.log(`  [${i}] #${record.count} at ${new Date(record.timestamp).toISOString()}`),
  );

// --- Undo demo ---
console.log("\nUndo last click...");
state = dispatch(state, { type: "undo" }).match({
  ok: (s) => {
    console.log(`  Count is now ${s.count}`);
    return s;
  },
  err: (e) => {
    console.error(`  ${formatError(e)}`);
    return state;
  },
});

// --- Undo past empty history (error case) ---
const emptyState = createState();
dispatch(emptyState, { type: "undo" }).inspectErr((e) =>
  console.log(`\nUndo on fresh state: ${formatError(e)}`),
);

// --- Multi-click validation (error case) ---
dispatch(state, { type: "multi_click", amount: -3 }).inspectErr((e) =>
  console.log(`Bad multi-click: ${formatError(e)}`),
);

// --- Overflow demo: try to exceed maxClicks ---
dispatch(state, { type: "multi_click", amount: 9999 }).inspectErr((e) =>
  console.log(`Overflow attempt: ${formatError(e)}`),
);

// --- Reset ---
console.log("\nResetting counter...");
reset(state).match({
  ok: ({ state: s, previous }) => {
    console.log(`  Reset from ${previous} to ${s.count}`);
    state = s;
  },
  err: (e) => console.error(`  ${formatError(e)}`),
});

// --- tryCatch demo: safe JSON round-trip of state ---
console.log("\nSerialize/deserialize state with tryCatch:");
const serialized = tryCatch<string, Error>(() => JSON.stringify(state));
serialized
  .andThen((json) => tryCatch<ClickerState, Error>(() => JSON.parse(json)))
  .map(
    (parsed) =>
      `  Round-trip OK — count: ${parsed.count}, history length: ${parsed.history.length}`,
  )
  .match({
    ok: (msg) => console.log(msg),
    err: (e) => console.error(`  Serialization failed: ${e.message}`),
  });
