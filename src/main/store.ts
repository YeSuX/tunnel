/**
 * 持久化配置管理模块
 * 基于 electron-store 实现 Allowlist 和 Settings 的本地存储
 */

import Store from 'electron-store'
import type { StoreSchema, CurrentSession, HistorySession } from '../shared/types'

// 重新导出类型，方便主进程其他模块使用
export type {
  SessionStatus,
  Violation,
  AllowlistApp,
  CurrentSession,
  HistorySession,
  StoreSchema
} from '../shared/types'

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
