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
  STORE_CLEAR: 'store:clear',

  // ============ Window 监控 ============
  /** 获取当前焦点窗口信息 */
  WINDOW_GET_ACTIVE: 'window:get-active',
  /** 获取所有运行中的应用列表（用于 UI 选择目标 App） */
  WINDOW_GET_RUNNING_APPS: 'window:get-running-apps',
  /** 开始监控焦点变化 */
  WINDOW_START_FOCUS_WATCH: 'window:start-focus-watch',
  /** 停止监控焦点变化 */
  WINDOW_STOP_FOCUS_WATCH: 'window:stop-focus-watch',
  /** 开始追踪目标窗口位置 */
  WINDOW_START_BOUNDS_TRACK: 'window:start-bounds-track',
  /** 停止追踪目标窗口位置 */
  WINDOW_STOP_BOUNDS_TRACK: 'window:stop-bounds-track',
  /** Main → Renderer: 焦点变化通知 */
  WINDOW_FOCUS_CHANGE_PUSH: 'window:focus-change:push',
  /** Main → Renderer: 目标窗口位置变化通知 */
  WINDOW_BOUNDS_CHANGE_PUSH: 'window:bounds-change:push',
  /** 检查屏幕录制权限状态 */
  WINDOW_CHECK_PERMISSION: 'window:check-permission',
  /** 打开系统偏好设置（屏幕录制权限页面） */
  WINDOW_OPEN_PERMISSION_SETTINGS: 'window:open-permission-settings',

  // ============ Overlay 遮罩管理 ============
  /** 激活遮罩层 */
  OVERLAY_ACTIVATE: 'overlay:activate',
  /** 更新遮罩位置 */
  OVERLAY_UPDATE: 'overlay:update',
  /** 停用遮罩层 */
  OVERLAY_DEACTIVATE: 'overlay:deactivate',
  /** 获取遮罩状态 */
  OVERLAY_GET_STATUS: 'overlay:get-status'

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
