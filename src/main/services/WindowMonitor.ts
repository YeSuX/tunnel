/**
 * WindowMonitor 服务
 *
 * 负责监控系统窗口状态，提供以下核心能力：
 * 1. 获取当前焦点窗口信息
 * 2. 监听焦点变化（用于触发 Bouncer 逻辑）
 * 3. 追踪目标窗口位置变化（用于遮罩层定位）
 * 4. 获取运行中的应用列表（用于 UI 选择目标 App）
 *
 * 技术要点：
 * - 使用 active-win 获取窗口信息（底层调用 macOS Accessibility API）
 * - 轮询策略：焦点检测 200ms，位置追踪 100ms（位置变化时自适应提升）
 * - 需要 Accessibility 权限
 */

import activeWindow from 'active-win'

// active-win@8 API:
// - 默认导出: activeWindow() - 获取当前焦点窗口
// - activeWindow.getOpenWindows() - 获取所有打开的窗口

// active-win@8 的结果类型
type ActiveWinResult = Awaited<ReturnType<typeof activeWindow>>
import type {
  WindowInfo,
  WindowBounds,
  RunningApp,
  FocusChangeEvent,
  BoundsChangeEvent,
  PermissionStatus,
  ScreenRecordingPermission
} from '../../shared/types'

// ============ 配置常量 ============

/** 焦点检测轮询间隔（ms） */
const FOCUS_POLL_INTERVAL = 200

/** 位置追踪轮询间隔（ms） - 正常 */
const BOUNDS_POLL_INTERVAL_NORMAL = 100

/** 位置追踪轮询间隔（ms） - 快速（检测到位置变化时） */
const BOUNDS_POLL_INTERVAL_FAST = 50

/** 快速轮询持续时间（ms） */
const FAST_POLL_DURATION = 2000

/** 屏幕录制权限错误关键词 */
const SCREEN_RECORDING_PERMISSION_ERROR = 'screen recording permission'

// ============ 类型转换工具 ============

/**
 * 将 active-win 结果转换为 WindowInfo
 */
function toWindowInfo(result: ActiveWinResult): WindowInfo {
  return {
    title: result.title,
    id: result.id,
    bounds: {
      x: result.bounds.x,
      y: result.bounds.y,
      width: result.bounds.width,
      height: result.bounds.height
    },
    owner: {
      name: result.owner.name,
      processId: result.owner.processId,
      bundleId: result.platform === 'macos' ? result.owner.bundleId : undefined,
      path: result.owner.path
    },
    memoryUsage: result.memoryUsage
  }
}

/**
 * 判断两个 bounds 是否相等
 */
function boundsEqual(a: WindowBounds, b: WindowBounds): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

// ============ WindowMonitor 类 ============

export class WindowMonitor {
  // ---- 状态管理 ----
  /** 上一次检测到的焦点窗口 */
  private lastFocusedWindow: WindowInfo | null = null

  /** 缓存的权限状态（避免重复检测） */
  private cachedPermission: ScreenRecordingPermission = 'unknown'

  /** 正在追踪的目标窗口 ID */
  private trackedWindowId: number | null = null

  /** 目标窗口上一次的 bounds */
  private trackedWindowBounds: WindowBounds | null = null

  // ---- 定时器 ----
  private focusWatchTimer: ReturnType<typeof setInterval> | null = null
  private boundsTrackTimer: ReturnType<typeof setInterval> | null = null
  private fastPollEndTimer: ReturnType<typeof setTimeout> | null = null

  /** 当前是否处于快速轮询模式 */
  private isInFastPollMode = false

  // ---- 回调 ----
  private onFocusChange: ((event: FocusChangeEvent) => void) | null = null
  private onBoundsChange: ((event: BoundsChangeEvent) => void) | null = null

  // ============ 公开 API ============

  /**
   * 检查屏幕录制权限状态
   *
   * 通过实际调用 active-win 来检测权限，而非依赖系统 API，
   * 因为 active-win 的权限要求可能与系统 API 检测不完全一致。
   */
  async checkPermission(): Promise<PermissionStatus> {
    // 如果已知权限状态为 granted，直接返回
    if (this.cachedPermission === 'granted') {
      return { screenRecording: 'granted' }
    }

    try {
      await activeWindow()
      this.cachedPermission = 'granted'
      return { screenRecording: 'granted' }
    } catch (error) {
      if (this.isPermissionError(error)) {
        this.cachedPermission = 'denied'
        return {
          screenRecording: 'denied',
          message:
            '需要屏幕录制权限才能获取窗口信息。请在「系统设置 › 隐私与安全性 › 屏幕录制」中授权本应用。'
        }
      }
      // 其他错误，权限状态未知
      return { screenRecording: 'unknown', message: '无法确定权限状态' }
    }
  }

