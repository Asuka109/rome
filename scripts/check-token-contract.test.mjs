import assert from "node:assert/strict";
import test from "node:test";
import {
  closeOverAliases,
  collectAliases,
  compareTokenContract,
  findInheritedTokens,
  formatContractMismatch,
  readInheritedTokens,
} from "./check-token-contract.mjs";

test("keeps every target when host selectors redefine an alias", () => {
  const aliases = new Map();
  collectAliases(
    {
      walkDecls(visit) {
        visit({ prop: "--primary", value: "var(--orange-300)" });
        visit({ prop: "--primary", value: "var(--neutral-50)" });
      },
    },
    aliases,
  );

  assert.deepEqual(aliases.get("--primary"), new Set(["--neutral-50", "--orange-300"]));
});

test("the inherited-token roster matches the app CSS bundle", async () => {
  const expected = await readInheritedTokens();
  const actual = await findInheritedTokens();

  assert.deepEqual(
    actual,
    expected,
    formatContractMismatch(compareTokenContract(actual, expected)),
  );
});

test("the inherited-token roster contains no kit-owned geometry or typography", async () => {
  const inherited = await readInheritedTokens();
  const kitOwned = [...inherited].filter((name) =>
    /^(?:--(?:badge|control|field)-|--rome-(?:font|radius|size|space)-|--radius(?:$|-))/.test(name),
  );

  assert.deepEqual(kitOwned, []);
});

test("closes inherited references transitively through host aliases", () => {
  const aliases = new Map([
    ["--primary", new Set(["--orange-300"])],
    ["--orange-300", new Set(["--warm-pigment"])],
  ]);

  assert.deepEqual(
    closeOverAliases(new Set(["--primary"]), aliases),
    new Set(["--orange-300", "--primary", "--warm-pigment"]),
  );
});

test("reports both directions of roster drift with the token names", () => {
  const mismatch = compareTokenContract(
    new Set(["--background", "--new-host-token"]),
    new Set(["--background", "--stale-token"]),
  );

  assert.deepEqual(mismatch, {
    missingFromRoster: ["--new-host-token"],
    absentFromBundles: ["--stale-token"],
  });
  assert.equal(
    formatContractMismatch(mismatch),
    "App bundles depend on tokens missing from INHERITED_TOKENS:\n" +
      "  --new-host-token\n\n" +
      "INHERITED_TOKENS lists tokens absent from app bundles:\n" +
      "  --stale-token",
  );
});
