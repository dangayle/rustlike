#!/usr/bin/env node
// Open a release PR. After merge, a workflow creates the signed tag and CI publishes.
// Usage: node scripts/release.mjs <patch|minor|major|x.y.z>

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const root = resolve(import.meta.dirname, "..");
const pkgPaths = [
  resolve(root, "package.json"),
  resolve(root, "packages/eslint-plugin-rustlike/package.json"),
];

const bump = (current, kind) => {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [maj, min, pat] = current.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  if (kind === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Unknown bump: ${kind}`);
};

const run = (cmd, opts = {}) =>
  execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "inherit"], ...opts });

const status = run("git status --porcelain");
if (status.trim()) {
  console.error("Working tree not clean. Commit or stash first.");
  process.exit(1);
}

const branch = run("git rev-parse --abbrev-ref HEAD").trim();
if (branch !== "main") {
  console.error(`Must be on main. Currently on: ${branch}`);
  process.exit(1);
}

run("git fetch origin");
run("git pull --ff-only origin main", { stdio: "inherit" });

const pkgs = pkgPaths.map((p) => ({ path: p, json: JSON.parse(readFileSync(p, "utf8")) }));
const currentVersion = pkgs[0].json.version;
const nextVersion = bump(currentVersion, arg);
const releaseBranch = `release/v${nextVersion}`;

console.log(`Releasing ${currentVersion} -> ${nextVersion} on ${releaseBranch}`);

run(`git checkout -b ${releaseBranch}`, { stdio: "inherit" });

for (const { path, json } of pkgs) {
  json.version = nextVersion;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}
run("pnpm fmt", { stdio: "inherit" });

run("git add -A", { stdio: "inherit" });
run(`git commit -S -m "Release v${nextVersion}"`, { stdio: "inherit" });
run(`git push -u origin ${releaseBranch}`, { stdio: "inherit" });

run(
  `gh pr create --base main --head ${releaseBranch} ` +
    `--title "Release v${nextVersion}" ` +
    `--body "Bumps both packages to v${nextVersion}. Merging will trigger the tag-and-publish workflow."`,
  { stdio: "inherit" },
);

run("git checkout main", { stdio: "inherit" });

console.log(
  `\nRelease PR opened. After CI passes, squash-merge it. The tag-release workflow will create v${nextVersion} and trigger the publish workflow.`,
);
