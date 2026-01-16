/**
 * OverlayManager 服务
 *
 * 负责管理 Blackout Overlay（视觉遮蔽层），实现"4 窗口围绕"方案：
 * 1. 预创建 4 个黑色无边框窗口（上、下、左、右）
 * 2. 根据目标窗口 bounds 动态计算并更新遮罩位置
 * 3. 管理遮罩窗口的生命周期（显示、隐藏、销毁）
 *
 * 技术要点：
 * - 使用 `focusable: false` 避免遮罩窗口抢夺焦点
 * - 使用 `alwaysOnTop` + `floating` 层级确保遮罩在目标窗口之上
 * - 批量更新窗口位置，减少视觉撕裂
 * - 零尺寸窗口自动隐藏，避免闪烁
 */

import { BrowserWindow, screen } from 'electron'
import type { WindowBounds } from '../../shared/types'

// ============ 配置常量 ============

/** 遮罩窗口背景色 */
const OVERLAY_BG_COLOR = '#000000'

/** 遮罩位置枚举 */
type OverlayPosition = 'top' | 'bottom' | 'left' | 'right'

/** 遮罩区域矩形 */
interface OverlayRect {
  x: number
  y: number
  width: number
  height: number
}

/** 4 个遮罩区域 */
interface OverlayRects {
  top: OverlayRect
  bottom: OverlayRect
  left: OverlayRect
  right: OverlayRect
}

// ============ OverlayManager 类 ============

export class OverlayManager {
  /** 4 个遮罩窗口，按位置存储 */
  private overlays: Map<OverlayPosition, BrowserWindow> = new Map()

  /** 是否已初始化 */
  private initialized = false

  /** 是否处于激活状态 */
  private active = false

  /** 当前追踪的目标窗口 bounds */
  private currentTargetBounds: WindowBounds | null = null

  // ============ 公开 API ============

  /**
   * 初始化遮罩窗口池
   *
   * 预创建 4 个隐藏的遮罩窗口，进入 Tunnel 模式时只需 show + setBounds
   * 应在应用启动时调用
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.warn('[OverlayManager] Already initialized')
      return
    }

    const positions: OverlayPosition[] = ['top', 'bottom', 'left', 'right']

    for (const position of positions) {
      const win = new BrowserWindow({
        show: false,
        frame: false,
        transparent: false, // 纯黑背景，不需要透明
        backgroundColor: OVERLAY_BG_COLOR,
        skipTaskbar: true, // 不在任务栏显示
        alwaysOnTop: true,
        focusable: false, // 关键：不可聚焦，避免抢焦点
        hasShadow: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: false,
        fullscreenable: false,
        // macOS 特定配置
        ...(process.platform === 'darwin'
          ? {
              type: 'panel', // macOS panel 类型窗口
              hiddenInMissionControl: true // 不在 Mission Control 显示
            }
          : {})
      })

      // macOS：设置窗口层级为 floating（在普通窗口之上）
      if (process.platform === 'darwin') {
        win.setAlwaysOnTop(true, 'floating')
        // 设置在所有桌面空间可见
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
      }

      // 加载空白页面（纯黑背景已通过 backgroundColor 设置）
      win.loadURL('about:blank')

      this.overlays.set(position, win)
    }

    this.initialized = true
    console.log('[OverlayManager] Initialized with 4 overlay windows')
  }

  /**
   * 激活遮罩层
   *
   * @param targetBounds 目标窗口的边界
   */
  activate(targetBounds: WindowBounds): void {
    if (!this.initialized) {
      console.error('[OverlayManager] Not initialized. Call init() first.')
      return
    }

    this.active = true
    this.currentTargetBounds = targetBounds

    // 计算并更新遮罩位置
    this.updateOverlays(targetBounds)

    console.log('[OverlayManager] Activated')
  }

  /**
   * 更新遮罩位置
   *
   * 根据目标窗口的新 bounds 重新计算并更新 4 个遮罩窗口的位置
   * 由 WindowMonitor 的 bounds 变化事件触发
   *
   * @param targetBounds 目标窗口的边界
   */
  updateOverlays(targetBounds: WindowBounds): void {
    if (!this.initialized || !this.active) {
      return
    }

    this.currentTargetBounds = targetBounds

    // 获取目标窗口所在的显示器
    const display = screen.getDisplayMatching({
      x: targetBounds.x,
      y: targetBounds.y,
      width: targetBounds.width,
      height: targetBounds.height
    })

    const screenBounds = display.bounds

    // 计算 4 个遮罩区域
    const rects = this.calculateOverlayRects(screenBounds, targetBounds)

    // 批量更新窗口位置
    this.applyOverlayRects(rects)
  }

  /**
   * 停用遮罩层
   *
   * 隐藏所有遮罩窗口
   */
  deactivate(): void {
    if (!this.initialized) {
      return
    }

    this.active = false
    this.currentTargetBounds = null

    // 隐藏所有遮罩窗口
    for (const [position, win] of this.overlays) {
      if (!win.isDestroyed() && win.isVisible()) {
        win.hide()
        console.log(`[OverlayManager] Hidden overlay: ${position}`)
      }
    }

    console.log('[OverlayManager] Deactivated')
  }

