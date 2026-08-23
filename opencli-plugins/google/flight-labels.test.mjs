import assert from "node:assert/strict";
import test from "node:test";
import { matchFlightPrice } from "./flight-labels.mjs";

const fixtures = [
  ["From 117 US dollars round trip total.", "117"],
  ["From $123 round trip total.", "123"],
  ["From US$1,234 one way total.", "1,234"],
  ["From €98 one way total.", "98"],
];

for (const [label, expected] of fixtures) {
  test(`extracts the numeric price from ${label}`, () => {
    assert.equal(matchFlightPrice(label)?.[1], expected);
  });
}

test("does not match an aria label without a From price", () => {
  assert.equal(matchFlightPrice("Select flight"), null);
});
