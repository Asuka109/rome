/**
 * Off-system border-radius values predating the gate in
 * `check-radius-values.mjs`. A quarantine list, not an exception list: nothing
 * here is blessed. Adding an entry takes an edit a reviewer sees, and a fixed
 * value left listed fails the test, so the list can't outlive the debt.
 *
 * The one entry is the dev gallery's specimen of the legacy shadcn
 * `--radius-{sm..xl}` contract — it renders the ladder it documents. Retiring
 * the specimen is the legacy ladder migration's decision, not this gate's.
 */
export const BASELINE = {
  "packages/web/src/pages/dev/gallery/sections/foundations.tsx": [
    "borderRadius: `var(--radius-${r",
  ],
};

export const baselineKeys = new Set(
  Object.entries(BASELINE).flatMap(([file, values]) =>
    values.map((value) => `${file} :: ${value}`),
  ),
);
