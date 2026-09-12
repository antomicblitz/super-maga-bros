// Validates level.json against the schema emitted by editor.html serializeRoot()
// and consumed by game.js GameScene.create(). Used by `npm run check:level` and CI.
// Contract (CLAUDE.md "Level JSON Schema"): schemaVersion 2, multi-level root
// with per-level tuples of fixed arity and bounded type indices.
import { readFileSync } from "node:fs";

const isInt = (v) => Number.isInteger(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function checkLevel(level, i, errors) {
  const at = `levels[${i}]${level && level.name ? ` "${level.name}"` : ""}`;
  if (!level || typeof level !== "object" || Array.isArray(level)) {
    errors.push(`${at}: must be an object`);
    return;
  }
  if (level.name !== undefined && typeof level.name !== "string") {
    errors.push(`${at}.name: must be a string`);
  }
  // game.js GameScene.create() forEach()es these arrays unconditionally,
  // so they are required (editor serializeRoot always writes them).
  const tuples = [
    ["ground", 2, (t) => isInt(t[0]) && isInt(t[1]) && t[0] <= t[1]],
    ["platforms", 3, (t) => isInt(t[0]) && isNum(t[1]) && isInt(t[2]) && t[2] >= 1],
    ["food", 3, (t) => isNum(t[0]) && isNum(t[1]) && [0, 1].includes(t[2])],
    ["enemies", 4, (t) => isNum(t[0]) && isNum(t[1]) && isNum(t[2]) && [0, 1, 2, 3].includes(t[3])],
    ["powerups", 3, (t) => isNum(t[0]) && isNum(t[1]) && [0, 1, 2].includes(t[2])],
  ];
  for (const [field, arity, pred] of tuples) {
    const arr = level[field];
    if (!Array.isArray(arr)) {
      errors.push(`${at}.${field}: must be an array`);
      continue;
    }
    arr.forEach((t, j) => {
      if (!Array.isArray(t) || t.length < arity || !pred(t)) {
        errors.push(`${at}.${field}[${j}]: expected ${arity}-tuple with valid values, got ${JSON.stringify(t)}`);
      }
    });
  }
  if (level.playerStart !== undefined) {
    const p = level.playerStart;
    if (!Array.isArray(p) || p.length < 2 || !isNum(p[0]) || !isNum(p[1])) {
      errors.push(`${at}.playerStart: expected [x, y] numbers, got ${JSON.stringify(p)}`);
    }
  }
  if (level.flagX !== undefined && !isNum(level.flagX)) {
    errors.push(`${at}.flagX: expected a number, got ${JSON.stringify(level.flagX)}`);
  }
}

export function validateRoot(root) {
  const errs = [];
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return ["root: must be a JSON object"];
  }
  if (root.schemaVersion !== undefined && root.schemaVersion !== 2) {
    errs.push(`schemaVersion: expected 2, got ${JSON.stringify(root.schemaVersion)}`);
  }
  if (!Array.isArray(root.levels) || root.levels.length === 0) {
    errs.push("levels: must be a non-empty array");
  } else {
    root.levels.forEach((lvl, i) => checkLevel(lvl, i, errs));
  }
  if (root.currentLevel !== undefined && (!isInt(root.currentLevel) || root.currentLevel < 0)) {
    errs.push(`currentLevel: expected a non-negative integer, got ${JSON.stringify(root.currentLevel)}`);
  }
  return errs;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("check-level.mjs")) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/check-level.mjs <level.json>");
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`${file}: invalid JSON: ${e.message}`);
    process.exit(1);
  }
  const found = validateRoot(parsed);
  if (found.length) {
    for (const e of found) console.error(`${file}: ${e}`);
    process.exit(1);
  }
  console.log(`${file}: OK (${parsed.levels.length} level(s))`);
}
