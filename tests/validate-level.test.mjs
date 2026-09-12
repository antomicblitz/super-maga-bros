// Behavioral tests for the game's level-data contract (run with plain `node`).
// Exercises scripts/check-level.mjs validateRoot() — the CI-side twin of
// game.js resolveLevelRoot()/isValidLevel(). Red/green evidence for H2:
// a structurally-drifted level.json must be rejected here and fall back at runtime.
// The runtime tests below load the real validators out of game.js so the two
// twins cannot silently drift apart (CLAUDE.md schema-sync rule).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateRoot } from "../scripts/check-level.mjs";

let passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log(`ok - ${name}`); }
  catch (e) { console.error(`FAIL - ${name}\n  ${e.message}`); process.exitCode = 1; }
};

const goodLevel = (over = {}) => ({
  name: "L", playerStart: [80, 400],
  ground: [[0, 20]], platforms: [[3, 200, 2]], food: [[100, 300, 0]],
  enemies: [[500, 400, 700, 1]], powerups: [[250, 350, 2]], flagX: 900, ...over,
});

// Pull the browser-side validators out of game.js. This is the only way to
// exercise them under plain node without a bundler; it fails loudly if the
// extraction markers move, which is the desired signal to update this test.
function loadRuntimeValidators() {
  const gamePath = join(dirname(fileURLToPath(import.meta.url)), "..", "game.js");
  const src = readFileSync(gamePath, "utf8");
  const start = src.indexOf("const FALLBACK_LEVEL = {");
  const end = src.indexOf("// \u2500\u2500 PRELOAD SCENE", start);
  if (start < 0 || end < 0) throw new Error("could not locate runtime level validators in game.js");
  return new Function(src.slice(start, end) + "\nreturn { isValidLevel, resolveLevelRoot, FALLBACK_LEVEL };")();
}

const { isValidLevel, resolveLevelRoot, FALLBACK_LEVEL } = loadRuntimeValidators();

t("accepts a valid multi-level root", () => {
  assert.deepEqual(validateRoot({ schemaVersion: 2, currentLevel: 0, levels: [goodLevel(), goodLevel({ name: "M" })] }), []);
});

t("runtime resolveLevelRoot accepts valid levels, preserves currentLevel, wraps legacy shape", () => {
  assert.equal(isValidLevel(FALLBACK_LEVEL), true);
  const root = resolveLevelRoot({ schemaVersion: 2, currentLevel: 1, levels: [goodLevel(), goodLevel({ name: "M" })] });
  assert.equal(root.levels.length, 2);
  assert.equal(root.currentLevel, 1);
  assert.equal(root.levels[0].name, "L");
  const legacy = resolveLevelRoot(goodLevel());
  assert.equal(legacy.levels.length, 1);
  assert.equal(legacy.levels[0].name, "L");
});

t("runtime validator rejects typed coordinate tuples (crash: non-numeric ground end)", () => {
  const bad = goodLevel({ ground: [[0, "1000000000"]] });
  assert.ok(validateRoot({ levels: [bad] }).length > 0, "check-level should reject the typed bound");
  assert.equal(isValidLevel(bad), false);
  assert.equal(resolveLevelRoot({ levels: [bad] }).levels[0], FALLBACK_LEVEL);
});

t("runtime validator rejects non-numeric coordinates (editor-XSS input shape)", () => {
  const bad = goodLevel({ food: [["<img src=x onerror=alert(1)>", 0, 0]] });
  assert.ok(validateRoot({ levels: [bad] }).length > 0);
  assert.equal(isValidLevel(bad), false);
  assert.equal(resolveLevelRoot({ levels: [bad] }).levels[0], FALLBACK_LEVEL);
});

t("runtime validator drops only the invalid level in a mixed root", () => {
  const bad = goodLevel({ ground: [[0, "9e9"]] });
  const root = resolveLevelRoot({ levels: [goodLevel({ name: "Keep" }), bad] });
  assert.equal(root.levels.length, 1);
  assert.equal(root.levels[0].name, "Keep");
});

t("runtime validator agrees with validateRoot on accepted/rejected levels", () => {
  const corpus = [
    goodLevel(),
    goodLevel({ ground: [[0, 20]], platforms: [[3, 200, 2]] }),
    goodLevel({ food: [["x", 0, 0]] }),
    goodLevel({ enemies: [[1, 0, 2, 9]] }),
    goodLevel({ powerups: [[1, 2, 7]] }),
    goodLevel({ flagX: "900" }),
    goodLevel({ platforms: [[3, 200, 0]] }),
    goodLevel({ ground: [[10, 4]] }),
    goodLevel({ playerStart: [80] }),
    { name: "NoGround", playerStart: [80, 400], flagX: 900 },
  ];
  for (const lv of corpus) {
    const ciAccepts = validateRoot({ levels: [lv] }).length === 0;
    assert.equal(isValidLevel(lv), ciAccepts, `runtime/CI verdicts diverged for ${JSON.stringify(lv)}`);
  }
});

t("rejects non-object roots", () => {
  for (const bad of [null, undefined, 42, "x", []]) {
    assert.ok(validateRoot(bad).length > 0, `expected rejection of ${JSON.stringify(bad)}`);
  }
});

t("rejects a level missing its ground array (the runtime crash shape)", () => {
  const errs = validateRoot({ levels: [{ name: "Broken", playerStart: [80, 400], flagX: 500 }] });
  assert.ok(errs.some((e) => e.includes("ground")), `errors were: ${errs}`);
});

t("rejects wrong-arity tuples instead of letting the game silently drop them", () => {
  const errs = validateRoot({ levels: [goodLevel({ platforms: [[3, 200]] })] });
  assert.ok(errs.some((e) => e.includes("platforms[0]")), `errors were: ${errs}`);
});

t("rejects non-numeric coordinates (the editor-XSS input shape)", () => {
  const errs = validateRoot({ levels: [goodLevel({ food: [["<img src=x onerror=alert(1)>", 0, 0]] })] });
  assert.ok(errs.some((e) => e.includes("food[0]")), `errors were: ${errs}`);
});

t("rejects out-of-range enemy/powerup type indices", () => {
  assert.ok(validateRoot({ levels: [goodLevel({ enemies: [[1, 0, 2, 9]] })] }).length > 0);
  assert.ok(validateRoot({ levels: [goodLevel({ powerups: [[1, 2, 7]] })] }).length > 0);
});

t("rejects inverted ground spans (start > end)", () => {
  assert.ok(validateRoot({ levels: [goodLevel({ ground: [[10, 4]] })] }).length > 0);
});

t("rejects zero/negative platform widths", () => {
  assert.ok(validateRoot({ levels: [goodLevel({ platforms: [[3, 200, 0]] })] }).length > 0);
});

t("flags a schemaVersion other than 2 instead of passing it silently", () => {
  const errs = validateRoot({ schemaVersion: 3, levels: [goodLevel()] });
  assert.ok(errs.some((e) => e.includes("schemaVersion")), `errors were: ${errs}`);
});

t("rejects an empty levels array (game would have nothing to play)", () => {
  assert.ok(validateRoot({ schemaVersion: 2, levels: [] }).some((e) => e.includes("levels")));
});

console.log(`\n${passed} test(s) passed${process.exitCode ? " — WITH FAILURES" : ""}`);
