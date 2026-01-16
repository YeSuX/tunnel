/**
 * Electron 预加载脚本
 *
 * 预加载脚本是主进程和渲染进程之间的安全桥梁，具有以下特点：
 *
 * 1. 执行时机：在渲染进程加载页面之前执行
 * 2. 执行环境：同时拥有 Node.js API 和 DOM API 的访问权限
 * 3. 安全隔离：通过 contextBridge 安全地暴露 API 给渲染进程
 * 4. 类型安全：配合 TypeScript 类型定义，提供完整的类型检查
 *
 * 为什么需要预加载脚本？
 * - 渲染进程出于安全考虑，默认无法直接访问 Node.js API
 * - 直接将 Node.js 暴露给渲染进程会带来安全风险（特别是加载远程内容时）
 * - 预加载脚本允许我们选择性地、安全地暴露特定功能给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '../shared/ipc'
import type { StoreSchema, WindowInfo, RunningApp, PermissionStatus } from '../shared/types'

/**
 * 自定义 API 对象
 *
 * 暴露类型安全的接口给渲染进程
 * - store: 配置持久化操作
 * - on: 订阅主进程推送的事件（用于 Session 状态同步等）
 */
const api = {
  /**
   * Store API - 类型安全的配置读写
   */
  store: {
    get: <K extends keyof StoreSchema>(key: K): Promise<StoreSchema[K]> =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),

    set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value),

    delete: <K extends keyof StoreSchema>(key: K): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.STORE_DELETE, key),

    clear: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.STORE_CLEAR)
  },

  /**
   * Window Monitor API - 窗口监控功能
   */
  window: {
    /** 获取当前焦点窗口信息 */
    getActive: (): Promise<WindowInfo | null> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_ACTIVE),

    /** 获取运行中的应用列表 */
    getRunningApps: (): Promise<RunningApp[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_RUNNING_APPS),

    /** 开始焦点监控 */
    startFocusWatch: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_START_FOCUS_WATCH),

    /** 停止焦点监控 */
    stopFocusWatch: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_STOP_FOCUS_WATCH),

    /** 开始追踪目标窗口位置 */
    startBoundsTrack: (windowId: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_START_BOUNDS_TRACK, windowId),

    /** 停止位置追踪 */
    stopBoundsTrack: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_STOP_BOUNDS_TRACK),

    /** 检查屏幕录制权限状态 */
    checkPermission: (): Promise<PermissionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CHECK_PERMISSION),

    /** 打开系统权限设置页面 */
    openPermissionSettings: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_OPEN_PERMISSION_SETTINGS)
  },

  /**
   * 订阅主进程推送的事件
   *
   * @param channel - IPC 通道名称
   * @param callback - 事件回调函数
   * @returns 取消订阅的函数
   *
   * @example
   * ```ts
   * // 订阅 Session 倒计时更新
   * const unsubscribe = window.api.on('session:tick:push', (remaining) => {
   *   setRemainingSeconds(remaining)
   * })
   * // 组件卸载时取消订阅
   * return () => unsubscribe()
   * ```
   */
  on: <T = unknown>(channel: string, callback: (data: T) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: T): void => callback(data)
    ipcRenderer.on(channel, listener)
    // 返回取消订阅函数
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
}

/**
 * 根据上下文隔离状态选择不同的 API 暴露方式
 *
 * 上下文隔离（Context Isolation）是 Electron 的安全特性：
 * - 启用时：渲染进程的 JavaScript 代码与预加载脚本运行在不同的上下文中
 * - 必须使用 contextBridge.exposeInMainWorld 来暴露 API
 * - 这是推荐的安全做法
 */
if (process.contextIsolated) {
  try {
    // 通过 contextBridge 安全地将 API 暴露到渲染进程的 window 对象
    // electron-toolkit 提供的标准 Electron API（包含 ipcRenderer 等常用功能）
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // 暴露自定义 API 到 window.api
    // 渲染进程中可以通过 window.api.xxx 访问这些功能
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    // 如果暴露 API 失败，记录错误信息
    // 可能的原因：API 名称冲突、上下文隔离配置问题等
    console.error(error)
  }
} else {
  /**
   * 上下文隔离未启用时的降级处理
   *
   * 直接将 API 挂载到 window 对象
   * 注意：这种方式安全性较低，不推荐在生产环境使用
   * 仅用于兼容旧版本或特殊场景
   */
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
