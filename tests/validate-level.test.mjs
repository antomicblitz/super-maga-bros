// Behavioral tests for the game's level-data contract (run with plain `node`).
// Exercises scripts/check-level.mjs validateRoot() — the CI-side twin of
// game.js resolveLevelRoot()/isValidLevel(). Red/green evidence for H2:
// a structurally-drifted level.json must be rejected here and fall back at runtime.
import assert from "node:assert/strict";
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

t("accepts a valid multi-level root", () => {
  assert.deepEqual(validateRoot({ schemaVersion: 2, currentLevel: 0, levels: [goodLevel(), goodLevel({ name: "M" })] }), []);
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
