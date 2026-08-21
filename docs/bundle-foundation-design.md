# Security & Audit Foundation: Composable-Package Library Design Draft (2026-08)

> **中文版（翻译）**：[bundle-foundation-design.zh-CN.md](bundle-foundation-design.zh-CN.md) ·
> the English original is the source of truth.

> **Source**: dsh-checkpoint-diff/docs/bundle-foundation-design.md (migrated into this
> repository's docs/ in 2026-08 as the library-building decision record; the old repository copy is kept unchanged).

> **Status**: Draft v0.5. Decided: **D1 (`dsh-audit-foundation`, concept name Trust Anchor)**,
> **D2 (monorepo)**, **D3 (light maintenance of diff + code reuse)**, **D4 (no gate)**,
> **D5 (audit-ledger in the first phase, baseline scope)**, **D6 (no signature commitment, interface slot reserved)**,
> **D7 (SARIF left to other plugins)**, **D8 (repository created at `tmpdot/dsh-audit-foundation`,
> single-person namespace, collaboration mode retained)**, **D9 (UI and data separation: view model contract + reusable UI)**,
> **technical-selections workflow (T1–T4 tiers, full version approved by the user on 2026-08-20; register
> `docs/technical-selections.md`, see §10)**.
> Direction confirmation (user direction, 2026-08):
> ① the project itself is an **ecosystem standard** (interface spec + data storage format), unifying upstream and downstream; ② follow
> **current mainstream audit implementation approaches**: only basic features and clearly bounded components are built; optional extensions are left to other plugins;
> ③ presentation layer: **UI and data separation**, UI interfaces exposed, other plugins can reuse the UI with the same data structures (see §9);
> ④ philosophy calibration (2026-08): **ecosystem first, industry standards second** — standards are a means; the ecosystem is the end;
>    deviate and record the rationale when adopting a standard harms ecosystem alignment; "partial alignment" is the default stance (anchors: MDP
>    General Principle / technical-selections rule 5 / README "philosophy" section).
> Prerequisite conclusions read: `docs/roadmap-tasks.md` (task book / T1–T20),
> `docs/3-traceability-vs-audit.md` (direction ruling: traceability vs. audit, three layers),
> `docs/decoupling-design.md` (Phase A/B details), `docs/contract.md` (consumer-side contract).
> Per the user's latest 2026-08 direction, this document revises two old premises:
> **① Not afraid to reinvent wheels or overlap features** (an ecosystem "already occupied" slot is no longer a reason to avoid);
> **② No negotiation with upstream** (the rewind/harness negotiation channel is unavailable), replaced by **defining Minimal Design Principles (MDP) for the ecosystem to follow** —
> the common ailment of existing plugins — "features implemented well, but doing too much or too little, missing interfaces, or exposing interfaces unreasonably" —
> is solved by specs + a reference implementation, not by bargaining.

---

## 0. Decision summary: whether to start a new project

**Conclusion: start a new project (an independent repository, monorepo with multiple packages), building a "library" directly from composable packages.**

Composable packages = self-built producer (audit record layer) + consumer (traceability presentation layer) + spec package (spec). It is not
the next stage of `dsh-checkpoint-diff`, but an **independent security & audit foundation**. Rationale:

| # | Rationale | Details |
|---|---|---|
| 1 | **Write-path separation, single security model** | The producer writing its own domain (a new write path) and the consumer "read-only + rollback exception" are two trust surfaces. Stuffing them into the diff repository = a second extension of AGENTS.md #1 (decoupling-design §5 already flagged it for review). An independent repository keeps each package's security boundary single and auditable |
| 2 | **The spec needs a neutral anchor** | MDP + domain specs + event schemas + contracts have "standard library" status and do not belong as appendices of any single plugin |
| 3 | **Independent version cadence** | diff 0.x is slow-paced (caret-locks minor; each minor requires profile changes). The foundation needs its own version line (only a frozen spec makes 1.0.0 discussable) |
| 4 | **Ecosystem discoverability** | Only an independent repository can be consumed by the ecosystem: independent package name (`dsh-*` prefix) + `dsh-plugin` dist-tag + inclusion in plugin marketplaces (mydsh.dev / dsh-market and the 1500+ plugin ecosystem) |
| 5 | **Reinventing wheels is not a sin** | The user has ruled: ecosystem "already occupied" slots (audit A/B) are no longer avoided. The foundation builds its own core; the ecosystem either follows MDP or is covered by the reference implementation |

**Form (D2 decided: monorepo)**: single repo, two zones — `packages/` (minimal-responsibility plugins) + `spec/`
(specs: MDP document, domain schemas, event schemas, contracts). Difference from task book T11 (single repo, two packages vs. independent repository):
not just "producer + consumer" two packages, but **N minimal-responsibility plugins + 1 spec package** (§6).

**Naming (D1 decided)**: repository/package name **`dsh-audit-foundation`**; concept name **Trust Anchor** —
the README opening positioning phrase ("Trust Anchor: security & audit foundation"), not part of the package name (avoids the name-collision confusion
with the PKI standard term trust anchor; evaluation in §8 D1).

**One-line positioning**: *one set of principles (MDP), one set of specs (spec), one set of minimal-responsibility plugins that pin down the
interfaces of the whole pipeline "policy → enforcement → evidence → storage → query → presentation → response → audit consumption",
so ecosystem plugins fit seamlessly.*

---

## 1. Minimal Design Principles (MDP) v0.1 — the core of ecosystem specifications

> Each principle = a one-sentence definition + judgment criteria (to check whether other plugins comply) + a violation example + a compliance example.
> Principle numbers are stable (M0–M10); revisions only add semantics without changing numbers (contract-style evolution).

### M0. Spec-first (Interface before implementation)
- **Definition**: any plugin that **produces data** must export its data schema from the package (storage domain spec / event types /
  service signatures / file layout); consumers are **forbidden from isomorphic redeclaration**.
- **Judgment**: `import schema from 'pkg/domain-spec'` is available; the consumer's validator is an import, not a copy.
- **Violation**: rewind does not export the checkpoints domain spec → diff is forced into an isomorphic redeclaration in `lib/domain.mjs`
  (a round of v1/v2 churn, explicitly recorded in contract.md §1). **This is the textbook case of "missing interfaces".**
- **Compliance**: all domain schemas of the foundation are exported from packages (reusing the pure zod patterns of `domain-schema.mjs`, task book T2/T13).

### M1. One concern per plugin
- **Definition**: one plugin takes on exactly one cross-cutting concern (audit, snapshot, trace, timeline, rollback, export, guard hints…).
- **Judgment**: "remove it and the rest stays coherent" → it does not do too much; "without it the ecosystem has no counterpart" → it does not do too little.
- **Violation**: diff packs four concerns — timeline/trace/rollback/export — into one package (historical baggage; split apart inside the foundation).
- **Compliance**: see the plugin list in §6; judge "doing too much / too little" with this principle.

### M2. Producer owns the schema
- **Definition**: whoever writes the data owns its schema and semantics; consumers are read-only with a **tolerant superset** (strictness belongs to the producer).
- **Judgment**: the required/optional set of a record schema lives in the producer's package; consumer docs state "tolerant, strictness not validated".
- **Compliance**: contract.md §1.1 already sets the pattern ("strictness belongs to the producer rewind").

### M3. Minimum exposure, complete coverage
- **Definition**: do not expose one more interface than is used (prevents coupling bloat); do not expose one less interface than consumers need (prevents guessing/redeclaration).
- **Judgment**: every public interface has an **actual consumer or a written proposal**; every cross-plugin datum has a schema (M0).
  Once an interface shape stabilizes it enters the contract (same style as contract.md); changes go to CHANGELOG + a minor version.
- **Violation**: dsh-supervisor's judgment data (allow/deny/waived) has no stable interface shape → consumers can only reserve + document conventions
  (task book T8 already downgraded this). **Another case of "missing interfaces".**

### M4. Cross-cutting concerns are plugins
- **Definition**: cross-cutting concerns such as audit, permissions, path validation, hashing, labels, quota, and time sources each stand alone
  and are **not embedded** into feature plugins; capabilities shared by multiple plugins go through event/service interfaces, not by injecting implementations into each other.
- **Judgment**: when any concern swaps implementation (e.g., hash algorithm, label policy), only the corresponding plugin changes; the rest stay untouched.
- **Compliance**: harness precedent — the `fs/write-intent` event gate lets fs-observation-policy be added/removed
  ("layered permission/audit/sandbox interception belongs on `tools/execute`");
  user-approval's paired `approval/asked` + `approval/decided` audit records are independent of the consuming side.

### M5. Fail closed, degrade honestly
- **Definition**: a missing service → explicit degradation (degraded annotation, error attribution naming the cause) or fail closed; **never silent**.
- **Judgment**: every possibly-absent dependency has a degradation matrix (task book / contract.md §1.5 already set the pattern).
- **Compliance**: diff's degraded markers / bad-object attribution / `notes` reports on trace replay drift.

### M6. One explicit write path
- **Definition**: every plugin's write path must be declared in README/SECURITY; path validation (rejecting `..` / absolute paths /
  symlink escapes / protected segments) is a shared cross-cutting component, not a per-write-path copy.
