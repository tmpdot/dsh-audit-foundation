// src/constants.mjs — 词汇表与协议常量（零依赖）。
// migrated from dsh-checkpoint-diff@0.5.x (lib/constants.mjs)

// 插件标识与命令名。
export const PLUGIN_NAME = 'checkpoint-diff'
export const COMMAND_NAME = 'diff'
export const DOMAIN_NAME = 'checkpoints'
export const DOMAIN_TABLE = 'checkpoints'

// record.provider 的取值词汇（与 dsh-checkpoint-rewind 的硬契约一致）。
export const PROVIDERS = Object.freeze({
  GIT: 'git',
  COPY: 'copy',
})

// 时间节点寻址词汇（/diff 命令）。
export const ADDRESS_KINDS = Object.freeze({
  LATEST: 'latest',
  ID: 'id',
})

// pre-rewind 保护检查点的 triggerTool 标签（时间线上标注"回退保护"）。
export const PRE_REWIND_TRIGGER = 'rewind'

// 变更型工具名单（与 rewind 默认 mutationTools 一致）。意图命名时用于把
// fs/*-intent 触发的捕获关联到本步的具体工具调用（只读消费，不改 rewind）。
export const MUTATION_TOOLS = Object.freeze([
  'bash',
  'write',
  'edit',
  'str_replace_editor',
  'pwsh',
  'terminal_send',
])

// 文件状态（summary 输出的 A/M/D 词汇，与 git diff-tree name-status 一致）。
export const FILE_STATUS = Object.freeze({
  ADDED: 'A',
  MODIFIED: 'M',
  DELETED: 'D',
})

// 行级 diff 操作类型（引擎输出与 API/UI 共用）。
export const DIFF_OPS = Object.freeze({
  CONTEXT: 'ctx',
  DELETE: 'del',
  ADD: 'add',
})

// webServer 前缀路由（client bundle 用 fetch 访问的 JSON API 根）。
export const API_PREFIX = '/checkpoint-diff'

// 行级 diff 引擎的 LCS 单元上限（超过降级为"全删全加"）。
export const LCS_CELL_LIMIT = 4 * 1024 * 1024

// 命令输出的保护上限（缺省值；Config 可覆盖）。
export const LIMITS = Object.freeze({
  MIN_LIST_LIMIT: 1,
  MAX_LIST_LIMIT: 100,
  MIN_MAX_FILES: 1,
  MAX_MAX_FILES: 1000,
  MIN_MAX_DIFF_LINES: 100,
  MAX_MAX_DIFF_LINES: 20000,
  MIN_MAX_ROLLBACK_FILES: 1,
  MAX_MAX_ROLLBACK_FILES: 10000,
})

// 默认值（Config schema 的默认；cordis.yml 可整体覆盖）。
export const DEFAULTS = Object.freeze({
  ENABLED: true,
  SNAPSHOT_DIR: '',
  GIT_BIN: 'git',
  LIST_LIMIT: 10,
  MAX_FILES: 100,
  MAX_DIFF_LINES: 4000,
  MAX_ROLLBACK_FILES: 1000,
})
