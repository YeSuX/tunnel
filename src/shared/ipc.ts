/**
 * IPC 通道定义
 *
 * 集中管理所有 Main Process 与 Renderer Process 之间的通信通道名称，
 * 确保两端使用一致的通道名，避免硬编码字符串带来的拼写错误风险。
 */

/**
 * IPC 通道常量
 *
 * 命名规范：`模块:操作` 或 `模块:操作:方向`
 * - 无方向后缀：Renderer → Main (invoke/handle)
 * - `:push` 后缀：Main → Renderer (send/on)
 */
export const IPC_CHANNELS = {
  // ============ Store 操作 ============
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_DELETE: 'store:delete',
  STORE_CLEAR: 'store:clear'

  // ============ Session 管理（Phase 2） ============
  // SESSION_START: 'session:start',
  // SESSION_PAUSE: 'session:pause',
  // SESSION_RESUME: 'session:resume',
  // SESSION_ABORT: 'session:abort',
  // SESSION_TICK_PUSH: 'session:tick:push',           // Main → Renderer: 倒计时更新

  // ============ Focus 监控（Phase 2） ============
  // FOCUS_VIOLATION_PUSH: 'focus:violation:push',     // Main → Renderer: 违规通知

  // ============ Emergency Exit（Phase 2） ============
  // EMERGENCY_PROGRESS_PUSH: 'emergency:progress:push', // Main → Renderer: 长按进度
} as const

/**
 * IPC 通道类型
 * 用于类型约束，确保只能使用已定义的通道
 */
export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * Store 操作相关的 IPC 通道
 */
export type StoreIpcChannel = (typeof IPC_CHANNELS)[
  | 'STORE_GET'
  | 'STORE_SET'
  | 'STORE_DELETE'
  | 'STORE_CLEAR']
