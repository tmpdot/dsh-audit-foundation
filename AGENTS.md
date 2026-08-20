# AGENTS.md — dsh-audit-foundation（Trust Anchor）

面向 AI 编码代理（与人类）的仓库治理文档。**先读 `spec/MDP.md`**——本仓库的
最高规范是最小设计原则（MDP），所有包必须自证合规；本文是它的落地条款。

## 项目是什么

DeepSeek Harness 生态的**安全与审计基座**（理念名 Trust Anchor）：规范包 +
最小职责插件。规范锚点在 `spec/`（MDP / CONTRACT / DOMAINS + 纯 zod 校验器），
插件在 `packages/`。设计决策记录在 `docs/bundle-foundation-design.md`
（D1 命名 / D2 monorepo / D3 diff 轻维护+复用 已拍板；D4–D8 待拍板）。

## 非协商条款

1. **MDP 是最高规范**（`spec/MDP.md`）。任何包/PR 必须能逐条回答 M0–M9 的
   判定标准；spec 校验器必须从包导出，**禁止同构重声明**（M0）——消费方
   `import` 本仓库导出的 schema，不复制。
2. **写路径单一且边界显式**（M6）。每个包的写路径必须在其 README/SECURITY
   明示；路径校验一律用 `dsh-audit-common` 的 `pathguard`（提取自
   dsh-checkpoint-diff 的 rollback 安全层），**不各写一份**。回滚六不变量见
   `spec/CONTRACT.md` §2，任何"恢复工作区"的实现必须遵循。
3. **只读消费 harness 服务**（M8）。`ctx.get('sessionQuery')` 等一律**每次
   请求现取**（getter 传入，绝不一次性捕获——diff 仓库踩过的竞态教训）；
   不 inject 一次性快照；复用 harness 事件（`fs/*-intent`、`tools/*`、
   `approval/*`、`permission/preset`），不发明平行语义。
4. **不 fork 上游代码**（M8）。本仓库模块若来自
   [dsh-checkpoint-diff](https://github.com/tmpdot/dsh-checkpoint-diff) 迁移，
   必须在文件头注明来源（`migrated from dsh-checkpoint-diff@0.5.x (lib/…)`）；
   迁入后旧仓不再演进该模块（D3）。不修改
   [dsh-checkpoint-rewind](https://github.com/PerryLink/dsh-checkpoint-rewind)，
   它是只读上游参考。
5. **身份**：所有提交使用 `tmpdot <144113873+tmpdot@users.noreply.github.com>`。
   仓库归属 `tmpdot/dsh-audit-foundation`（GitHub 注册为待办，见 HANDOFF 流程）。
6. **Token 卫生**：任何 token 绝不写入仓库文件；只用环境变量或一次性
   `git -c http.extraheader=...`。
7. **写文件编码**：禁止 PowerShell `Set-Content -Encoding utf8`（BOM 破坏
   JSON/CI）；用 write/edit 工具或 `[System.IO.File]::WriteAllText(…, UTF8Encoding($false))`。
8. **版本策略**：0.x 慢节奏，批功能成 minor；**1.0.0 保留给 spec 冻结**
   （MDP + 域 spec + CONTRACT 完备且冻结，无已知 P0 债务），不是版本计数器目标。

## 仓库布局

```
spec/                规范包 dsh-audit-spec（MDP.md / CONTRACT.md / DOMAINS.md / src/ 校验器）
packages/common/     纯函数库 dsh-audit-common（workspace / labels / diff-engine /
                     pathguard / hash —— 全部零 DSH 依赖，CI 可测）
packages/*           插件包（规划：producer / audit-ledger / timeline / rollback /
                     trace / evidence-export / guard-hints）
docs/                设计决策（bundle-foundation-design.md 等）
```

## 开发循环

```bash
pnpm install
pnpm test             # 全部包 node --test（--test-isolation=none）
pnpm test:spec        # 仅规范包
pnpm test:common      # 仅公共库
```

- 纯函数与 schema 必须零 DSH 依赖（CI 无法解析 @deepseek-ai 包）——这是
  spec/common 两包可测试的前提。
- 每条降级路径都要有测试（服务缺席、记录缺失、介质损坏、哈希不匹配）。
- 发布：每包独立 `npm publish`（prepack 自动跑测试）→ profile 组合安装 →
  tag + `dsh-plugin` dist-tag；host 侧改动需 harness 重启，纯客户端改动刷新页面。

## 迁移来源清单（D3 落地）

| 新仓模块 | 来源（dsh-checkpoint-diff） |
|---|---|
| `spec/src/checkpoints.mjs` | `lib/domain-schema.mjs`（checkpoints 域 v1/v2 容错超集） |
| `packages/common/src/constants.mjs` | `lib/constants.mjs`（词汇表） |
| `packages/common/src/workspace.mjs` | `lib/workspace.mjs`（workspaceKey / 快照布局） |
| `packages/common/src/labels.mjs` | `lib/labels.mjs`（意图标签） |
| `packages/common/src/diff-engine.mjs` | `lib/diff/engine.mjs`（行级 LCS） |
| `packages/common/src/pathguard.mjs` | `lib/rollback.mjs`（路径校验纯函数） |
