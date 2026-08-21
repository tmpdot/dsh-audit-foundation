# Ecosystem Observation & Alignment (EO) — Dynamic Feedback Process

> **中文版（翻译）**：[ecosystem-observation.zh-CN.md](ecosystem-observation.zh-CN.md) ·
> the English original is the source of truth.

> **Status**: **ratified 2026-08-21** — normative operating mechanism of the MDP General
> Principle. The three proposals in §7 were merged into MDP / technical-selections / AGENTS.md
> on 2026-08-21 (this document is the mechanism reference; the normative text lives in those
> three documents).
>
> **Purpose**: The MDP General Principle ("ecosystem first, industry standards second") states a value
> ordering. This document defines the **mechanism** that keeps that ordering honest over time:
> ecosystem friendliness is a **dynamic adjustment process**, not a static assertion.

---

## 1. Why a process, not a definition

The dsh ecosystem is young and fast-moving: 700–1100+ public repositories under the `dsh-plugin`
topic within days of release, ~145 plugin updates/day across third-party directories, and already
30+ highly homogeneous security/audit plugins competing — with **no official governance layer**
(unified quality/security standard, deep static scan, signature verification, version-compatibility
check).

Under these conditions, a static definition of "what helps the ecosystem" is guaranteed to be wrong
within weeks. What survives is a **feedback loop** with a short cycle time and explicit records.

---

## 2. The feedback loop

| Step | Action | Output / evidence |
|---|---|---|
| **Observe** | Record how real ecosystem plugins actually integrate: manifest shape, event usage, output formats, mistakes made | Observation log (§4); sources with links |
| **Revise** | Update spec semantics only — principle numbers are stable (contract-style evolution); update the stance column of the register | CHANGELOG entries, register diffs |
| **Publish** | Release spec + validators free to the ecosystem (M10: `dsh-*` naming, exports, dist-tag) | npm package, plugin-marketplace listing |
| **Validate** | Two-layer verification against real plugins: **(a) compatibility floor** — real plugins must be able to integrate (necessary gate; prevents ivory-tower specs); **(b) quality ceiling** — the spec author holds design authority, judging against MDP + industry benchmarking; a community shape is one candidate, not the baseline | Integration walk-through + judgment record |

Loop back to **Observe**. Core stance: **observe everything, adopt nothing by default** — observation is 100% of the signal input; adoption is 0% by default, every adoption must pass MDP judgment and record the rationale.

**Validation principle (lesson from dsh-plugin-audit v0.1.x)**: the plugin shipped a sentinel reading
`exec.args` while the host's real execution object carries `exec.arguments` — and its test harness and
manual verification scripts mirrored the *same* wrong assumption, so the green light proved nothing.

> When test doubles and production are driven by the same assumption, a green light proves nothing.
> Validate against the host's real source shape, not against your own understanding.

**Signal, not authority.** Observation records what exists; it does not confer authority. "Exists" is
a candidate, never a baseline. A community plugin's interface shape is "a scheme that happens to
exist" — not necessarily the best scheme. Letting any plugin author hold 100% weight in baseline
design would let the patient prescribe the treatment: the exact ailment MDP exists to cure (missing /
wrong / excessive interfaces, M0–M4). Incumbency is not correctness; precedence is not authority.
Every round separates two questions:

- **"Can the ecosystem connect?"** — compatibility; necessary; driven by real plugins (floor).
- **"Is this design right?"** — quality; judged by the spec author against MDP + industry
  benchmarking; community shapes are candidates, never the baseline (ceiling).

---

## 3. Arbitration defaults (initial parameters of the loop, not final truth)

When the three dimensions of the General Principle conflict (interface alignability M0/M3, harness
event vocabulary M8, consumer composability M3), use this default weighting — **starting parameters,
adjusted by observation**:

1. **Harness event vocabulary (M8)** — hard constraint: never distort the host's original event
   names and semantics.
2. **Incumbent consumer zero-migration (M3)** — hard constraint: no isomorphic re-declaration, no
   forced migration.
3. **New-plugin onboarding cost** — soft: lower onboarding friction is preferred but not decisive.
4. **Third-party interop (T1–T3 standards)** — soft: partial alignment is the default stance.

Any deviation from this order must be recorded together with the observation that triggered it
(what changed in the ecosystem, what we saw).

Community shapes enter the **candidate pool** (mirror of the benchmarking reference pool,
technical-selections §4) — they are inputs to judgment, never auto-promoted to the spec.

---

## 4. Observation log (seeded 2026-08-21)

> Log entries are **candidate signals**, not norms. Promotion to the spec requires passing MDP
> judgment + recording the rationale.

