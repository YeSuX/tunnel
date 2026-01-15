/**
 * Store Hook - 在 Renderer 进程中使用配置持久化
 *
 * 使用示例：
 *
 * ```tsx
 * import { useStore } from '@/hooks/useStore'
 *
 * function Settings() {
 *   const { allowlist, settings, updateSettings, addToAllowlist } = useStore()
 *
 *   return (
 *     <div>
 *       <input
 *         type="checkbox"
 *         checked={settings.strictMode}
 *         onChange={(e) => updateSettings({ strictMode: e.target.checked })}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect } from 'react'
import type {
  StoreSchema,
  AllowlistApp,
  CurrentSession,
  HistorySession
} from '../../../shared/types'

// 从 StoreSchema 中提取 Settings 类型
type Settings = StoreSchema['settings']

export function useStore(): {
  // 白名单应用列表
  allowlist: AllowlistApp[]
  // 用户设置
  settings: Settings
  // 当前会话
  currentSession: CurrentSession | null
  // 历史记录
  history: HistorySession[]
  // 白名单操作
  addToAllowlist: (app: AllowlistApp) => Promise<void>
  removeFromAllowlist: (appId: string) => Promise<void>
  // 设置操作
  updateSettings: (partial: Partial<Settings>) => Promise<void>
  // 会话操作
  updateCurrentSession: (session: CurrentSession | null) => Promise<void>
} {
  const [allowlist, setAllowlist] = useState<AllowlistApp[]>([])
  const [settings, setSettings] = useState<Settings>({
    strictMode: true,
    soundEnabled: true,
    emergencyExitDuration: 10,
    quickTimers: [15, 30, 60],
    version: '1.0.0'
  })
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null)
  const [history, setHistory] = useState<HistorySession[]>([])

  // 初始化加载配置
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      // 类型安全：返回类型根据 key 自动推断
      const [loadedAllowlist, loadedSettings, loadedSession, loadedHistory] = await Promise.all([
        window.api.store.get('allowlist'),
        window.api.store.get('settings'),
        window.api.store.get('currentSession'),
        window.api.store.get('history')
      ])

      // 默认值，确保旧数据也有新字段
      const defaultSettings: Settings = {
        strictMode: true,
        soundEnabled: true,
        emergencyExitDuration: 10,
        quickTimers: [15, 30, 60],
        version: '1.0.0'
      }

      // 合并配置：默认值 + 已保存的值
      const mergedSettings: Settings = {
        ...defaultSettings,
        ...loadedSettings
      }

      setAllowlist(loadedAllowlist?.apps || [])
      setSettings(mergedSettings)
      setCurrentSession(loadedSession)
      setHistory(loadedHistory || [])
    }
    loadConfig()
  }, [])

  // 白名单操作：添加应用
  const addToAllowlist = async (app: AllowlistApp): Promise<void> => {
    const updated: AllowlistApp[] = [...allowlist, app]
    await window.api.store.set('allowlist', { apps: updated })
    setAllowlist(updated)
  }

  // 白名单操作：移除应用
  const removeFromAllowlist = async (appId: string): Promise<void> => {
    const updated = allowlist.filter((app) => app.id !== appId)
    await window.api.store.set('allowlist', { apps: updated })
    setAllowlist(updated)
  }

  // 更新 Settings
  const updateSettings = async (partial: Partial<Settings>): Promise<void> => {
    const updated = { ...settings, ...partial }
    await window.api.store.set('settings', updated)
    setSettings(updated)
  }

  // 更新当前会话
  const updateCurrentSession = async (session: CurrentSession | null): Promise<void> => {
    await window.api.store.set('currentSession', session)
    setCurrentSession(session)
  }

  return {
    allowlist,
    settings,
    currentSession,
    history,
    addToAllowlist,
    removeFromAllowlist,
    updateSettings,
    updateCurrentSession
  }
}