- **Judgment**: SECURITY.md can be reconciled item by item; write-path validation logic across plugins has a single source (shared pure functions, not copies).
- **Compliance**: diff's rollback six invariants (contract.md §2.2) are the model for "explicit boundaries".

### M7. Verifiability
- **Definition**: data is hashable, replayable, and rebuildable: content addressing (same content = same ref), append-only records,
  hash chains (detecting reordering/loss/tampering), trace replay (rebuilding content between any two points).
- **Judgment**: any evidence-class data has a read-only means to "verify it was not altered/lost"; docs state "verifiable ≠ tamper-proof".
- **Scope**: hash chains are built in (no clearly bounded ecosystem plugin exists; task book 9.5 decided); signatures are not committed to because key management is undecided.

### M8. Compose, don't fork
- **Definition**: reuse harness events and services (`fs/*-intent`, `tools/*`, `storageDomain`,
  `sessionQuery`, `approval`, `webServer`); when coexisting with peers, use **dual capture + content-addressing dedup**,
  never fork upstream code, never modify upstream repositories.
- **Judgment**: the package dependency table contains no "copy-pasted upstream source"; coexistence scenarios have dedup tests.

### M9. Retention is explicit
- **Definition**: any storage volatility semantics (transient/persistent/durable tier) must be documented and **annotated on the data itself**;
  quota eviction, gc reclamation, and clearable records are part of the semantics, not defects.
