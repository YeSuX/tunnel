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
 *         type="number"
 *         value={settings.defaultDuration}
 *         onChange={(e) => updateSettings({ defaultDuration: Number(e.target.value) })}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect } from 'react'

interface Settings {
  defaultDuration: number
  soundEnabled: boolean
  showTrayIcon: boolean
}

export function useStore() {
  const [allowlist, setAllowlist] = useState<string[]>([])
  const [settings, setSettings] = useState<Settings>({
    defaultDuration: 30,
    soundEnabled: true,
    showTrayIcon: true
  })

  // 初始化加载配置
  useEffect(() => {
    const loadConfig = async () => {
      const [loadedAllowlist, loadedSettings] = await Promise.all([
        window.api.store.get<string[]>('allowlist'),
        window.api.store.get<Settings>('settings')
      ])
      setAllowlist(loadedAllowlist)
      setSettings(loadedSettings)
    }
    loadConfig()
  }, [])

  // 更新 Allowlist
  const addToAllowlist = async (appName: string) => {
    const updated = [...allowlist, appName]
    await window.api.store.set('allowlist', updated)
    setAllowlist(updated)
  }

  const removeFromAllowlist = async (appName: string) => {
    const updated = allowlist.filter((name) => name !== appName)
    await window.api.store.set('allowlist', updated)
    setAllowlist(updated)
  }

  // 更新 Settings
  const updateSettings = async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial }
    await window.api.store.set('settings', updated)
    setSettings(updated)
  }

  return {
    allowlist,
    settings,
    addToAllowlist,
    removeFromAllowlist,
    updateSettings
  }
}
