/**
 * Electron 主进程入口文件
 *
 * 主进程是 Electron 应用的后端，运行在 Node.js 环境中，负责：
 * 1. 创建和管理应用窗口（BrowserWindow）
 * 2. 控制应用生命周期（启动、退出、激活等）
 * 3. 访问系统级 API（文件系统、原生对话框、菜单等）
 * 4. 处理渲染进程的 IPC（进程间通信）请求
 * 5. 管理应用全局状态和配置
 */

import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { store } from './store'
import { IPC_CHANNELS } from '../shared/ipc'
import type { StoreSchema, WindowBounds } from '../shared/types'
import { windowMonitor } from './services/WindowMonitor'
import { overlayManager } from './services/OverlayManager'

// 禁用 Chromium 的 Autofill 功能，避免 DevTools 报错：
// "Request Autofill.setAddresses failed"
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')

/**
 * 创建主窗口
 *
 * 该函数负责创建应用的主窗口实例，配置窗口属性和行为
 */
function createWindow(): void {
  // 创建浏览器窗口实例
  const mainWindow = new BrowserWindow({
    width: 900, // 窗口初始宽度
    height: 670, // 窗口初始高度
    show: false, // 创建时隐藏窗口，等待内容加载完成后再显示（避免白屏闪烁）
    autoHideMenuBar: true, // 自动隐藏菜单栏（Windows/Linux 平台）
    ...(process.platform === 'linux' ? { icon } : {}), // Linux 平台设置窗口图标
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'), // 预加载脚本路径，在渲染进程加载前执行
      sandbox: false // 禁用沙箱模式，允许 preload 脚本访问 Node.js API
    }
  })

  // 监听窗口内容准备完成事件
  // 当页面加载完成后再显示窗口，提供更好的用户体验
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 处理窗口中打开新链接的行为
  // 将所有新窗口请求在系统默认浏览器中打开，而不是在应用内打开新窗口
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' } // 拒绝在应用内打开新窗口
  })

  // 根据环境加载不同的内容
  // 开发环境：加载 Vite 开发服务器的 URL（支持热更新 HMR）
  // 生产环境：加载打包后的本地 HTML 文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * 应用启动初始化
 *
 * 当 Electron 完成初始化并准备创建窗口时执行
 * 某些 API 只能在此事件触发后使用
 */
