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
import type {
  TypedStoreAPI,
  WindowInfo,
  RunningApp,
  FocusChangeEvent,
  BoundsChangeEvent,
  PermissionStatus
} from '../shared/types'

/**
 * Window Monitor API 类型
 */
export interface WindowMonitorAPI {
  /** 获取当前焦点窗口信息 */
  getActive: () => Promise<WindowInfo | null>
  /** 获取运行中的应用列表 */
  getRunningApps: () => Promise<RunningApp[]>
  /** 开始焦点监控 */
  startFocusWatch: () => Promise<void>
  /** 停止焦点监控 */
  stopFocusWatch: () => Promise<void>
  /** 开始追踪目标窗口位置 */
  startBoundsTrack: (windowId: number) => Promise<void>
  /** 停止位置追踪 */
  stopBoundsTrack: () => Promise<void>
  /** 检查屏幕录制权限状态 */
  checkPermission: () => Promise<PermissionStatus>
  /** 打开系统权限设置页面 */
  openPermissionSettings: () => Promise<void>
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
     * 提供类型安全的配置持久化接口和事件订阅能力
     */
    api: {
      /**
       * Store API - 类型安全的配置读写
       */
      store: TypedStoreAPI

      /**
       * Window Monitor API - 窗口监控功能
       */
      window: WindowMonitorAPI

      /**
       * 订阅主进程推送的事件
       *
       * @param channel - IPC 通道名称
       * @param callback - 事件回调函数
       * @returns 取消订阅的函数
       *
       * @example
       * ```ts
       * const unsubscribe = window.api.on('session:tick:push', (remaining) => {
       *   setRemainingSeconds(remaining)
       * })
       * return () => unsubscribe()
       * ```
       */
      on: <T = unknown>(channel: string, callback: (data: T) => void) => () => void
    }
  }
}

// 导出类型供其他模块使用
export type { FocusChangeEvent, BoundsChangeEvent }
