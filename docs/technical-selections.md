# Technical Selections Register

> **中文版（翻译）**：[technical-selections.zh-CN.md](technical-selections.zh-CN.md) ·
> the English original is the source of truth.

> **Purpose**: one-stop registration and decision status for all key technical selections in
> this repository — the user asked that "key technical selections be visible in the
> documentation"; this table is the landing point. **Any new selection must be registered
> before execution (or registered at execution)**.
> Workflow approved by the user on 2026-08-20 (full version); decision records in
> `docs/bundle-foundation-design.md` (§10).
> Philosophy calibration (2026-08): **ecosystem first, industry standards second** — new rule 5
> (ecosystem-conflict exception) added; the originally approved workflow is unchanged.

---

## 1. Workflow (decided, approved by the user on 2026-08-20)

**Tiered classification:**

| Tier | Definition | Disposition | Recording requirement |
|---|---|---|---|
| **T1** | Formal standard (RFC / ISO / OASIS / W3C / FIPS, etc.) | **Execute directly, without asking the user** (ecosystem-conflict exception, see rule 5) | Standard name + version + link |
| **T2** | De-facto standard (no formal number but widely adopted in the industry: JSON Lines, git object model, unified diff, etc.) | **Execute directly, without asking the user** (ecosystem-conflict exception, see rule 5) | Name + reference link |
| **T3** | Industry convention (no standard or name but consistent mainstream practice: append-only logs, hash chains, content addressing, UTC epoch-ms, etc.) | Execute directly (ecosystem-conflict exception, see rule 5) | Convention description + representative case |
| **T4** | No standard or convention (field naming, schema shape, view model shape, quota semantics, etc.) | ① Collect similar plugin approaches from the DSH ecosystem ② Collect similar industry approaches → record the benchmarking stance → **execute by best judgment first** → add to the pending-decision list | Benchmarking conclusion + stance (aligned / partial alignment / not adopted) + rationale + link |

**Rules:**

1. **Verify**: classifying T1/T2 requires verifying the standard's original text and current
   version with web_search; the link goes into the register; never write a standard from memory.
2. **Conflict**: competing standards (e.g., field naming ECS vs OCSF) → choose the one **most
   beneficial to the ecosystem** (usually the industry leader), map the rest to optional
   fields, and record the tradeoff rationale; tradeoffs are likewise constrained by rule 5
   (ecosystem priority).
3. **Gate**: selections under T4 that affect the **external contract shape** (domain schema /
   view model / endpoint) **must be decided before the contract freeze (1.0.0 gate)**;
   internal implementation details can be decided after execution — no gate.
4. **Reminder**: at the end of every round involving a selection, list the "pending your
   decision" items at the end of the reply; before committing, check the register and name any
   new T4 in the commit message. The authoritative pending-decision list is register §2 — keep
   it in sync there (HANDOFF.md, if used locally, is a per-developer working note and is
   git-ignored).