app.whenReady().then(() => {
  // 设置 Windows 平台的应用用户模型 ID
  // 用于任务栏分组和通知系统
  electronApp.setAppUserModelId('com.electron')

  // 监听所有窗口创建事件
  // 为每个窗口注册快捷键监听器
  // 开发环境：F12 打开/关闭开发者工具
  // 生产环境：忽略 Ctrl/Cmd+R 刷新快捷键（防止用户误操作）
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC 通信测试示例
  // 监听来自渲染进程的 'ping' 消息，并在控制台输出 'pong'
  // 这是主进程与渲染进程通信的典型模式
  ipcMain.on('ping', () => console.log('pong'))

  // Store IPC handlers - 类型安全的配置读写
  ipcMain.handle(
    IPC_CHANNELS.STORE_GET,
    <K extends keyof StoreSchema>(_event: Electron.IpcMainInvokeEvent, key: K) => store.get(key)
  )

  ipcMain.handle(
    IPC_CHANNELS.STORE_SET,
    <K extends keyof StoreSchema>(
      _event: Electron.IpcMainInvokeEvent,
      key: K,
      value: StoreSchema[K]
    ) => store.set(key, value)
  )

  ipcMain.handle(
    IPC_CHANNELS.STORE_DELETE,
    <K extends keyof StoreSchema>(_event: Electron.IpcMainInvokeEvent, key: K) => store.delete(key)
  )

  ipcMain.handle(IPC_CHANNELS.STORE_CLEAR, () => store.clear())

  // ============ Window Monitor IPC handlers ============

  // 获取当前焦点窗口
  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_ACTIVE, () => windowMonitor.getActiveWindow())

  // 获取运行中的应用列表
  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_RUNNING_APPS, () => windowMonitor.getRunningApps())

  // 开始焦点监控
  ipcMain.handle(IPC_CHANNELS.WINDOW_START_FOCUS_WATCH, (event) => {
    const webContents = event.sender
    windowMonitor.startFocusWatch((focusEvent) => {
      // 通过 IPC 推送焦点变化事件到渲染进程
      webContents.send(IPC_CHANNELS.WINDOW_FOCUS_CHANGE_PUSH, focusEvent)
    })
  })

  // 停止焦点监控
  ipcMain.handle(IPC_CHANNELS.WINDOW_STOP_FOCUS_WATCH, () => {
    windowMonitor.stopFocusWatch()
  })

  // 开始目标窗口位置追踪
  ipcMain.handle(IPC_CHANNELS.WINDOW_START_BOUNDS_TRACK, (event, windowId: number) => {
    const webContents = event.sender
    windowMonitor.startBoundsTrack(windowId, (boundsEvent) => {
      // 通过 IPC 推送位置变化事件到渲染进程
      webContents.send(IPC_CHANNELS.WINDOW_BOUNDS_CHANGE_PUSH, boundsEvent)
    })
  })

  // 停止位置追踪
  ipcMain.handle(IPC_CHANNELS.WINDOW_STOP_BOUNDS_TRACK, () => {
    windowMonitor.stopBoundsTrack()
  })

  // 检查屏幕录制权限
  ipcMain.handle(IPC_CHANNELS.WINDOW_CHECK_PERMISSION, () => windowMonitor.checkPermission())

  // 打开系统偏好设置（屏幕录制权限页面）
  ipcMain.handle(IPC_CHANNELS.WINDOW_OPEN_PERMISSION_SETTINGS, () => {
    if (process.platform === 'darwin') {
      // macOS：打开屏幕录制权限设置页面
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      )
    } else if (process.platform === 'win32') {
      // Windows：打开隐私设置
      shell.openExternal('ms-settings:privacy')
    }
  })

  // ============ Overlay Manager IPC handlers ============

  // 激活遮罩层
  ipcMain.handle(IPC_CHANNELS.OVERLAY_ACTIVATE, (_event, targetBounds: WindowBounds) => {
    overlayManager.activate(targetBounds)
  })

  // 更新遮罩位置
  ipcMain.handle(IPC_CHANNELS.OVERLAY_UPDATE, (_event, targetBounds: WindowBounds) => {
    overlayManager.updateOverlays(targetBounds)
  })

  // 停用遮罩层
  ipcMain.handle(IPC_CHANNELS.OVERLAY_DEACTIVATE, () => {
    overlayManager.deactivate()
  })

  // 获取遮罩状态
  ipcMain.handle(IPC_CHANNELS.OVERLAY_GET_STATUS, () => {
    return overlayManager.getStatus()
  })

  // 初始化 OverlayManager（预创建窗口池）
  overlayManager.init().catch((err) => {
    console.error('[Main] Failed to initialize OverlayManager:', err)
  })

  // 创建主窗口
  createWindow()

  /**
   * macOS 平台特定行为
   *
   * 在 macOS 上，当用户点击 Dock 图标时，如果没有打开的窗口，
   * 应该重新创建一个窗口（这是 macOS 应用的标准行为）
   */
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

/**
 * 所有窗口关闭事件处理
 *
 * Windows 和 Linux 平台：所有窗口关闭时退出应用
 * macOS 平台：所有窗口关闭时应用保持运行（标准 macOS 行为）
 *             用户需要通过 Cmd+Q 显式退出应用
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * 应用即将退出事件处理
 *
 * 清理资源，销毁遮罩窗口
 */
app.on('before-quit', () => {
  overlayManager.destroy()
})

/**
 * 应用的其他主进程代码可以写在这里
 *
 * 对于复杂应用，建议将不同功能模块拆分到独立文件中，
 * 然后在此处导入和初始化，例如：
 * - IPC 通信处理器
 * - 系统托盘管理
 * - 自动更新逻辑
 * - 数据库连接
 * - 后台任务调度
 */
