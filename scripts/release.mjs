#!/usr/bin/env node
// Bump version in both packages, commit, tag, push.
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

const status = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
if (status.trim()) {
  console.error("Working tree not clean. Commit or stash first.");
  process.exit(1);
}

const pkgs = pkgPaths.map((p) => ({ path: p, json: JSON.parse(readFileSync(p, "utf8")) }));
const currentVersion = pkgs[0].json.version;
const nextVersion = bump(currentVersion, arg);

console.log(`${currentVersion} -> ${nextVersion}`);

for (const { path, json } of pkgs) {
  json.version = nextVersion;
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`  bumped ${path.replace(`${root}/`, "")}`);
}

execSync(`git add -A`, { cwd: root, stdio: "inherit" });
execSync(`git commit -S -m "Release v${nextVersion}"`, { cwd: root, stdio: "inherit" });
execSync(`git tag -s v${nextVersion} -m "v${nextVersion}"`, { cwd: root, stdio: "inherit" });
execSync(`git push --follow-tags`, { cwd: root, stdio: "inherit" });

console.log(`\nReleased v${nextVersion}. CI will publish to npm.`);