  /**
   * 判断错误是否为屏幕录制权限错误
   */
  private isPermissionError(error: unknown): boolean {
    if (error instanceof Error) {
      // 检查 error message
      if (error.message.toLowerCase().includes(SCREEN_RECORDING_PERMISSION_ERROR)) {
        return true
      }
      // 检查 stdout（active-win 错误信息通常在 stdout 中）
      const errorWithStdout = error as Error & { stdout?: string }
      if (errorWithStdout.stdout?.toLowerCase().includes(SCREEN_RECORDING_PERMISSION_ERROR)) {
        return true
      }
    }
    return false
  }

  /**
   * 获取当前焦点窗口信息
   *
   * @returns 窗口信息，若无法获取则返回 null
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    try {
      const result = await activeWindow()
      if (!result) return null
      // 成功获取窗口信息，更新权限缓存
      this.cachedPermission = 'granted'
      return toWindowInfo(result)
    } catch (error) {
      if (this.isPermissionError(error)) {
        this.cachedPermission = 'denied'
        console.warn(
          '[WindowMonitor] 缺少屏幕录制权限。请在「系统设置 › 隐私与安全性 › 屏幕录制」中授权。'
        )
      } else {
        console.error('[WindowMonitor] getActiveWindow failed:', error)
      }
      return null
    }
  }

  /**
   * 获取所有运行中的应用列表
   *
   * 使用 active-win 的 openWindows API 获取所有打开的窗口，
   * 然后按应用去重返回运行中的应用列表。
   */
  async getRunningApps(): Promise<RunningApp[]> {
    try {
      const windows = await activeWindow.getOpenWindows()
      if (!windows || windows.length === 0) return []

      // 按 processId 去重，构建应用列表
      const appMap = new Map<number, RunningApp>()

      for (const win of windows) {
        if (!appMap.has(win.owner.processId)) {
          appMap.set(win.owner.processId, {
            id: win.platform === 'macos' ? win.owner.bundleId : win.owner.name,
            name: win.owner.name,
            processId: win.owner.processId
          })
        }
      }

      return Array.from(appMap.values())
    } catch (error) {
      console.error('[WindowMonitor] getRunningApps failed:', error)
      return []
    }
  }

  /**
   * 获取所有打开的窗口信息
   *
   * 返回所有窗口，按前后顺序排列（最前面的窗口在数组前面）
   */
  async getAllWindows(): Promise<WindowInfo[]> {
    try {
      const windows = await activeWindow.getOpenWindows()
      if (!windows) return []
      return windows.map(toWindowInfo)
    } catch (error) {
      console.error('[WindowMonitor] getAllWindows failed:', error)
      return []
    }
  }

  /**
   * 根据窗口 ID 获取窗口信息
   *
   * 用于追踪非焦点窗口的位置
   */
  async getWindowById(windowId: number): Promise<WindowInfo | null> {
    try {
      const windows = await activeWindow.getOpenWindows()
      if (!windows) return null
      const target = windows.find((w) => w.id === windowId)
      return target ? toWindowInfo(target) : null
    } catch (error) {
      console.error('[WindowMonitor] getWindowById failed:', error)
      return null
    }
  }

  /**
   * 开始监控焦点变化
   *
   * @param callback 焦点变化时的回调函数
   */
  startFocusWatch(callback: (event: FocusChangeEvent) => void): void {
    // 防止重复启动
    if (this.focusWatchTimer) {
      console.warn('[WindowMonitor] Focus watch already started')
      return
    }

    this.onFocusChange = callback
    console.log(`[WindowMonitor] Starting focus watch (interval: ${FOCUS_POLL_INTERVAL}ms)`)

    this.focusWatchTimer = setInterval(async () => {
      await this.pollFocusChange()
    }, FOCUS_POLL_INTERVAL)

    // 立即执行一次
    this.pollFocusChange()
  }

  /**
   * 停止监控焦点变化
   */
  stopFocusWatch(): void {
    if (this.focusWatchTimer) {
      clearInterval(this.focusWatchTimer)
      this.focusWatchTimer = null
      this.onFocusChange = null
      this.lastFocusedWindow = null
      console.log('[WindowMonitor] Focus watch stopped')
    }
  }

