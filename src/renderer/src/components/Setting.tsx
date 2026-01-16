import { useStore } from '@renderer/hooks/useStore'
import { useState, useEffect } from 'react'
import type {
  WindowInfo,
  WindowBounds,
  RunningApp,
  FocusChangeEvent,
  BoundsChangeEvent
} from '../../../shared/types'
import { IPC_CHANNELS } from '../../../shared/ipc'

export const Setting: React.FC = () => {
  const { settings, updateSettings } = useStore()
  const [newTimer, setNewTimer] = useState<string>('')

  // ============ 窗口监控测试状态 ============
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([])
  const [isFocusWatching, setIsFocusWatching] = useState(false)
  const [focusHistory, setFocusHistory] = useState<string[]>([])

  // ============ Overlay 测试状态 ============
  const [overlayStatus, setOverlayStatus] = useState<{
    initialized: boolean
    active: boolean
    targetBounds: WindowBounds | null
  } | null>(null)
  const [selectedTargetWindow, setSelectedTargetWindow] = useState<WindowInfo | null>(null)
  const [isBoundsTracking, setIsBoundsTracking] = useState(false)
  const [boundsLog, setBoundsLog] = useState<string[]>([])

  // 获取当前焦点窗口
  const handleGetActiveWindow = async (): Promise<void> => {
    const win = await window.api.window.getActive()
    setActiveWindow(win)
  }

  // 获取运行中的应用
  const handleGetRunningApps = async (): Promise<void> => {
    const apps = await window.api.window.getRunningApps()
    setRunningApps(apps)
  }

  // 切换焦点监控
  const toggleFocusWatch = async (): Promise<void> => {
    if (isFocusWatching) {
      await window.api.window.stopFocusWatch()
      setIsFocusWatching(false)
    } else {
      await window.api.window.startFocusWatch()
      setIsFocusWatching(true)
      setFocusHistory([])
    }
  }

  // ============ Overlay 测试功能 ============

  // 获取 Overlay 状态
  const handleGetOverlayStatus = async (): Promise<void> => {
    const status = await window.api.overlay.getStatus()
    setOverlayStatus(status)
  }

  // 选择当前焦点窗口作为目标
  const handleSelectCurrentAsTarget = async (): Promise<void> => {
    const win = await window.api.window.getActive()
    setSelectedTargetWindow(win)
  }

  // 激活 Overlay
  const handleActivateOverlay = async (): Promise<void> => {
    if (!selectedTargetWindow) {
      alert('请先选择目标窗口')
      return
    }
    await window.api.overlay.activate(selectedTargetWindow.bounds)
    await handleGetOverlayStatus()

    // 开始追踪目标窗口位置
    await window.api.window.startBoundsTrack(selectedTargetWindow.id)
    setIsBoundsTracking(true)
    setBoundsLog([])
  }

  // 停用 Overlay
  const handleDeactivateOverlay = async (): Promise<void> => {
    await window.api.overlay.deactivate()

    // 停止位置追踪
    if (isBoundsTracking) {
      await window.api.window.stopBoundsTrack()
      setIsBoundsTracking(false)
    }

    await handleGetOverlayStatus()
  }

  // 订阅焦点变化事件
  useEffect(() => {
    const unsubscribe = window.api.on<FocusChangeEvent>(
      IPC_CHANNELS.WINDOW_FOCUS_CHANGE_PUSH,
      (event) => {
        const log = `[${new Date().toLocaleTimeString()}] ${event.current.owner.name} - ${event.current.title}`
        setFocusHistory((prev) => [log, ...prev].slice(0, 20))
      }
    )
    return () => unsubscribe()
  }, [])

  // 订阅窗口位置变化事件（用于同步更新 Overlay）
  useEffect(() => {
    const unsubscribe = window.api.on<BoundsChangeEvent>(
      IPC_CHANNELS.WINDOW_BOUNDS_CHANGE_PUSH,
      (event) => {
        // 实时更新 Overlay 位置
        window.api.overlay.update(event.currentBounds)

        // 记录日志
        const { x, y, width, height } = event.currentBounds
        const log = `[${new Date().toLocaleTimeString()}] x=${x}, y=${y}, ${width}×${height}`
        setBoundsLog((prev) => [log, ...prev].slice(0, 10))
      }
    )
    return () => unsubscribe()
  }, [])

  // 添加快速计时器
  const handleAddTimer = (): void => {
    const value = parseInt(newTimer, 10)
    const currentTimers = settings.quickTimers || []
    if (!isNaN(value) && value > 0 && !currentTimers.includes(value)) {
      updateSettings({
        quickTimers: [...currentTimers, value].sort((a, b) => a - b)
      })
      setNewTimer('')
    }
  }

  // 移除快速计时器
  const handleRemoveTimer = (timer: number): void => {
    const currentTimers = settings.quickTimers || []
    updateSettings({
      quickTimers: currentTimers.filter((t) => t !== timer)
    })
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', height: '100vh', overflow: 'auto' }}>
      <h2>设置</h2>

      {/* 严格模式 */}
      <div style={{ marginBottom: '24px' }}>
        <label>
          <input
            type="checkbox"
            checked={settings.strictMode}
            onChange={(e) => updateSettings({ strictMode: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          <strong>严格模式</strong>
          <span style={{ color: '#666', fontSize: '14px', marginLeft: '8px' }}>
            启用后将强制拉回焦点到目标应用
          </span>
        </label>
      </div>

      {/* 音效开关 */}
      <div style={{ marginBottom: '24px' }}>
        <label>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          启用音效
        </label>
      </div>

      {/* 紧急退出时长 */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="emergencyExitDuration" style={{ display: 'block', marginBottom: '8px' }}>
          紧急退出按键时长（秒）
        </label>
        <input
          id="emergencyExitDuration"
          type="number"
          min="3"
          max="30"
          value={settings.emergencyExitDuration}
          onChange={(e) => updateSettings({ emergencyExitDuration: Number(e.target.value) })}
          style={{ padding: '4px 8px', width: '100px' }}
        />
        <span style={{ color: '#666', fontSize: '14px', marginLeft: '8px' }}>
          长按 Esc 键达到此时长可强制退出
        </span>
      </div>

      {/* 快速计时器预设 */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          快速计时器预设（分钟）
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {(settings.quickTimers || []).map((timer) => (
            <span
              key={timer}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {timer} 分钟
              <button
                onClick={() => handleRemoveTimer(timer)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="number"
            min="1"
            placeholder="添加新预设"
            value={newTimer}
            onChange={(e) => setNewTimer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTimer()}
            style={{ padding: '4px 8px', width: '120px' }}
          />
          <button
            onClick={handleAddTimer}
            style={{
              padding: '4px 12px',
              cursor: 'pointer'
            }}
          >
            添加
          </button>
        </div>
      </div>

      {/* ============ 窗口监控测试区域 ============ */}
      <div style={{ marginTop: '40px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
        <h2>🧪 窗口监控测试</h2>

        {/* 获取当前焦点窗口 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleGetActiveWindow}
            style={{ padding: '8px 16px', cursor: 'pointer', marginRight: '8px' }}
          >
            获取当前焦点窗口
          </button>
          {activeWindow && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <div>
                <strong>应用:</strong> {activeWindow.owner.name}
              </div>
              <div>
                <strong>标题:</strong> {activeWindow.title}
              </div>
              <div>
                <strong>窗口 ID:</strong> {activeWindow.id}
              </div>
              <div>
                <strong>位置:</strong> x={activeWindow.bounds.x}, y={activeWindow.bounds.y}
              </div>
              <div>
                <strong>尺寸:</strong> {activeWindow.bounds.width} × {activeWindow.bounds.height}
              </div>
              {activeWindow.owner.bundleId && (
                <div>
                  <strong>Bundle ID:</strong> {activeWindow.owner.bundleId}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 获取运行中的应用 */}
        <div style={{ marginBottom: '24px' }}>
          <button onClick={handleGetRunningApps} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            获取运行中的应用列表
          </button>
          {runningApps.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#f5f5f5',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {runningApps.map((app) => (
                <div key={app.processId} style={{ marginBottom: '4px', fontSize: '13px' }}>
                  <strong>{app.name}</strong>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    PID: {app.processId}
                    {app.id && ` | ${app.id}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 焦点监控 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={toggleFocusWatch}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: isFocusWatching ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            {isFocusWatching ? '⏹ 停止焦点监控' : '▶ 开始焦点监控'}
          </button>
          <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
            {isFocusWatching ? '正在监控焦点变化...' : '点击开始后切换窗口查看效果'}
          </span>
          {focusHistory.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#1e1e1e',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#0f0'
              }}
            >
              {focusHistory.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ Overlay 遮罩测试区域 ============ */}
      <div style={{ marginTop: '40px', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
        <h2>🎭 Overlay 遮罩测试</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
          测试 Blackout Overlay 功能：选择目标窗口后激活遮罩，屏幕上只露出目标窗口
        </p>

        {/* Overlay 状态 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={handleGetOverlayStatus}
            style={{ padding: '8px 16px', cursor: 'pointer', marginRight: '8px' }}
          >
            获取 Overlay 状态
          </button>
          {overlayStatus && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '13px',
                background: overlayStatus.active ? '#e8f5e9' : '#f5f5f5'
              }}
            >
              <div>
                <strong>初始化:</strong> {overlayStatus.initialized ? '✅ 是' : '❌ 否'}
              </div>
              <div>
                <strong>激活状态:</strong>{' '}
                <span style={{ color: overlayStatus.active ? 'green' : '#666' }}>
                  {overlayStatus.active ? '🟢 已激活' : '⚪ 未激活'}
                </span>
              </div>
              {overlayStatus.targetBounds && (
                <div>
                  <strong>目标窗口位置:</strong> x={overlayStatus.targetBounds.x}, y=
                  {overlayStatus.targetBounds.y}, {overlayStatus.targetBounds.width}×
                  {overlayStatus.targetBounds.height}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 选择目标窗口 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Step 1: 选择目标窗口
          </label>
          <button
            onClick={handleSelectCurrentAsTarget}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            📌 将当前焦点窗口设为目标
          </button>
          <span style={{ marginLeft: '12px', color: '#666', fontSize: '13px' }}>
            先切换到想要聚焦的应用，再点击此按钮
          </span>
          {selectedTargetWindow && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            >
              <div>
                <strong>已选择:</strong> {selectedTargetWindow.owner.name}
              </div>
              <div>
                <strong>窗口标题:</strong> {selectedTargetWindow.title}
              </div>
              <div>
                <strong>窗口 ID:</strong> {selectedTargetWindow.id}
              </div>
              <div>
                <strong>位置:</strong> x={selectedTargetWindow.bounds.x}, y=
                {selectedTargetWindow.bounds.y}, {selectedTargetWindow.bounds.width}×
                {selectedTargetWindow.bounds.height}
              </div>
            </div>
          )}
        </div>

        {/* 激活/停用 Overlay */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Step 2: 激活/停用遮罩
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleActivateOverlay}
              disabled={!selectedTargetWindow || overlayStatus?.active}
              style={{
                padding: '12px 24px',
                cursor: selectedTargetWindow && !overlayStatus?.active ? 'pointer' : 'not-allowed',
                background: selectedTargetWindow && !overlayStatus?.active ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: 'bold'
              }}
            >
              🚀 激活 Overlay
            </button>
            <button
              onClick={handleDeactivateOverlay}
              disabled={!overlayStatus?.active}
              style={{
                padding: '12px 24px',
                cursor: overlayStatus?.active ? 'pointer' : 'not-allowed',
                background: overlayStatus?.active ? '#ff4444' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: 'bold'
              }}
            >
              ⏹ 停用 Overlay
            </button>
          </div>
        </div>

        {/* Bounds 追踪日志 */}
        {isBoundsTracking && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              📍 窗口位置追踪日志
            </label>
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#1e1e1e',
                borderRadius: '4px',
                maxHeight: '150px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#0ff'
              }}
            >
              {boundsLog.length > 0 ? (
                boundsLog.map((log, i) => <div key={i}>{log}</div>)
              ) : (
                <div style={{ color: '#666' }}>移动目标窗口查看位置变化...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
