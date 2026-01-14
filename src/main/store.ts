/**
 * 持久化配置管理模块
 * 基于 electron-store 实现 Allowlist 和 Settings 的本地存储
 */

import Store from 'electron-store'

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

/**
 * 默认配置值
 */
const defaults: StoreSchema = {
  settings: {
    strictMode: true,
    soundEnabled: true,
    emergencyExitDuration: 10,
    quickTimers: [15, 30, 60],
    version: '1.0.0'
  },
  allowlist: {
    apps: []
  },
  currentSession: null,
  history: [],
  meta: {
    schemaVersion: 1,
    lastUpdatedAt: new Date().toISOString(),
    installDate: new Date().toISOString()
  }
}

/**
 * 创建类型安全的 store 实例
 */
export const store = new Store<StoreSchema>({
  defaults,
  name: 'config'
})

/**
 * Store 工具函数
 */

// 获取当前活动会话
export function getCurrentSession(): CurrentSession | null {
  return store.get('currentSession')
}

// 更新当前会话
export function updateCurrentSession(session: CurrentSession | null): void {
  store.set('currentSession', session)
  store.set('meta.lastUpdatedAt', new Date().toISOString())
}

// 添加历史记录
export function addHistorySession(session: HistorySession): void {
  const history = store.get('history')
  store.set('history', [session, ...history])
  store.set('meta.lastUpdatedAt', new Date().toISOString())
}
