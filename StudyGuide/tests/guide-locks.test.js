const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

test("protected guide pages receive the manual-lock controller at delivery", () => {
  const source = fs.readFileSync(path.join(root, "api", "serve-page.js"), "utf8");
  assert.match(source, /guide-locks\.js/);
  assert.match(source, /withManualLocks/);
  assert.match(source, /PROTECTED_PAGES/);
  assert.match(source, /if \(!isPro\)/);
});

test("manual-lock controller keeps eight cards per section free and defaults the rest locked", () => {
  const source = fs.readFileSync(path.join(root, "guide-locks.js"), "utf8");
  assert.match(source, /FREE_ITEMS_PER_SECTION = 8/);
  assert.match(source, /index < FREE_ITEMS_PER_SECTION/);
  assert.match(source, /Locked concept/);
  assert.match(source, /Unlock this item/);
  assert.match(source, /Unlock all remaining/);
  assert.match(source, /Lock all again/);
  assert.match(source, /result\.access\?\.isAdmin === true/);
});