5. **Ecosystem first (calibrated 2026-08)**: **standards are a means; the ecosystem is the
   end**. The "execute directly" of T1–T3 applies only when adopting a standard does **not
   harm ecosystem alignment**; if it does — interface alignability (M0/M3), the harness event
   vocabulary must not be distorted (M8), consumer composability — then **deviate from the
   standard and record the rationale**, with "partial alignment" as the default stance
   (alignment degree + deviation points + what was protected, into the stance column of the
   register). Any row that is not fully aligned must state clearly "what was deviated from and
   which point of the ecosystem was protected"; no implicit deviation may remain.
   **Ecosystem alignment is a dynamic feedback process, not a static assertion** — the
   mechanism is `docs/ecosystem-observation.md` (observe → revise → publish → validate; the
   observation log is the input channel). Two binding requirements on top of the recording
   obligation:
   - **Falsifiable claims**: every row that is not fully aligned carries, in addition to the
     rationale, a falsifiable claim + verification method (e.g. "a new plugin can integrate
     without reading source: verify by walk-through using only README + exported schemas").
     A deviation whose claim cannot be stated falsifiably is not a decision — it is an excuse.
   - **Two-layer validation**: real-plugin integration is the **compatibility floor**
     (necessary, prevents ivory-tower specs) but never 100% weight — a community plugin's
     shape is "a scheme that happens to exist", not necessarily the best scheme. Design
     authority stays with the spec author, judging against MDP + industry benchmarking
     (**quality ceiling**). Community shapes enter the candidate pool (§4), never
     auto-promoted. Core stance: **observe everything, adopt nothing by default**.

---

## 2. Pending-your-decision list (T4, ★ = must be decided before the contract freeze)

| # | Topic | Current status | Benchmarking stance | Gate |
|---|---|---|---|---|
| T4-1 | Snapshot carrier | ✅ **decided 2026-08-21 (user approved)** — copy directory + manifest + content-addressed ref (sha256) adopted as proposed; layout helper + manifest schema landed (2026-08) | **Collected**. Ecosystem: rewind copy provider (snapshot directory + manifest.json, same-shape layout as this repo). Industry: git object model ([content-addressed loose objects](https://git-scm.com/book/zh/v2/Git-内部原理-Git-对象), unreferenced objects reclaimed by gc — the pit rewind hit), restic ([CDC content-defined chunking + snapshot dedup](https://restic.net/blog/2015-09-12/restic-foundation1-cdc/)), casync ([content-addressed chunked archives](https://github.com/systemd/casync)). **Stance: partial alignment** — adopt "directory snapshot + self-describing manifest + content-addressed ref (sha256)" (same-origin idea as git/restic/casync); not adopted: git loose-object storage (gc reclamation risk) and block-level CDC (not committed at the base scope; left to the ecosystem) | ★ ✅ decided |
| T4-2 | schema validator | zod ^4.4.3 (the spec's only dependency, already used during the skeleton phase) | Collection pending: JSON Schema + ajv (industry de-facto standard), io-ts, valibot | — |
| T4-3 | Audit record field naming | ✅ **decided 2026-08-21** — keep original `eventType` (verbatim harness event name) for now; **direction: public plugin-action → numeric mapping** (feasible via ecosystem cohesion — the spec's value uplift benefits everyone — or official endorsement), recorded as the evolution path; audit domain draft v1 + audit policy (F19) + ledger-derived pure functions landed (2026-08) | **Collected**. Industry: OCSF ([category/class/type_id classification structure](https://fleak.ai/blog/ocsf-anatomy), OASIS actively evolving 1.4+), ECS ([event.category/action/outcome categorization fields](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html)), CEF (pipe-delimited traditional SIEM format, [spec](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/pdf-docbook/CEF-Specification.pdf)), syslog (RFC 5424 text protocol). **Stance: partial alignment** — adopt the two-level classification "category (broad) + eventType (original event name, verbatim harness event)" (isomorphic with OCSF category/class, ECS category/action); not adopted: CEF/syslog text protocols (different storage domain). eventType keeps the harness original name, no invented numbering today — **the cost of "everything is a plugin"** (any plugin's own operation must be storable as-is); the numeric mapping is the future direction once the ecosystem coheres | ★ ✅ decided |
| T4-4 | View model shape | ✅ **decided 2026-08-21** — **exclude dsh-checkpoint-diff vocabulary** (single-implementer legacy, not an ecosystem standard); fields redesigned for **intuitiveness + UI render performance** (flat self-contained records, precomputed stats, truncated/total exposed up front, stable string ids, epoch-ms numerics, pre-derived title/summary); draft v2 landed in `spec/src/views.mjs` (2026-08, with tests) | **Collected**. Ecosystem: dsh-checkpoint-diff timeline panel vocabulary (records[].id/degraded/branchId, files[].path+status A/M/D, truncated/totalFiles, markers) — **not adopted** (user ruling 2026-08-21: exclude its influence; a single implementer's panel vocabulary must not become the spec baseline). Industry: no unified view contract (Kibana / Sentry / Grafana all product-internal contracts; OCSF / [ECS categorization fields](https://www.elastic.co/guide/en/ecs/8.8/ecs-using-the-categorization-fields.html) are storage/transport-layer schemas); unified diff is a T2 de-facto format at the text layer ([diff package parses git dialects](https://cdn.jsdelivr.net/npm/diff@9.0.0/README.md)), structured diff JSON has no standard ([jsondiffpatch deltas](https://raw.githubusercontent.com/benjamine/jsondiffpatch/master/docs/deltas.md) is a community format). **Stance: not adopted** for industry product JSON; fields keep this repo's domain vocabulary (camelCase, intuitive full words: path / status added-modified-deleted / type context-deleted-added), hunk semantics aligned with unified diff; render-performance design rules recorded in `spec/src/views.mjs` header | ★ ✅ decided |

---

## 3. Technical selections register

| # | Topic | Selection | Tier | Basis / link | Status | Date |
|---|---|---|---|---|---|---|
| S1 | Timestamps | UTC epoch milliseconds, uniform internally; RFC 3339 / ISO 8601 for human-readable display | T3 (display layer T1) | Design doc §4 "time/clock"; [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) | Implemented (spec draft semantics) | 2026-08 |
| S2 | Content addressing hash | SHA-256 | T1 | [FIPS 180-4](https://csrc.nist.gov/pubs/fips/180-4/final); cdp-snapshots `ref` field, common/hash.mjs | Implemented | 2026-08 |
| S3 | Hash chain | `prevHash` chained record by record (first is null; detects reordering / missing / tampering) | T3 | Design doc M7; cdp-snapshots / audit domain draft | Implemented (draft) | 2026-08 |
| S4 | Record stream format | JSON Lines (aligned with harness `session.jsonl`) | T2 | [jsonlines.org](https://jsonlines.org/) | Implemented | 2026-08 |
| S5 | Compression | zstd (harness already uses `session.jsonl.zstd`; the foundation only consumes it read-only) | T1 | [RFC 8878](https://www.rfc-editor.org/rfc/rfc8878) | Implemented (aligned with harness) | 2026-08 |
| S6 | diff algorithm | Line-level LCS (common/diff-engine, migrated from dsh-checkpoint-diff) | T3 | The unified diff display format is a T2 convention ([GNU diffutils docs](https://www.gnu.org/software/diffutils/manual/)) | Implemented | 2026-08 |
| S7 | Snapshot carrier | copy directory + manifest (no git refs written) | T4 | See T4-1 | **Decided 2026-08-21 (user approved)** | 2026-08 |
| S8 | schema validator | zod v4 | T4 | See T4-2 | **Pending decision** | 2026-08 |
| S9 | Audit record field naming | audit domain draft v1 (category/eventType/payload/prevHash/identity fields) | T4 | See T4-3 | **Decided 2026-08-21 (original eventType kept; numeric mapping = future direction)** | 2026-08 |
| S10 | View model | D9 direction decided (spec exports view schemas; `dsh-audit-ui` consumes only view models) | T4 | See T4-4 | **Decided 2026-08-21 (excludes dsh-checkpoint-diff vocabulary; intuitive + render-performance fields)** | 2026-08 |
| S11 | Snapshot layout | `$DSH_HOME/dsh-audit-foundation/snapshots/<workspaceKeyHash16>/<uuid>/` | T3 | Same-shape layout as rewind copy (same algorithm in common/workspace.mjs) | Implemented (draft) | 2026-08 |
| S12 | Export format | Phase-1 JSON + MD; SARIF left to the ecosystem (D7) | T1 (JSON/MD) | [SARIF 2.1.0 OASIS standard](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) (ecosystem-optional position; not adopted for the foundation's phase-1 scope) | Decided | 2026-08 |

---

## 4. Benchmarking reference pool (under evaluation, not selections)

> Candidate pool of industry approaches: when performing T4 collection, source and verify
> material from here; additions welcome.

| Candidate | Type | Link / note |
|---|---|---|
| OCSF (Open Cybersecurity Schema Framework) | Formal standard (OASIS, actively evolving 1.4+) | [schema.ocsf.io](https://schema.ocsf.io/); [1.4.0 change notes](https://www.query.ai/resources/blogs/whats-new-ocsf-1_4_0/) |
| SARIF | Formal standard (OASIS 2.1.0, 2020) | [Specification text](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) |
| ECS (Elastic Common Schema) | De-facto standard | [www.elastic.co/guide/en/ecs](https://www.elastic.co/guide/en/ecs/current/index.html) |
| CEF (ArcSight Common Event Format) | De-facto standard (traditional SIEM format) | [ArcSight docs](https://www.microfocus.com/documentation/arcsight/arcsight-smartconnectors-8.3/pdf-docbook/CEF-Specification.pdf) |
| syslog | Formal standard | RFC 5424 |
| JSON Lines / NDJSON | De-facto standard | [jsonlines.org](https://jsonlines.org/) |
| git object model | De-facto standard (content addressing) | git-scm docs |
| restic / casync / Nix store | Industry approach (snapshot / content-addressed storage) | Verified during T4-1 collection |
