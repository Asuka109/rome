# UX Audit Rule Catalog

Each rule: **id · tier · severity · definition · detection · exceptions · examples**.

The exceptions list is normative. A candidate matching any exception is a **pass**. When judging Tier 3 rules, treat the examples as the rubric — analogize to them rather than reasoning from the rule name.

Tier meanings:
- **Tier 1 — mechanical**: decidable from code structure. High confidence. Severity `block` unless noted.
- **Tier 2 — semantic**: requires resolving that two pieces of code denote the same datum/operation/concept. High confidence once resolution is done. Severity `block` or `warn` as noted.
- **Tier 3 — judged**: requires understanding intent or outcome. Severity `warn`. Always cite evidence and state confidence.
- **Experimental**: off by default; run only if the user asks for the extended ruleset.

---

## Tier 1 — Mechanical

### single-source-of-truth (T1, block)

**Definition**: The same semantic datum must not be rendered in two slots at the same hierarchy level within one view.

**Detection**: From the data-slot inventory, find two slots bound to the same underlying datum (same variable/field, or trivially derived: `total` vs `formatCurrency(total)`). Flag if both slots are at the same hierarchy level (siblings in the perceived layout — e.g., two cards in one grid, two rows in one panel).

**Exceptions**:
1. **Modality redundancy**: icon + text label for the same concept; color + text for the same status. (Required by color-not-sole-channel — never flag its fix.)
2. **Zoom levels**: summary → detail (a total in a header and the line items that compose it; a truncated preview and its full view behind interaction).
3. **Orientation anchors**: page title ↔ breadcrumb tail; selected item highlighted in a list ↔ shown in a detail pane (master-detail).
4. **Confirmation echo**: a value re-displayed inside a confirmation dialog for the action that affects it.
5. **Sticky/fixed mirrors**: a value repeated in a sticky header/footer that substitutes for the original when it scrolls out of view.

**Violation**:
```jsx
<Card><Stat label="Open tickets" value={stats.open} /></Card>
<Card><Stat label="Tickets open" value={stats.open} /></Card>   // same datum, sibling cards
```
**Pass** (zoom levels):
```jsx
<Header total={order.total} />
<LineItems items={order.items} />   // items sum to total; different zoom level
```

---

### one-primary-action (T1, block)

**Definition**: Exactly one visually primary CTA per view/dialog. Zero is allowed for read-only views.

**Detection**: Count elements with the primary visual treatment in the rendered view: `variant="primary"`, `variant="default"` where that is the emphasized style (shadcn), filled/accent buttons, or ad-hoc styling equivalent to primary (accent background + high contrast). Flag if count > 1. Trace composition: a form's submit button plus a page-level primary CTA rendered together is a violation even if they live in different files.

