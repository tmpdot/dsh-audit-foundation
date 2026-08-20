# dsh-audit-common —— Trust Anchor 公共纯函数库

> **Trust Anchor**（dsh-audit-foundation）的共享纯函数库。**零 DSH 依赖**
> （不 import 任何 @deepseek-ai 包），CI 可直接测试；供基座各插件与生态
> 复用（M4：横切关注点独立实现；M6/M7：唯一实现，禁止各写一份）。

## 模块

| 模块 | 职责 | MDP |
|---|---|---|
| `workspace.mjs` | 工作区键（workspaceKeyOf）/ 快照根解析 / 快照目录名（rewind 同构算法）+ cdp 布局助手（resolveCdpSnapshotRoot / cdpWorkspaceDir / cdpSnapshotDir） | M8（组合不 fork）/ M6 |
| `labels.mjs` | 意图标签：tool/call 事件 → 人类可读 label（路径相对化 / 命令简写 / 别名） | M4 |
| `diff-engine.mjs` | 行级 LCS diff（Uint32Array 全表 + 单元上限降级）+ 二进制检测 | — |
| `pathguard.mjs` | 写路径安全纯函数：normalizeTargetPath / isProtectedRel / resolveInside / classifyRollback / withKeyLock | M6 |
| `hash.mjs` | 内容寻址（contentHash）/ 记录哈希链（recordHash / stableStringify） | M7 |
| `retention.mjs` | 保留策略纯函数（computeRetention：数量/字节配额 → 保留/逐出划分；只算不删） | M9 |
| `constants.mjs` | 词汇表与协议常量（providers / file status / diff ops / limits） | — |

来源：`workspace`/`labels`/`diff-engine`/`pathguard`/`constants` 迁移自
[dsh-checkpoint-diff](https://github.com/tmpdot/dsh-checkpoint-diff) 0.5.x
（文件头注明）；`hash` 为本基座新增。迁入后旧仓不再演进这些模块（D3）。

## 用法

```js
import { workspaceKeyOf, snapshotKeyDir } from 'dsh-audit-common'
import { normalizeTargetPath, resolveInside } from 'dsh-audit-common'
import { diffLines } from 'dsh-audit-common'
import { contentHash, recordHash } from 'dsh-audit-common'
import { computeRetention } from 'dsh-audit-common'
```

## 合规自证（MDP）

- M6：写路径校验唯一实现（pathguard）；任何写路径禁止自写校验。
- M7：哈希唯一实现（hash）；"可验证 ≠ 不可篡改"（不密封、不签名）。
- 无写路径、无数据产出（不拥有 schema——schema 归 dsh-audit-spec）。
