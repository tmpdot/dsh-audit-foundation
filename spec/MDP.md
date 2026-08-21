# Minimal Design Principles (MDP) — Normative Spec

> **中文版（翻译）**：[MDP.zh-CN.md](MDP.zh-CN.md) · the English original is
> the source of truth.

> **Trust Anchor** (dsh-audit-foundation) normative core. Applies to: every
> package in this repo (must self-certify compliance) + ecosystem plugins
> (recommended).
> Each principle = definition + acceptance criteria (you can check whether
> other plugins comply) + violation example + compliant example.
> Principle numbers are stable (M0–M10): revisions only add semantics, never
> renumber (contract-style evolution).
> Value ordering: see the "General Principle" (ecosystem first, industry
> standards second), which sits above the numbered principles.
> Origin: `docs/bundle-foundation-design.md` §1 (dsh-checkpoint-diff repo,
> 2026-08).

## How to judge whether a plugin "complies with MDP"

A plugin must be able to answer each acceptance criterion below one by one;
this repo's reference implementations (spec / common / each plugin package)
are the templates that comply point by point. Any plugin that "works well but
is internally inconsistent" (did too much or too little, missing interfaces,
or exposing interfaces unreasonably) violates at least one of M0–M4.

---

## General Principle. Ecosystem first, industry standards second

> The value ordering, above M0–M10: applies to every decision in this repo
> (selections / design / release) and to design recommendations for ecosystem
> plugins; each numbered principle is its embodiment.

- **Definition**: **Standards are a means; the ecosystem is the end.** Formal
  / de-facto standards and industry conventions (T1–T3 in the technical
  selections register) are followed by default — standards are themselves
  ecosystem assets (interoperability, tooling, discoverability); but when
  adopting a standard would **harm ecosystem alignment** — interface
  alignability (M0/M3), not distorting the harness's original event vocabulary
  (M8), consumer composability — we **deviate from the standard and record
  the rationale; "partial alignment" is the default stance**.
- **Acceptance**: every standards-involved decision can answer "what does
  adopting it do for the ecosystem? what does deviating from it protect in the
  ecosystem?"; any row that is not fully aligned must state "what was
  deviated from, what was protected" (stance column of the technical
  selections register) — **no implicit deviation**.
  Every round involving ecosystem-facing decisions must also answer "what did
  we observe, what did we revise, what did we protect" — the operating
  mechanism is `docs/ecosystem-observation.md` (feedback loop + observation
  log). Validation of ecosystem alignment is **two-layer**: **(compatibility
  floor)** real plugins must be able to integrate — necessary, prevents
  ivory-tower specs; **(quality ceiling)** the spec author holds design
  authority, judging against MDP + industry benchmarking — a community shape
  is a candidate, never the baseline. Core stance: **observe everything,
  adopt nothing by default**.
- **Violation**: reshaping harness event names into standard numbering to
  align with an industry standard (sacrificing the M8 vocabulary's original
  meaning); forcing consumers to migrate or re-declare isomorphic schemas for
  "standards compliance"; following the most popular plugin's shape instead
  of judging (letting incumbency decide the spec — the ailment MDP exists to
  cure, M0–M4).
- **Compliant**: T4-3 audit field classification "partially aligned with
  OCSF/ECS, eventType keeps the harness's original event name"; T4-1 snapshot
  carrier does not adopt git loose objects (gc-reclaim risk; data must not
  disappear); ecosystem-observation.md §2 two-layer validation — real-plugin
  walk-throughs are the compatibility floor, promotion to the spec still
  requires MDP judgment.

---

## M0. Spec-first (Interface before implementation)

- **Definition**: any plugin that **produces data** must export its data
  schemas (storage domain spec / event types / service signatures / file
  layout) from its package; consumers are **forbidden to re-declare
  isomorphic schemas**.
- **Acceptance**: `import schema from 'pkg/domain-spec'` works; the consumer's
  validator is imported, not copied.
- **Violation**: dsh-checkpoint-rewind does not export the checkpoints domain
  spec → consumers are forced to re-declare isomorphic schemas (one full
  round of v1/v2 churn). This is the textbook case of a "missing interface".
- **Compliant**: all domain schemas in this repo are exported from
  `dsh-audit-spec` (pure zod, zero DSH dependencies).

## M1. One concern per plugin

- **Definition**: a plugin takes on exactly one cross-cutting concern (audit,
  snapshot, trace, timeline, rollback, export, guard rails…).
- **Acceptance**: "remove it and the rest still coheres" → it did not do too
  much; "without it the ecosystem has no peer" → it did not do too little.
- **Violation**: dsh-checkpoint-diff packs four concerns into one package
  (timeline/trace/rollback/export — historical baggage; the foundation splits
  them, release units follow concerns).
- **Compliant**: see the README package list: every package has one write
  path, one dependency table, one concern.

## M2. Producer owns the schema

- **Definition**: whoever writes the data owns the schema and its semantics;
  consumers are read-only + **tolerant superset** (strictness belongs to the
  producer).
- **Acceptance**: the required/optional sets of the record schema live in the
  producer's package; the consumer's docs state "tolerant; does not validate
  strictness".
- **Compliant**: the checkpoints consumption schema
  (`spec/src/checkpoints.mjs`) is the tolerant-superset template: both v1 and
  v2 records are accepted; strictness is left to the producer.