**Exceptions**:
1. **Repeated identical action**: the same action rendered per-item in a list/table (e.g., "Add" on each search result) counts as one action.
2. **Split button**: a primary action with an attached dropdown of variants of that same action.
3. **Wizard nav**: "Next"/"Continue" is the single primary; "Back" must be secondary — flag if both are primary.
4. **Genuinely parallel workflows** on a deliberate chooser screen ("Create new" vs "Import existing" as the entire view's purpose) — pass only when choosing is the view's whole job.

**Violation**:
```jsx
<Button variant="primary">Save draft</Button>
<Button variant="primary">Publish</Button>
```
**Pass**:
```jsx
<Button variant="secondary">Save draft</Button>
<Button variant="primary">Publish</Button>
```

---

### state-completeness (T1, block)

**Definition**: Any component rendering async data must handle **loading**, **empty**, and **error** branches.

**Detection**: For each async data source (fetch/query hook/suspense boundary/prop documented as async), check the code paths: is there a rendered branch for pending, for success-with-empty-payload, and for failure? Absence of a branch = violation. An error branch that renders nothing (`if (error) return null`) is a violation of this rule (and see error-recovery-path for the quality of the branch).

**Exceptions**:
1. **Guaranteed-nonempty sources**: data that is statically known to exist (config baked at build time, current-user object behind an auth gate).
2. **Delegated handling**: an ancestor error boundary / suspense fallback that demonstrably covers this component — cite the ancestor when passing on this ground.
3. **Optimistic-only widgets**: fire-and-forget mutations with no read path (e.g., an analytics beacon) need no empty state.
4. **Empty state inapplicable**: scalar data that cannot be "empty" (a count renders 0; 0 is the empty state).

**Violation**:
```jsx
const { data } = useQuery(ordersQuery);
return <Table rows={data.orders} />;   // no loading, no empty, no error branch
```
**Pass**:
```jsx
if (isLoading) return <TableSkeleton />;
if (error) return <ErrorPanel retry={refetch} />;
if (!data.orders.length) return <EmptyOrders cta="Create your first order" />;
return <Table rows={data.orders} />;
```

---

### color-not-sole-channel (T1, block)  — WCAG 1.4.1

**Definition**: Status conveyed by color must have a text or icon co-channel.

**Detection**: From the status-indicator inventory, find indicators whose only distinguishing channel is color: colored dots without labels or accessible names, text whose only status signal is its color class, chart series distinguished solely by hue. Flag each.

**Exceptions**:
1. **Redundant instance**: color-only indicator immediately adjacent to a text/icon element carrying the same status (the pair is the indicator).
2. **Accessible name present**: `aria-label`/`title`/visually-hidden text conveying the status counts as a text channel.
3. **Decorative color** that encodes nothing (brand accents, zebra striping).

**Violation**:
```jsx
<span className={status === "failed" ? "text-red-500" : "text-green-500"}>
  {job.name}
</span>
```
**Pass**:
```jsx
<span className={statusColor(status)}>
  <StatusIcon status={status} /> {job.name} — {statusLabel(status)}
</span>
```

---

### focus-initial-attention (T1, warn)

**Definition**: Every interactive view declares one initial focus target; forms focus their first field; dialogs focus their first interactive element (or the least-destructive action for confirmation dialogs).

**Detection**: For forms and dialogs, look for `autoFocus`, `initialFocus`, focus-on-mount effects, or a dialog library's default focus behavior. Flag forms/dialogs with no discernible focus target, or with initial focus on a destructive action.

**Exceptions**:
1. **Library defaults**: Radix/HeadlessUI/native `<dialog>` focus the first focusable element by default — pass unless that default is overridden badly or lands on a destructive control.
2. **Read-only views**: no interaction, no focus target needed.
3. **Search-dominant views** focusing the search box rather than the literal first element.

**Severity note**: `warn`, because focus behavior often lives in library defaults invisible in app code — confidence is inherently lower. State what you could not verify.

---

### emphasis-budget (T1, block)

**Definition**: Visual emphasis is a budget. Per view: at most 1 primary-emphasis element (covered by one-primary-action for CTAs), and heavy-emphasis treatments (accent-colored, bolded-and-enlarged, badged "NEW", pulsing/animated) applied to at most ~10% of visible elements. When everything is emphasized, nothing is.

**Detection**: Count elements with emphasis treatments (accent backgrounds, `font-bold` on non-heading body content, attention animations, badges) against total visible elements in the view. Flag when heavy emphasis is applied broadly (rule of thumb: >3 heavy-emphasis elements or >10% of elements, whichever is larger).

**Exceptions**:
1. **Structural typography**: headings, section titles — hierarchy, not emphasis.
2. **Data-driven emphasis**: highlighting rows that meet a user-chosen condition (filter matches, search hits) — emphasis count scales with data legitimately.
3. **Status colors** on data (a column of pass/fail badges in a table) — that is data encoding, not attention-grabbing.

**Violation**:
```jsx
<Alert variant="warning">Trial ends soon!</Alert>
<Banner variant="accent">New: dark mode!</Banner>
<Badge pulse>3 unread</Badge>
<Button variant="primary">Upgrade</Button>
<Callout variant="info" bold>Tip of the day…</Callout>   // five competing emphases
```

---

## Tier 2 — Semantic

### consistent-terminology (T2, block)  — Nielsen #4

**Definition**: One concept, one name, across all views in scope. The same operation must not be labeled "Delete" here, "Remove" there, and "Discard" elsewhere; the same entity must not be "workspace" on one screen and "project" on another.

**Detection**: Build a lexicon from the action inventory across all audited views: map each operation/entity (resolved by what the code actually does — handler identity, mutation called, entity type) to the set of user-facing strings naming it. Flag any operation/entity with >1 name. This is cross-view: run after all views are inventoried.

**Exceptions**:
1. **Genuinely different operations** that look similar: "Remove" (from this list, item survives) vs "Delete" (destroy the item) are *correctly* different words — verify via the handlers before flagging.
2. **Contextual shortening**: "Delete project" in a menu vs "Delete" on the confirm button of the same flow.
3. **Platform conventions**: OS-mandated labels in native menus.

**Violation**: Toolbar button "Remove", context menu "Delete", confirmation "Discard item?" — all calling `deleteItem(id)`.

---

### consequence-proximity (T2, warn)

**Definition**: The consequences of an action ("this will notify 3 people", "this cannot be undone", "you will be charged $29") must be rendered adjacent to the trigger — in the same dialog/button-group/form section — not in distant help text, tooltips on other elements, or documentation.

**Detection**: For each consequential action in the inventory (traces to mutations affecting other users, money, or irreversible state), check whether consequence information exists and where it renders relative to the trigger. Flag consequences that exist only far from the trigger, or consequential actions with no stated consequence anywhere (note which of the two cases it is).

**Exceptions**:
1. **Confirmation-step disclosure**: consequence stated in the confirmation dialog rather than next to the initiating button — the dialog is adjacent to the *decision*.
2. **Universally understood actions**: "Log out", "Cancel" need no consequence text.
3. **Progressive disclosure of details**: headline consequence adjacent, full details behind "Learn more".

---

## Tier 3 — Judged

For every Tier 3 finding, state confidence (`high`/`medium`) and, for medium, what would confirm it.

### label-outcome-clarity (T3, warn)

**Definition**: Buttons and links describe the outcome, not the mechanism. Users should predict what happens from the label alone (information scent).

**Detection**: Two passes.
1. *Mechanical blocklist*: flag "Submit", "OK", "Yes", "Click here", "Continue" (when terminal), "Go" on **consequential** actions (mutations, payments, sends). High confidence.
2. *Judged*: for remaining labels, ask: does the label name the outcome the handler produces? "Archive" on an archiving handler: pass. "Process" on a handler that emails all customers: flag.

**Exceptions**:
1. **Non-consequential navigation**: "Next"/"Continue"/"Back" inside a wizard where the step indicator provides context.
2. **Constrained space** (icon buttons) with an accessible name that names the outcome.
3. **Answering a question**: "Yes"/"No" directly under an explicit, specific question ("Delete 3 items?") — the question carries the scent. Prefer outcome verbs ("Delete 3 items"), but do not flag.

**Violation**: `<Button variant="primary" onClick={chargeAndSubscribe}>Submit</Button>` → suggest "Start subscription — $29/mo".

---

### destructive-action-safety (T3, warn)  — Nielsen #3/#5

**Definition**: Irreversible actions require undo (preferred) or confirmation. Reversible-but-costly actions deserve at least visual differentiation (destructive variant).

**Detection**: For each action whose handler deletes/overwrites/sends/charges, classify: (a) undoable in-app? (b) confirmed? (c) visually marked destructive? Flag irreversible actions with neither undo nor confirmation. Note (as `warn`, lower priority) irreversible actions that are confirmed but where undo would be cheap to offer (soft-delete already exists server-side).

**Exceptions**:
1. **Draft-scoped destruction**: discarding unsaved local state may confirm-only ("Discard changes?") or even skip confirmation when trivially recreatable.
2. **Undo present**: toast-with-undo is *better* than confirmation — never flag an undo pattern for lacking a confirm dialog.
3. **Bulk-selected then acted**: explicit selection step + labeled count ("Delete 14 items") partially serves as confirmation; still flag if irreversible with no confirm, but say the selection step was noted.

---

### error-recovery-path (T3, warn)

**Definition**: Every error state includes a next action — retry, edit-and-resubmit, contact, or navigate away. Never a dead end.

**Detection**: For each error branch found during state-completeness checking, examine what renders: message only = flag; message + actionable next step = pass. Also flag error messages that name the failure in system terms with no user-meaningful framing ("Error 500: ECONNREFUSED" alone).

**Exceptions**:
1. **Field-level validation errors** adjacent to an editable field — the field *is* the recovery path.
2. **Global boundary with app-level recovery** (a top-level error boundary offering "Reload") covering component-level errors — cite it when passing on this ground.
3. **Auto-retrying states** that display retry status ("Reconnecting…").

**Violation**: `if (error) return <p>Something went wrong.</p>;` → suggest message + `retry={refetch}` + support link for persistent failures.

---

### progressive-disclosure (T3, warn — low precision by design)

**Definition**: Advanced, rarely-used, or dangerous options should be behind a disclosure (accordion, "Advanced" section, secondary screen) rather than flattened into the primary view.

**Detection**: Flag only clear cases: a form rendering >10 fields flat where a majority are optional/advanced; danger-zone settings (delete account) inline amid routine settings with no separation.

**Precision note**: This rule has known low precision. Flag conservatively, always `warn`, confidence `medium` at best. When declining to flag a borderline case, list it under "Not flagged (borderline)".

**Exceptions**:
1. **Expert-dense tools** (dashboards, IDE-like settings) where flat density is the point.
2. **Legally/safety-required visibility** of information that must not be hidden.

---

## Experimental (run only on request)

### input-effort-budget (X, warn)
Total required inputs per task should be minimal: flag forms requiring fields the handler never uses, re-asking known information (data already in session/profile), or required-by-default fields with no validation rationale. Detection: diff form fields against handler/mutation usage.

### interruption-legitimacy (X, warn)
Modals/interrupts must be warranted by stakes: flag modal dialogs for non-blocking information (a success message as a modal instead of a toast), and interrupts that don't require a decision. Exceptions: destructive confirmations, legally required interstitials, focus-critical flows (payment).

### latency-honesty (X, warn)
UI affordances should match actual execution semantics: flag spinners on operations that are synchronous/instant, optimistic updates on operations with meaningful failure rates and no rollback rendering, and absence of progress affordance on operations known to be slow (multi-step handlers, sequential awaits that could be parallel — note the perf issue too). Detection: read the handler; relate awaits/parallelism to what the UI shows during execution.
