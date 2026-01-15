/**
 * 共享类型定义
 * 供主进程和渲染进程共同使用
 */

// ============ Store API 类型 ============

/**
 * 类型安全的 Store API 接口
 *
 * 通过泛型约束确保 key 和 value 的类型匹配，
 * 避免运行时因类型不匹配导致的错误。
 */
export interface TypedStoreAPI {
  /**
   * 获取指定 key 的值
   * @param key - StoreSchema 的顶层 key
   * @returns 对应 key 的值
   */
  get: <K extends keyof StoreSchema>(key: K) => Promise<StoreSchema[K]>

  /**
   * 设置指定 key 的值
   * @param key - StoreSchema 的顶层 key
   * @param value - 对应 key 的值类型
   */
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => Promise<void>

  /**
   * 删除指定 key
   * @param key - StoreSchema 的顶层 key
   */
  delete: <K extends keyof StoreSchema>(key: K) => Promise<void>

  /**
   * 清空所有配置（重置为默认值）
   */
  clear: () => Promise<void>
}

// ============ 业务类型定义 ============

/**
 * 会话状态枚举
 */
export type SessionStatus =
  | 'idle'
  | 'active'
  | 'paused'
  | 'completed'
  | 'aborted'
  | 'emergency_exit'

/**
 * 违规记录类型
 */
export interface Violation {
  // 违规时间戳
  timestamp: string
  // 尝试切换到的应用
  attemptedApp: string
  // 采取的动作
  action: 'force_refocus' | 'warning'
}

/**
 * 白名单应用类型
 */
export interface AllowlistApp {
  // Bundle ID (macOS) 或进程名 (Windows)
  id: string
  // 应用名称
  name: string
  // 是否为主要聚焦应用
  isPrimary: boolean
  // 添加时间
  addedAt: string
}

/**
 * 当前会话状态
 */
export interface CurrentSession {
  // 会话唯一标识
  id: string
  // 目标应用 ID
  targetAppId: string
  // 预设时长（分钟）
  durationMinutes: number
  // 开始时间
  startedAt: string
  // 会话状态
  status: SessionStatus
  // 剩余秒数
  remainingSeconds: number
  // 违规记录列表
  violations: Violation[]
}

/**
 * 历史会话记录
 */
export interface HistorySession {
  // 会话唯一标识
  id: string
  // 目标应用 ID
  targetAppId: string
  // 目标应用名称（冗余字段，方便展示）
  targetAppName: string
  // 预设时长（分钟）
  durationMinutes: number
  // 实际完成时长（分钟）
  actualMinutes: number
  // 开始时间
  startedAt: string
  // 完成时间
  completedAt: string
  // 会话结束状态
  status: Extract<SessionStatus, 'completed' | 'aborted' | 'emergency_exit'>
  // 违规次数汇总
  violationsCount: number
}

/**
 * 应用配置的类型定义
 */
export interface StoreSchema {
  // 用户偏好设置
  settings: {
    // 是否强制拉回焦点（核心开关）
    strictMode: boolean
    // 音效开关
    soundEnabled: boolean
    // 紧急退出按键时长（秒）
    emergencyExitDuration: number
    // 快速计时器预设（分钟）
    quickTimers: number[]
    // 配置版本号（用于数据迁移）
    version: string
  }
  // 允许列表配置
  allowlist: {
    // 白名单应用列表（MVP 阶段限制最多 2 个）
    apps: AllowlistApp[]
  }
  // 当前会话状态（运行时状态）
  currentSession: CurrentSession | null
  // 历史会话记录
  history: HistorySession[]
  // 元数据（系统级）
  meta: {
    // 数据结构版本号
    schemaVersion: number
    // 最后更新时间
    lastUpdatedAt: string
    // 安装日期
    installDate: string
  }
}
