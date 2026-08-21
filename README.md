# Trust Anchor — dsh-audit-foundation

> **中文版（翻译）**：[README.zh-CN.md](README.zh-CN.md) · the English original is
> the source of truth.

> **Trust Anchor**: the **security & audit foundation** of the DeepSeek Harness
> ecosystem. One set of principles (MDP), one spec package, and a set of
> minimal-responsibility plugins that nail down the interfaces of the whole
> flow — "policy → enforcement → evidence → storage → query → presentation →
> response → audit consumption" — so ecosystem plugins fit **seamlessly**: no
> extra features, no missing features, no mis-shaped interfaces.

## Philosophy: Ecosystem First, Industry Standards Second

**Standards are a means; the ecosystem is the end.** This project follows
industry standards by default (formal / de-facto / convention — T1–T3 in
[`docs/technical-selections.md`](docs/technical-selections.md); standards are
themselves ecosystem assets: interoperability, tooling, discoverability). But
when adopting a standard would **harm ecosystem alignment** — interface
alignability, keeping the harness's original event vocabulary, consumer
composability — we **deviate from the standard and record the rationale;
"partial alignment" is the default stance**. Examples: the audit field
classification partially aligns with OCSF/ECS while keeping the harness event
names verbatim; the snapshot carrier does not use git loose objects, so
snapshot data is not reclaimed by gc.

The ecosystem lacks not more features but **alignable interfaces**: this
foundation pins down the interfaces, exports them from packages, and provides
validators for free (M0) — the cure for the "did too much / did too little /
exposed the wrong interface" disease.

## Positioning

- **Spec anchor**: the Minimal Design Principles
  ([`spec/MDP.md`](spec/MDP.md)) and domain specs
  ([`spec/DOMAINS.md`](spec/DOMAINS.md), [`spec/CONTRACT.md`](spec/CONTRACT.md))
  are standards the ecosystem can follow and validate against — not the product
  of negotiation: reference implementation + zod validators exported from
  packages (M0: no isomorphic redeclaration).
- **Reference implementation**: every package in this repo is the strictest MDP
  follower (dogfooding).
- **Not afraid to reinvent wheels**: plugin slots in the ecosystem with fuzzy
  boundaries and inconsistent interfaces are covered by this foundation's
  normalized reference implementations; wheels the harness core already has
  (sandbox / approval / storageDomain / sessionQuery) are reused, not rebuilt.

## Repository layout

```
spec/                    Spec package (npm: dsh-audit-spec, not a plugin)
  MDP.md                 Minimal Design Principles (normative: General Principle
                         (ecosystem first) + M0–M10)
  CONTRACT.md            Foundation contracts (domain consumption / rollback
                         floor / API surface)
  DOMAINS.md             Domain specs: checkpoints (stable) / cdp-snapshots v1
                         (draft) / audit v1 (draft) + event vocabulary
  src/                   Pure zod validators (exported from the package,
                         zero DSH dependencies)
packages/
  common/                Common pure-function library (npm: dsh-audit-common,
                         zero DSH dependencies)
    workspace            Workspace key / snapshot layout (rewind-compatible +
                         migration provenance)
    labels               Intent labels (tool call → human-readable label)
    diff-engine          Line-level LCS diff engine
    pathguard            Write-path safety pure functions (M6: shared by all
                         write paths)
    hash                 Content addressing / hash chains (M7)
  … (producer / audit ledger / timeline / rollback / export / guard-hints —
    planned)
```

## Package list (planned — see docs/bundle-foundation-design.md)

| Package | Responsibility (one concern) | Write path |
|---|---|---|
| `dsh-audit-spec` | Spec + validators | none |
| `dsh-audit-common` | Pure-function library | none |
| `dsh-checkpoint-producer` (planned) | Durable pre-change snapshots + hash chain + retention | own domain `cdp-snapshots` + own directory |
| `dsh-audit-ledger` (skeleton built; D5 decided) | Audit event aggregation records (derived pure functions landed; plugin shell planned) | own domain `audit` |
| `dsh-checkpoint-timeline` / `rollback` / `dsh-trace` / `dsh-evidence-export` / `dsh-guard-hints` (planned) | Consumer-side split (migrated from dsh-checkpoint-diff) | only rollback writes the workspace |
| `dsh-audit-ui` (planned, D9) | Presentation components (timeline / diff / audit view / export preview); consumes only spec view models, never reads storage domains | none |

## Status

Skeleton v0.1 (2026-08): root config + spec package (checkpoints validator
migrated; cdp-snapshots / audit / events as draft schemas) + common package
(workspace / labels / diff-engine / pathguard / hash migrated). Decision
records: [docs/bundle-foundation-design.md](docs/bundle-foundation-design.md)
(D1 naming `dsh-audit-foundation`, D2 monorepo, D3 diff light-maintenance +
reuse; directions decided: D4 no gating, D5 ledger first-phase basic scope,
D6 no signing promise, D7 SARIF left to the ecosystem, D9 UI/data separation +
reusable UI; D8 GitHub repo creation is a TODO).

## Development

```bash
pnpm install
pnpm test          # all packages (node --test, --test-isolation=none)
```

Release: `npm publish` (per package, independent version lines); `dsh-plugin`
dist-tag; spec freeze = 1.0.0 gate.
