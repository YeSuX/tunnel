/**
 * 预加载脚本的 TypeScript 类型定义文件
 *
 * 作用：
 * 1. 为渲染进程提供 window 对象扩展的类型定义
 * 2. 让渲染进程中使用 window.electron 和 window.api 时具有完整的类型提示和检查
 * 3. 提升开发体验，避免类型错误
 *
 * 使用方式：
 * - 在渲染进程的 TypeScript 文件中直接使用 window.electron.xxx
 * - IDE 会自动提供类型提示和代码补全
 */

import { ElectronAPI } from '@electron-toolkit/preload'

/**
 * Store API 接口定义
 */
interface StoreAPI {
  get: <T>(key: string) => Promise<T>
  set: (key: string, value: unknown) => Promise<void>
  delete: (key: string) => Promise<void>
  clear: () => Promise<void>
}

/**
 * 扩展全局 Window 接口
 *
 * 声明 window 对象上挂载的自定义属性
 * 这些属性由 preload 脚本通过 contextBridge 暴露
 */
declare global {
  interface Window {
    /**
     * Electron API 对象
     *
     * 包含 electron-toolkit 提供的标准功能：
     * - ipcRenderer: 用于与主进程通信
     * - process: 进程信息（平台、版本等）
     * - 其他常用的 Electron API
     */
    electron: ElectronAPI

    /**
     * 自定义 API 对象
     *
     * 提供类型安全的配置持久化接口
     */
    api: {
      store: StoreAPI
    }
  }
}