  /**
   * 销毁所有遮罩窗口
   *
   * 应在应用退出前调用
   */
  destroy(): void {
    for (const [position, win] of this.overlays) {
      if (!win.isDestroyed()) {
        win.destroy()
        console.log(`[OverlayManager] Destroyed overlay: ${position}`)
      }
    }

    this.overlays.clear()
    this.initialized = false
    this.active = false
    this.currentTargetBounds = null

    console.log('[OverlayManager] Destroyed')
  }

  /**
   * 获取当前状态
   */
  getStatus(): { initialized: boolean; active: boolean; targetBounds: WindowBounds | null } {
    return {
      initialized: this.initialized,
      active: this.active,
      targetBounds: this.currentTargetBounds
    }
  }

  /**
   * 检查是否已激活
   */
  isActive(): boolean {
    return this.active
  }

  // ============ 内部方法 ============

  /**
   * 计算 4 个遮罩区域
   *
   * 布局示意：
   * ┌────────────────────────────────┐
   * │         Top Window             │
   * ├────────┬───────────┬───────────┤
   * │  Left  │  Target   │   Right   │
   * │ Window │   App     │  Window   │
   * ├────────┴───────────┴───────────┤
   * │        Bottom Window           │
   * └────────────────────────────────┘
   *
   * @param screenBounds 屏幕边界
   * @param targetBounds 目标窗口边界
   */
  private calculateOverlayRects(
    screenBounds: Electron.Rectangle,
    targetBounds: WindowBounds
  ): OverlayRects {
    const { x: sx, y: sy, width: sw, height: sh } = screenBounds
    const { x: tx, y: ty, width: tw, height: th } = targetBounds

    // 计算目标窗口相对于屏幕的位置（处理多显示器情况）
    // 目标窗口可能超出屏幕边界，需要 clamp
    const clampedTarget = {
      x: Math.max(sx, Math.min(tx, sx + sw)),
      y: Math.max(sy, Math.min(ty, sy + sh)),
      width: Math.max(0, Math.min(tw, sx + sw - Math.max(sx, tx))),
      height: Math.max(0, Math.min(th, sy + sh - Math.max(sy, ty)))
    }

    // 如果目标窗口完全在屏幕外，使用屏幕中心的一个点
    if (clampedTarget.width <= 0 || clampedTarget.height <= 0) {
      return {
        top: { x: sx, y: sy, width: sw, height: sh },
        bottom: { x: 0, y: 0, width: 0, height: 0 },
        left: { x: 0, y: 0, width: 0, height: 0 },
        right: { x: 0, y: 0, width: 0, height: 0 }
      }
    }

    return {
      // 顶部遮罩：从屏幕顶部到目标窗口顶部
      top: {
        x: sx,
        y: sy,
        width: sw,
        height: Math.max(0, clampedTarget.y - sy)
      },
      // 底部遮罩：从目标窗口底部到屏幕底部
      bottom: {
        x: sx,
        y: clampedTarget.y + clampedTarget.height,
        width: sw,
        height: Math.max(0, sy + sh - (clampedTarget.y + clampedTarget.height))
      },
      // 左侧遮罩：目标窗口左侧区域（高度与目标窗口相同）
      left: {
        x: sx,
        y: clampedTarget.y,
        width: Math.max(0, clampedTarget.x - sx),
        height: clampedTarget.height
      },
      // 右侧遮罩：目标窗口右侧区域（高度与目标窗口相同）
      right: {
        x: clampedTarget.x + clampedTarget.width,
        y: clampedTarget.y,
        width: Math.max(0, sx + sw - (clampedTarget.x + clampedTarget.width)),
        height: clampedTarget.height
      }
    }
  }

  /**
   * 应用遮罩区域到窗口
   *
   * 使用 setImmediate 确保在同一事件循环中批量更新，减少视觉撕裂
   */
  private applyOverlayRects(rects: OverlayRects): void {
    const positions: OverlayPosition[] = ['top', 'bottom', 'left', 'right']

    // 使用 setImmediate 批量更新
    setImmediate(() => {
      for (const position of positions) {
        const win = this.overlays.get(position)
        if (!win || win.isDestroyed()) continue

        const rect = rects[position]

        // 零尺寸窗口隐藏，避免闪烁
        if (rect.width <= 0 || rect.height <= 0) {
          if (win.isVisible()) {
            win.hide()
          }
          continue
        }

        // 更新窗口位置和大小
        win.setBounds({
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })

        // 显示窗口（如果之前隐藏）
        if (!win.isVisible()) {
          win.showInactive() // 使用 showInactive 避免抢焦点
        }
      }
    })
  }
}

// 单例导出
export const overlayManager = new OverlayManager()