## M3. Minimum exposure, complete coverage

- **Definition**: expose no interface nobody uses (prevent coupling bloat);
  omit no interface a consumer needs (prevent guessing and re-declaration).
- **Acceptance**: every public interface has an **actual consumer or a written
  proposal**; every cross-plugin data item has a schema (M0). Once an
  interface shape stabilizes it enters the contract; changes go to CHANGELOG +
  a minor version.
- **Violation**: dsh-supervisor's decision data (allow/deny/waived) has no
  stable interface shape → consumers can only "reserve slots + documented
  conventions".
- **Compliant**: every draft schema in this repo is annotated with its status
  (stable/draft) and "the interface for whom".

## M4. Cross-cutting concerns are plugins

- **Definition**: audit, permissions, path validation, hashing, labels,
  quotas, time sources — each cross-cutting concern is an independent plugin,
  **not embedded** in feature plugins; capabilities shared by multiple plugins
  go through events / service interfaces, never by injecting implementations
  into each other.
- **Acceptance**: when any concern's implementation changes (e.g., hash
  algorithm, label policy), only the corresponding plugin changes; nothing
  else moves.
- **Compliant**: harness precedents — the `fs/write-intent` event gate makes
  fs-observation-policy attachable/detachable; user-approval's paired
  `approval/asked` + `approval/decided` audit is independent of its consumers.
  In this repo: pathguard / hash are standalone pure-function packages (M6/M7
  embodied).

## M5. Fail closed, degrade honestly

- **Definition**: service absent → explicit degradation (degraded annotation,
  error attribution naming the cause) or fail closed; **never silent**.
- **Acceptance**: every possibly-absent dependency has a degradation matrix
  (contract doc), and every degradation path has tests.
- **Compliant**: dsh-checkpoint-diff's degraded markers / bad-object
  attribution / trace-replay drift `notes` reporting (kept when the consumer
  packages migrate into the foundation).

## M6. One explicit write path

- **Definition**: every plugin's write path must be explicit in its
  README/SECURITY; path validation (rejecting `..` / absolute paths / symlink
  escapes / protected segments) is a **shared cross-cutting component**, not
  one implementation per write path.
- **Acceptance**: SECURITY.md can be audited line by line; write-path
  validation across plugins shares one source (shared pure functions, not
  copies).
- **Compliant**: the rollback six invariants (`spec/CONTRACT.md` §2) are the
  "explicit boundary" template; `dsh-audit-common`'s pathguard is the single
  path-validation implementation.

## M7. Verifiability

- **Definition**: data is hashable, replayable, reconstructible: content
  addressing (same content = same ref), append-only records, hash chains
  (detect reordering / loss / tampering), trace replay (reconstruct content
  between any two points).
- **Acceptance**: any evidence-class data has a read-only means of verifying
  "it was not changed / not lost"; docs state "verifiable ≠ tamper-proof"
  (hashing is not sealing, not signing; signing is an optional extension).
- **Compliant**: `dsh-audit-common`'s hash (contentHash / recordHash); the
  cdp-snapshots domain's `prevHash` hash chain (draft).

## M8. Compose, don't fork

- **Definition**: reuse harness events and services (`fs/*-intent`, `tools/*`,
  `storageDomain`, `sessionQuery`, `approval`, `webServer`); when coexisting
  with peers, **dual capture + content-addressed dedup** — never fork upstream
  code, never modify upstream repositories.
- **Acceptance**: the package dependency table has no "copied-and-pasted
  upstream source"; coexistence scenarios have dedup tests.
- **Compliant**: this repo only migrates **its own code**
  (dsh-checkpoint-diff's `lib/`, with provenance noted in file headers);
  rewind is a read-only upstream reference, never modified.

## M9. Retention is explicit

- **Definition**: any volatility semantics of stored data (ephemeral /
  persistent / durable tier) must be documented and **annotated on the data
  itself**; quota eviction, gc reclamation, clearable records are all part of
  the semantics, not defects.
- **Acceptance**: storage schemas carry tier/provenance metadata; docs state
  "under what conditions data disappears".
- **Violation**: rewind's quota eviction / `/rewind clear` / gc reclamation
  are never documented → downstream discovers it via degraded markers after
  the fact.
- **Compliant**: the cdp-snapshots domain requires `source`/`tier` (draft);
  nodes are annotated with provenance + persistence tier.

## M10. Ecosystem-friendly release

- **Definition**: package names `dsh-*`; `exports` expose spec and pure
  functions; README bilingual (English default + Chinese translation);
  contract docs are **factual descriptions + a proactive proposal section**;
  dist-tag `dsh-plugin`; changes go to CHANGELOG (Keep a Changelog).
- **Acceptance**: a new plugin can integrate without reading source code
  (schema / layout / semantics docs complete).
- **Compliant**: `dsh-audit-spec`'s exports are the template.

---

## Compliance self-certification checklist (required per package)

1. Data schemas exported from the package (M0) — any file with schemas has
   exports + tests.
2. Responsibility stated in one sentence in the README first paragraph (M1) —
   if it can't be said in one sentence, the responsibility is not single.
3. Write-path table (M6) — write "none" if there is no write path.
4. Degradation matrix (M5) — one row per optional dependency.
5. Provenance declaration (M8) — migrated modules note it in file headers.
6. Volatility semantics (M9) — required for storage-class packages.
