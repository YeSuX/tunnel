/**
 * 持久化配置管理模块
 * 基于 electron-store 实现 Allowlist 和 Settings 的本地存储
 */

import Store from 'electron-store'

/**
 * 应用配置的类型定义
 */
export interface StoreSchema {
  // 白名单应用列表
  allowlist: string[]
  // 应用设置
  settings: {
    // 默认专注时长（分钟）
    defaultDuration: number
    // 是否启用音效
    soundEnabled: boolean
    // 是否显示托盘图标
    showTrayIcon: boolean
  }
}

/**
 * 默认配置值
 */
const defaults: StoreSchema = {
  allowlist: [],
  settings: {
    defaultDuration: 25,
    soundEnabled: true,
    showTrayIcon: true
  }
}

/**
 * 创建类型安全的 store 实例
 */
export const store = new Store<StoreSchema>({
  defaults,
  name: 'config'
})
