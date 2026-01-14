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

/**
 * 自定义 API 对象
 *
 * 暴露 electron-store 的类型安全接口给渲染进程
 */
const api = {
  store: {
    get: <T>(key: string): Promise<T> => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke('store:set', key, value),
    delete: (key: string): Promise<void> => ipcRenderer.invoke('store:delete', key),
    clear: (): Promise<void> => ipcRenderer.invoke('store:clear')
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
