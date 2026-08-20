# dsh-audit-ledger —— 审计记录插件（D5 已拍板：首期做，基础范围）

> **Trust Anchor**（dsh-audit-foundation）的审计记录插件：把 harness 关键事件
> 聚合为追加式审计记录写入 `audit` 域（成对事件聚合 + 哈希链 + 保留策略）。
> **消费 harness 事件，不发明平行语义**（M4/M8）；schema 归
> [dsh-audit-spec](../spec)（M0：禁止同构重声明）。

## 状态

- **骨架 v0.1（2026-08）**：纯函数层已落地（`src/derive.mjs`，零 DSH 依赖，
  CI 可测）；**插件壳（apply / storageDomain 写路径）规划中**——host 侧改动
  需 harness 重启验证，不在本仓 CI 内。

## 写路径（M6，唯一且显式）

| 写路径 | 内容 | 校验 |
|---|---|---|
| `audit` 域（`storageDomain`，表 `records`） | 追加式审计记录（只增不改；`prevHash` 哈希链） | 记录先过 `dsh-audit-spec` 的 `auditRecordSchema`；保留逐出用 `dsh-audit-common` 的 `computeRetention`（只算不删，删归本插件写路径） |

- 只读消费 harness 事件（`approval/*`、`permission/preset`、`tool/*`、
  `checkpoint/*`），不写其他存储（M6 不变量 3）。
- 降级（M5）：事件流缺席 → 明确标注 degraded，绝不静默。

## 职责边界（M1）

- **做**：基础范围——成对事件聚合（tool 成对 / approval 成对）、哈希链、
  保留策略（`auditPolicySchema`，F19）。
- **不做**（留给生态）：高级分析/聚合报表、签名密封（D6）、判定消费
  （F16 由 timeline 消费）。

## 纯函数层用法

```js
import { deriveAuditDrafts } from 'dsh-audit-ledger'
// 会话事件序列 → 审计记录草案（id/seq/time/prevHash 由写路径落盘补齐）
const drafts = deriveAuditDrafts(events, { sessionId })
```

## 合规自证（MDP）

- M0：不重声明 schema——写路径校验用 `dsh-audit-spec` 导出。
- M6：写路径唯一（上表）；路径校验归 `dsh-audit-common` pathguard。
- M7：`prevHash` 哈希链；"可验证 ≠ 不可篡改"（不密封、不签名）。
- M8：复用 harness 事件与服务；不 fork 上游。
- M9：保留语义显式（`auditPolicySchema` 配额 + DOMAINS §3 文档化）。