| Date | Observed | How it integrated | Mistake / gap | Spec revision triggered | Protected point |
|---|---|---|---|---|---|
| 2026-08 | dsh-plugin-audit v0.1.x | sentinel on `tools/pre-execute` | guessed host shape: `exec.args` vs `exec.arguments` (P0) | validate against real host shapes | M8/M3 interface-shape export |
| 2026-08 | 30+ audit/security plugins | ad-hoc output formats | each plugin defines its own report/verdict shape → data silos | shared audit-domain schema | M0 no-isomorphic-redeclaration |
| 2026-08 | audit/security plugin category | permission profile / verdict JSON | no permission-declaration step at install; `dsh plugin add` grants full permissions | shared permission-profile event format | M4/M8 consume harness events |
| 2026-08 | storage-class plugins generally | quota/eviction undocumented | data-disappearance semantics discovered post-hoc | tier/provenance annotation | M9/M5 explicit semantics |
| 2026-08 | dsh-checkpoint-diff timeline panel vocabulary | reused as the view-model draft baseline (branchId / A-M-D / markers) | single implementer's legacy vocabulary nearly became the spec baseline | view contract redesigned independently (intuitive + render-performance, T4-4 decided 2026-08-21); single-implementer vocabulary is not a standard | M0/M3 interface-shape authority |
| 2026-08 | `eventType` verbatim passthrough in the audit domain (T4-3) | harness events stored as original text in `audit.records.eventType` | migrating to numeric mapping grows costlier as history accumulates and code solidifies — and the append-only ledger + hash chain forbid rewriting old records (a data migration would be impossible, not just expensive) | read-path migration groundwork (2026-08-21): `common/event-registry.mjs` registry + provisional seeds (private range, never persisted) + `isFrozenEventType` write gate; optional `eventTypeId` in record/view schemas (additive, backward compatible); derive hook attaches codes only for frozen/official events — official mapping lands as a data swap + flag flip, consumers zero-change | M8 vocabulary kept verbatim forever; storage format frozen; unknown events stay text-only passthrough (M8 "everything is a plugin") |

---

## 5. Falsifiability: from rationale to testable claims

Every register row that is not fully aligned must carry, in addition to the stance rationale, a
**falsifiable claim + verification method**, e.g.:

> Claim: a new plugin can integrate without reading source code (schema/layout/semantics docs complete).
> Verify: integration walk-through using only README + exported schemas (M10 acceptance).
> Note: the real-plugin walk-through is a **necessary** condition (compatibility floor), not a
> sufficient one — compatibility alone does not promote a shape to the spec; design quality is
> judged separately against MDP (quality ceiling).

> Claim (T4-3 groundwork): adopting an official numeric mapping later costs a data swap + flag flip,
> never a record rewrite or consumer code change.
> Verify: (a) `deriveAuditDrafts` output is identical today to the pre-groundwork shape when no
> frozen entries exist (`eventTypeId` absent — no observable change); (b) registering a frozen entry
> via `defineEventTypes` makes the derive hook emit `eventTypeId` with zero changes elsewhere
> (covered by `packages/common/test/event-registry.test.mjs` + `packages/audit-ledger/test/derive.test.mjs`).
> Falsifiable counter: any historical record being rewritten, or any consumer needing changes to
> consume the new codes, disproves the design.

A deviation whose claim cannot be stated falsifiably is not a decision — it is an excuse.

---

## 6. Relationship to existing documents

- **MDP General Principle**: states the value ordering (the "why"). This document: the operating
  mechanism (the "how").
- **technical-selections.md rule 5**: the stance-recording obligation. This document: what to record
  (observation + revision + protection) and how to verify.
- **README "Philosophy" section**: developer-facing positioning. This document: the process behind it.

---

## 7. Normative status (ratified 2026-08-21)

All three proposals below were merged on 2026-08-21:

1. **MDP General Principle acceptance criterion** (merged into `spec/MDP.md`): every round
   involving ecosystem-facing decisions must answer "what did we observe, what did we revise,
   what did we protect"; validation is two-layer (compatibility floor + quality ceiling); core
   stance "observe everything, adopt nothing by default". A new violation example: following
   the most popular plugin's shape instead of judging (incumbency deciding the spec).
2. **technical-selections.md rule 5** (merged): each deviation row carries a falsifiable
   claim + verification method; two-layer validation (real-plugin integration is the
   compatibility floor, never 100% weight); community shapes enter the candidate pool (§4),
   never auto-promoted.
3. **AGENTS.md development loop** (merged): references this document as the
   observation-channel input; the observation log is updated each round (record newly
   observed integration patterns/mistakes with links).