  /**
   * 开始追踪目标窗口位置
   *
   * @param windowId 目标窗口 ID
   * @param callback 位置变化时的回调函数
   */
  startBoundsTrack(windowId: number, callback: (event: BoundsChangeEvent) => void): void {
    // 防止重复启动
    if (this.boundsTrackTimer) {
      console.warn('[WindowMonitor] Bounds track already started, stopping previous...')
      this.stopBoundsTrack()
    }

    this.trackedWindowId = windowId
    this.trackedWindowBounds = null
    this.onBoundsChange = callback
    this.isInFastPollMode = false

    console.log(`[WindowMonitor] Starting bounds track for window ${windowId}`)

    this.boundsTrackTimer = setInterval(async () => {
      await this.pollBoundsChange()
    }, BOUNDS_POLL_INTERVAL_NORMAL)

    // 立即执行一次获取初始位置
    this.pollBoundsChange()
  }

  /**
   * 停止追踪目标窗口位置
   */
  stopBoundsTrack(): void {
    if (this.boundsTrackTimer) {
      clearInterval(this.boundsTrackTimer)
      this.boundsTrackTimer = null
    }
    if (this.fastPollEndTimer) {
      clearTimeout(this.fastPollEndTimer)
      this.fastPollEndTimer = null
    }
    this.trackedWindowId = null
    this.trackedWindowBounds = null
    this.onBoundsChange = null
    this.isInFastPollMode = false
    console.log('[WindowMonitor] Bounds track stopped')
  }

  /**
   * 停止所有监控
   */
  stopAll(): void {
    this.stopFocusWatch()
    this.stopBoundsTrack()
  }

  /**
   * 获取当前追踪的目标窗口 bounds
   */
  getTrackedBounds(): WindowBounds | null {
    return this.trackedWindowBounds
  }

  // ============ 内部方法 ============

  /**
   * 轮询检测焦点变化
   */
  private async pollFocusChange(): Promise<void> {
    const current = await this.getActiveWindow()
    if (!current) return

    // 检测焦点是否变化（通过窗口 ID 判断）
    const previousId = this.lastFocusedWindow?.id
    if (previousId !== current.id) {
      const event: FocusChangeEvent = {
        previous: this.lastFocusedWindow,
        current,
        timestamp: Date.now()
      }

      this.lastFocusedWindow = current
      this.onFocusChange?.(event)
    }
  }

  /**
   * 轮询检测目标窗口位置变化
   *
   * 使用 openWindows API 可以获取所有窗口（包括非焦点窗口），
   * 因此可以正确追踪目标窗口的位置，即使它不是焦点。
   */
  private async pollBoundsChange(): Promise<void> {
    if (!this.trackedWindowId || !this.onBoundsChange) return

    // 使用 getWindowById 获取目标窗口（无论是否为焦点）
    const current = await this.getWindowById(this.trackedWindowId)
    if (!current) {
      // 目标窗口可能已关闭
      console.warn('[WindowMonitor] Tracked window not found, may have been closed')
      return
    }

    const currentBounds = current.bounds
    const previousBounds = this.trackedWindowBounds

    // 初次获取或位置变化
    if (!previousBounds || !boundsEqual(previousBounds, currentBounds)) {
      if (previousBounds) {
        // 位置变化：触发回调
        const event: BoundsChangeEvent = {
          window: current,
          previousBounds,
          currentBounds,
          timestamp: Date.now()
        }
        this.onBoundsChange(event)

        // 启用快速轮询模式
        this.enableFastPollMode()
      }

      this.trackedWindowBounds = currentBounds
    }
  }

  /**
   * 启用快速轮询模式
   *
   * 当检测到位置变化时，临时提高轮询频率以更流畅地跟踪窗口移动
   */
  private enableFastPollMode(): void {
    if (this.isInFastPollMode) {
      // 重置快速模式结束计时器
      if (this.fastPollEndTimer) {
        clearTimeout(this.fastPollEndTimer)
      }
    } else {
      // 切换到快速轮询
      this.isInFastPollMode = true
      if (this.boundsTrackTimer) {
        clearInterval(this.boundsTrackTimer)
      }
      this.boundsTrackTimer = setInterval(async () => {
        await this.pollBoundsChange()
      }, BOUNDS_POLL_INTERVAL_FAST)

      console.log('[WindowMonitor] Switched to fast poll mode')
    }

    // 设置快速模式自动结束
    this.fastPollEndTimer = setTimeout(() => {
      this.disableFastPollMode()
    }, FAST_POLL_DURATION)
  }

  /**
   * 禁用快速轮询模式，恢复正常频率
   */
  private disableFastPollMode(): void {
    if (!this.isInFastPollMode) return

    this.isInFastPollMode = false
    if (this.boundsTrackTimer) {
      clearInterval(this.boundsTrackTimer)
    }
    this.boundsTrackTimer = setInterval(async () => {
      await this.pollBoundsChange()
    }, BOUNDS_POLL_INTERVAL_NORMAL)

    console.log('[WindowMonitor] Switched back to normal poll mode')
  }
}

// 单例导出
export const windowMonitor = new WindowMonitor()