- **Violation**: rewind's quota eviction / `/rewind clear` / gc reclamation is never documented → downstream only discovers it afterwards via degraded.
- **Compliance**: node tier annotation (provenance + durability tier, task book T4); the audit domain separates "archive vs. eviction".

### M10. Ecosystem-friendly release
- **Definition**: package name `dsh-*`; `exports` exposes specs and pure functions; bilingual README; contract documents with **factual
  description + proactive proposal section** (task book T3); dist-tag `dsh-plugin`; changes go to CHANGELOG.
- **Judgment**: a new plugin can integrate without reading source code (schema/layout/semantics documentation complete).

---

## 2. The security & audit pipeline (end to end)

```
Policy → Enforcement → Evidence → Storage
   → Query → Presentation → Response → Audit consumption
```

| Stage | What it does | Data | Interface | Responsible party |
|---|---|---|---|---|
| **Policy** | permission presets (sandbox mode + approval policy bundled), guard-hint policies, audit objectives (what to record / how long to keep) | `permission/preset` event, config | `ctx.permissionPresets` (harness already has it) | harness core (existing) → foundation adds "audit policy" |
| **Enforcement** | sandbox execution, approval gate, fs intent gate, tool pipeline interception | `sandbox/mode`, `approval/asked+decided`, `fs/*-intent`, `tool/call+result` | event gates + `ctx.approval` (existing) | harness core (existing); the foundation does not duplicate |
| **Evidence** | pre-change snapshots, trace (session logs), paired audit event records | snapshots (git objects / copy directories), `session.jsonl.zstd`, checkpoint/* events | storage domain + snapshot directory layout + event types | **rewind (optional) / foundation producer (self-built)** + harness |
| **Storage** | records written to disk: domains (sqlite/json), snapshot directories, append-only logs | checkpoints / cdp-snapshots / audit domains | `ctx.storageDomain` (existing) + domain specs (self-built, exported) | foundation producer + harness storage |
| **Query** | timeline extraction, multi-source merge, trace replay, session queries | timeline nodes, replayed content | `sessionQuery` (existing), timeline API | foundation consumer + session-query |
| **Presentation** | GUI panels, command surface, HTTP API | **view models** (exported by spec; UI does not read storage domains, D9) | view model contract + GET endpoints (webServer) + `dsh-audit-ui` components | foundation consumer + spec |
| **Response** | rollback (preview → apply → undo), fork, cleanup | workspace files, undo in-memory state | rollback/rollback-undo endpoints | foundation consumer (sole write path) |
| **Audit consumption** | evidence export (JSON/MD/SARIF), verifiable hashes, judgment badges, reports/heatmaps | export artifacts, hashes, allow/deny/waived | export endpoints + judgment-data consumption interface (reserved) | foundation (export) + ecosystem (judgment source) |

**Key insight**: the harness core already covers the policy/enforcement/storage foundation (sandbox, approval, storageDomain,
session-query), so **the foundation does not reinvent those wheels**; the foundation's unique positions are the **evidence layer (durable snapshots), query layer
(multi-source timeline), response layer (safe rollback), and audit consumption layer (export + verifiability)** — plus the
**spec layer (MDP + spec)** that pins them down. The user ruling "not afraid to reinvent wheels" applies to: ecosystem plugin slots that are **unclearly bounded and
internally inconsistent** (the ad-hoc audit A/B implementations), which the foundation covers with a normalized reference implementation.

---

## 3. Feature list and interface judgment (F table)

> Judgment rule (answering "is an interface needed?"): **data flows across plugin boundaries → an interface is needed** (domain spec / event types /
> service signatures / file layout / HTTP endpoints); **internal to a single plugin → no interface needed** (internal modules suffice);
> **cross-cutting concerns (shared by multiple plugins) → an interface is needed, and they stand alone as plugins (M4)**.

| # | Feature | Produced data / component | Interface needed? | Interface shape / owner | Plugin | Status |
|---|---|---|---|---|---|---|
| F1 | Permission preset switching | `permission/preset` event | existing | harness `ctx.permissionPresets` | harness | existing |
| F2 | Approval gate (one-shot) | paired `approval/asked` + `decided` audit | existing | harness `ctx.approval` | harness | existing |
| F3 | sandbox execution/escalation | `sandbox/mode` | existing | harness `ctx.shell` | harness | existing |
| F4 | fs intent gate (read before modify) | `fs/*-intent` events | existing | harness event gate (single-slot) | harness | existing |
| F5 | **pre-change snapshot (durable)** | `cdp-snapshots` domain + snapshot directory | **needed (self-built)** | domain spec exported from the package (M0); layout `$DSH_HOME/<pkg>/snapshots/<key16>/<uuid>/`; records carry provenance + tier metadata | producer | design phase (task book T13–T16) |
| F6 | Snapshot capturer | capture event sequences | needed | reuses harness `fs/*-intent` + `tools/pre-execute`; **no own events** (observation-style pass-through) | producer | design phase (T14) |
| F7 | **Audit records (paired event aggregation)** | `audit` domain: aggregation of key events (approval decisions / permission switching / tool calls / snapshots) + hash chain | **needed (self-built)** | domain spec exported; event types aligned with harness's existing types (no invented semantics) | audit record plugin | new proposal (§6 P4) |
| F8 | Hash chain verification | predecessor hash per record | needed | part of the domain spec (record schema field) | producer / audit record | design phase (T15) |
| F9 | Retention (quota/cleanup) | eviction rules | needed | domain spec documents tier + quota semantics (M9) | producer | design phase (T16) |
| F10 | Trace replay (no-snapshot fallback) | replayed content sequences | existing (consumption) | `sessionQuery.readSession` + zstd layout (read-only) | consumer (trace) | implemented (0.5.0) |
| F11 | Multi-source timeline (cdp ⊕ rewind ⊕ trace) | timeline nodes (provenance + tier annotated) | **needed** | node model + addressing semantics (following the existing contract §1.3); cross-source diff alignment rules | consumer (timeline) | design phase (T17) |
| F12 | Per-file line-level diff | diff view | existing | LCS engine (internal module, no interface needed) | consumer (timeline) | implemented |
| F13 | Safe rollback + single undo | workspace writes, undo in-memory state | existing | POST endpoint + six-invariants contract | consumer (rollback) | implemented |
| F14 | **Evidence export** (JSON/MD/SARIF) | self-contained export artifacts | **needed (self-built)** | `GET /api/evidence-export` + `/diff --export`; artifacts hashable and archivable | export plugin | design phase (T5) |
| F15 | Verifiability hashes (display) | node/artifact hashes | **needed** | hash algorithm + standardized display location (M7; "hash ≠ seal") | export plugin | design phase (T6) |
| F16 | Judgment badge consumption (allow/deny/waived) | node badges | **needed (reserved)** | **interface shape pending ecosystem alignment** — judged per M3: no stable interface → documented convention + reservation, no hard-coding (T8 stance unchanged) | consumer (timeline) | reserved |
| F17 | Anomalous-change hints / heatmaps | anomaly markers, profile data | needed | read-only API + panel; positioned as "hints" not "gate" (T10 stance unchanged) | guard-hints plugin | design phase (T10) |
| F18 | Guard hints (sensitive-path touches, etc.) | hints/markers | needed | reuses `tools/execute` listening (guard precedent: repeat-tool-reminder's additionalContexts pattern) | guard-hints plugin | new proposal |
| F19 | Audit policy (what to record / how long to keep) | policy config | needed | config schema + policy event (aligned with the `permission/preset` pattern) | audit record plugin | new proposal |
| F20 | Session title/lineage | titles, fork branches | existing | `sessionQuery.readTitle/traceSession` (optional service, fetched live via getter) | consumer | implemented |
| F21 | **View model contract + reusable UI** | timeline-view / diff-view / audit-view / evidence-view; UI component package | **needed (self-built)** | view schemas exported from spec (M0); `dsh-audit-ui` consumes only view models, never reads storage domains (D9) | presentation layer + spec | decided (D9) |

---

## 4. Cross-cutting concern list (where interfaces are needed; the implementation table for M4)

| Cross-cutting concern | Current state | Foundation action | Interface shape |
|---|---|---|---|
| Audit event records | harness has paired approval audits; checkpoint/* goes through the adaptive gate | aggregate into the audit domain (F7), **consume** harness events, no invented events | `audit` domain spec (exported) |
| Path validation | one embedded set in rollback | **extract into a shared pure-function package** (rejects `..` / absolute / link escapes / protected segments), shared by all write paths | pure-function library (exported, zero DSH dependencies) |
| Time/clock | each plugin fetches its own | unify epoch-ms semantics into spec (no service, semantics only) | documented convention |
| Identity (session/turn/step/agent) | carried by events | into the audit record schema (aligned with harness event shapes) | domain spec |
| Content addressing/hashing | used by producer (dedup); used by export (verifiability) | one algorithm, two uses, **single implementation** | pure-function library (exported) |
| Intent labels | implemented in labels.mjs | stay in the consumer (presentation concern); spec only defines the input contract of "where labels come from" | documented convention |
| Quota/retention | embedded in rewind (undocumented) | producer manages itself + tier metadata (M9) | domain spec + commands |
| Degradation/error attribution | degraded/attribution implemented | written into MDP as the M5 acceptance criterion, no new component | documented convention |
| HTTP surface | GET gate + two POSTs | all new endpoints follow; export endpoints GET-only | contract document |
| Configuration | Schemastery per-plugin | each plugin has its own config; audit policy (F19) separate | config schema |

---

## 5. Minimal-responsibility plugin breakdown (composable package list)

```
                    ┌─────────────────────────────────────┐
                    │  spec package (non-plugin: MDP + domain schemas + event schemas + contracts + zod validators) │
                    └──────────────┬──────────────────────┘
                                   │ exports specs (M0: no isomorphic redeclaration)
   ┌───────────────┬───────────────┼──────────────────┬─────────────────┐
   ▼               ▼               ▼                  ▼                 ▼
 Producer        Audit ledger     Consumer(timeline) Consumer(rollback) Export
dsh-checkpoint-   dsh-audit-      dsh-checkpoint-    dsh-checkpoint-   dsh-evidence-
producer          ledger          timeline           rollback          export
(writes: cdp-     (writes: audit  (reads: three-     (writes: workspace (reads: evidence
 snapshots        domain +        source merge +     rollback + undo;   export +
 domain + dir;    hash chain)     trace + diff)      sole write path)   verifiable
 capturer;                                          ▲                    ▲
 hash chain;                                        └─── reuse ──────────┘
 retention)                    harness: storageDomain / sessionQuery /
                               webServer / fs/*-intent / tools/*
```

| Package | Responsibility (one concern) | Write path | Dependencies (inject only what's needed) | Task book |
|---|---|---|---|---|
| `dsh-checkpoint-producer` | durable pre-change snapshots + content addressing + hash chain + retention | own domain `cdp-snapshots` + own directory (M6 validation) | `storageDomain`, `fs/*-intent`, `tools/pre-execute` (observation-style pass-through) | T13–T16 |
| `dsh-audit-ledger` (new) | paired aggregation of audit events (approval decisions / permission switching / tool calls / snapshots) into the `audit` domain + hash chain | own domain `audit` | `sessions` (event consumption), `storageDomain` | new (covers the ecosystem's ad-hoc audit A) |
| `dsh-checkpoint-timeline` | multi-source timeline + line-level diff + intent labels + judgment badge consumption | none | `storageDomain`, `sessionQuery` (fetched live via getter) | T4/T8/T11/T17 |
| `dsh-checkpoint-rollback` | safe rollback + preview + single undo | workspace (six invariants) | `webServer` | existing (split out) |
| `dsh-trace` | trace replay (timeline/interval diff/backtracking) | none | `sessionQuery`, direct zstd read fallback | existing (split out) |
| `dsh-evidence-export` | evidence export (JSON/MD/SARIF?) + verifiable hashes | none | `webServer` | T5–T7 |
| `dsh-guard-hints` (new) | anomalous changes / sensitive paths **hints** (read-only, not a gate) | none | `tools/*` listening (additionalContexts pattern) | T10/F18 |
| `dsh-audit-ui` (new) | presentation components (timeline/diff/audit view/export preview), **consumes only spec view models** (D9) | none | spec view schemas (does not read storage domains) | D9 |
| `spec/` (non-plugin) | MDP document + domain schemas + event schemas + **view model schemas** + contracts + zod validator exports | none | zero DSH dependencies (pure zod) | T1–T3/T13 |

**Split principle** (why split this way): every package can be installed independently, has an independent security model (the write-path table is at a glance),
and has an independent version line; the three consumer packages (timeline/rollback/trace) already have their internal modules (`lib/` is already a pure-function layering),
so the split is mainly a **release unit** split, and moving code is cheap.

**Relationship to the existing repository (D3 decided: light maintenance + reuse)**: `dsh-checkpoint-diff`'s `lib/` pure-function layer
(domain-schema, workspace, labels, diff/engine, rollback, trace/*) is **migrated** into the corresponding packages of the new repository;
the diff repository **continues to be maintained** (0.5.x patch line: bug fixes and security patches, invested in as long as people use it); new features are only built in the new
repository. Migration principle: **reuse, don't copy** — once a module migrates into the new repository, the old repository stops evolving it (only patches remain), avoiding
double maintenance; shared logic follows the new repository's packages, and the old repository depends on or syncs patches as needed.

---

## 6. Ecosystem strategy: spec-first, no negotiation

The user ruled "no capacity to negotiate" → the ecosystem strategy converges from the "three strategies in parallel" of task book §8.4 to **one strategy**:

1. **Spec-first / norms first**: MDP + domain specs + event schemas are published as the `spec/` package (npm + repository),
   with zod validators exported alongside the package — any plugin can `import` them to validate whether its records meet the standard.
2. **Reference implementation**: the composable packages are themselves the strictest followers (dogfooding); every MDP violation example
   (rewind not exporting its spec, supervisor without a stable judgment interface) has a compliant counterpart in the reference implementation.
3. **No negotiation, no waiting**: rewind stays an "optional legacy source" (coexistence via dual capture + dedup, T17),
   no longer waiting for upstream to export its spec (T9 downgraded to documenting differences); ecosystem plugins' (supervisor, etc.) judgment data
   is consumed when it has a stable interface (F16), otherwise documented conventions + reservation.
4. **Contribution to the ecosystem**: contract documents keep factual description + a "proposal to the ecosystem" section (T3 retained);
   plugin marketplace inclusion (M10); `dsh-plugin` dist-tag.

**First principles favorable to the ecosystem (philosophy calibration 2026-08: ecosystem first, industry standards second)**: **standards are a means;
the ecosystem is the end**. What the ecosystem lacks is not more features, but **alignable interfaces**; the foundation pins down interfaces, exports them,
and provides validators for free — that is the cure for the "missing/wrong/extra interfaces" ailment. By default it follows industry standards (standards
are ecosystem assets), but when a standard conflicts with ecosystem alignment (interface alignability / harness event vocabulary / consumer
composability), it **deviates from the standard, records the rationale, and takes "partial alignment" as the default stance** — T4-3 audit fields (keeping the
harness-native `eventType`) and T4-1 snapshot carrier (not adopting git loose-object) are the models.
**Direction confirmation (user 2026-08)**: the project itself is an **ecosystem standard** (interface spec + data storage format),
unifying upstream and downstream; following current mainstream audit implementation approaches (append-only records + hash chains + queryable and exportable),
only basic features with clear boundaries are built; optional extensions (gates/signatures/SARIF/enhanced visualizations) are left to other plugins.

---

## 7. Relationship to the task-book roadmap (rearranged)

| Task book | Place in the new project |
|---|---|
| T1–T3 (baseline small items) | first phase of the new repository (spec package: MDP document + exports `./domain-spec` + contract proposal section) |
| T4 (tier annotation) | consumer timeline package |
| T5–T7 (export + hashes) | `dsh-evidence-export` package |
| T8 (judgment badges) | timeline package, stance unchanged (reserve + documented conventions) |
| T9 (rewind negotiation) | **cancelled** (user ruled: no negotiation), downgraded to documenting differences |
| T10 (dig deeper) | `dsh-guard-hints` package (hints, not a gate) |
| T11–T19 (composable packages) | this design's package breakdown in §5 (T11 decided: monorepo D2 + light maintenance/reuse D3) |
| T20 (1.0.0 gate) | contract-freeze review in the new repository's spec package: MDP + domain specs + contracts complete → 1.0.0 |

---

## 8. Pending decision points (need to be decided)

| # | Decision point | Recommendation | Alternatives |
|---|---|---|---|
| D1 | New repository naming | **`dsh-audit-foundation`** ✅ decided (most precise semantics, zero terminology conflicts; the concept name **Trust Anchor** is only used as a documentation positioning phrase, not part of the package name — trust anchor is a PKI standard term in RFC 6024 / X.509, and using it as a package name would mislead security/GRC audiences) | evaluated: `dsh-security-foundation` / `dsh-cornerstone` / `dsh-baseline` / trust-anchor variants (none chosen) |
| D2 | Repository form | **monorepo** (packages/ + spec/) ✅ decided | — |
| D3 | Fate of the existing diff repository | **light maintenance + code reuse** ✅ decided: the 0.5.x patch line continues (bug/security patches, invested in as long as people use it); `lib/` pure-function layer migrates into the corresponding packages of the new repository (reuse, don't copy; the old repository no longer evolves a module after it moves out) | freeze / thin-shell forwarding (not chosen) |
| D4 | Whether to build audit B (gate/policy enforcement) | **no gate** ✅ decided (harness approval/sandbox are already the gates; guard hints only provide hints, F18; direction confirmation ②: only basic features, extensions left to the ecosystem) | build a minimal gate (violates M1: overlaps harness responsibilities) |
| D5 | Whether `dsh-audit-ledger` (audit domain) ships in the first phase | **first phase** ✅ decided (audit A is the foundation's core commitment; the ecosystem's ad-hoc implementations do not meet the bar). **Baseline scope**: paired event aggregation + hash chain + retention; advanced analysis/aggregated reports left to the ecosystem | second phase (producer + consumer first) |
| D6 | Signatures/tamper-proofing | **no commitment** ✅ decided (key management undecided; M7 only goes up to hash chains; signatures left to ecosystem plugins, interface slot reserved) | reserve the interface slot |
| D7 | SARIF export | **JSON+MD only in the first phase** ✅ decided (direction confirmation ②: optional extensions left to other plugins; SARIF no longer gets an audience-judgment write-up) | everything in the first phase |
| D8 | Namespace ownership | **single-person namespace `tmpdot`** ✅ decided (2026-08-21: repository created at `github.com/tmpdot/dsh-audit-foundation`; collaboration mode retained — commit identity is left to each contributor's local git config; a dedicated organization was not created at this time, can be revisited if multi-repo ownership later demands it) | new **organization** (deferred, not chosen at creation) |
| D9 | Presentation layer: UI and data separation | **separate + expose UI interfaces** ✅ decided (direction confirmation ③): view model schemas go into the spec package; `dsh-audit-ui` components consume only view models; other plugins with the same data structures can reuse the UI (see §9) | UI coupled to data (not chosen: the ecosystem cannot reuse) |

---

## 9. Presentation layer decision (D9 decided: UI and data separation, UI interfaces reusable)

**Decision**: the presentation layer is split into two layers — **view models (data contracts)** and **UI components (views)**, each released
independently; the UI **consumes only view models and never reads storage domains directly**. View models belong to spec (the project itself is the interface spec
and data storage format; the UI is an incidental reference implementation).

- **View model contract (view schemas, into the spec package)**: `timeline-view` (timeline nodes/badges),
  `diff-view` (per-file line-level diff), `audit-view` (audit records), `evidence-view` (export preview);
  zod validators exported from `dsh-audit-spec` (M0: no isomorphic redeclaration).
- **One-way data flow**: storage domains → query/aggregation (common pure functions) → view models (JSON) →
  GET endpoints / slot props → UI components. Domain layout changes do not affect the UI, and vice versa.
- **UI package `dsh-audit-ui` (planned)**: client components such as timeline / diff / audit view / export preview;
  receives only view models as props; zero write path; independent version line; README documents each component's view model input.
- **Reuse rule (M3 implementation)**: when an ecosystem plugin holds isomorphic data (its own domain or harness events), it can derive
  view models itself and then mount the foundation's UI; data validation failure → explicit degradation/error (M5), no data guessing.
- **First-phase scope (direction confirmation ②)**: only basic views (timeline + diff + audit records + export preview);
  enhanced visualizations such as heatmaps and profiles are deferred as needed, left to ecosystem plugins.

## 10. Technical-selections workflow (decided 2026-08-20, user approved the full version)

Any key technical selection is registered in `docs/technical-selections.md` under the four-tier judgment (that document's header holds the
full workflow and rules; this is a summary):

- **T1 formal standard / T2 de-facto standard** → **execute directly, no asking** (when executing, verify the original text and current version
  with web_search, and link them into the register);
- **Ecosystem-first exception (calibration 2026-08)**: T1–T3 are executed by default, but when adopting a standard harms ecosystem alignment
  (interface alignability / harness event vocabulary / consumer composability), **deviate and record the rationale**;
  "partial alignment" is the default stance (register rule 5; §6);
- **T3 industry convention** → execute directly, record the convention description and representative cases;
- **T4 no standard** → collect ① similar plugin approaches in the DSH ecosystem ② similar industry approaches → record the benchmarking stance
  (alignment / partial alignment / not adopted + rationale + links) → execute by best judgment first → enter the "pending-decision" list
  → remind the user to decide via the gate;
- **Gate**: T4 items affecting the external contract shape (domain schemas / view models / endpoints) must be cleared before the contract
  freeze (1.0.0 gate); internal implementation details can be decided after execution;
- **Reminder**: at the end of a round involving a selection, list "pending your decision"; before committing, check the register and name new T4 items
  in the commit message; keep the pending-decision list in sync (register §2 is the authoritative source).

Current T4 pending decisions: schema validator (T4-2) — see register §2 for details
(T4-1 / T4-3 / T4-4 decided on 2026-08-21).

## Appendix: relationship of this document to existing documents

- Does not replace roadmap-tasks.md / 3-traceability-vs-audit.md / decoupling-design.md / contract.md;
  they are the sources and details of the inferences; this document is the consolidated draft of **library-building decisions + principles + breakdown**.
- After decisions are made: the D1–D8 decision records are backfilled into this document; when the spec package lands, MDP moves into spec/ as the formal specification;
  AGENTS.md's no-negotiation clauses are re-drafted in the **new repository** (the old repository's clauses stay untouched).
