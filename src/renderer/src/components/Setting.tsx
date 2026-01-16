import { useStore } from '@renderer/hooks/useStore'
import { useState, useEffect } from 'react'
import type { WindowInfo, RunningApp, FocusChangeEvent } from '../../../shared/types'
import { IPC_CHANNELS } from '../../../shared/ipc'

export const Setting: React.FC = () => {
  const { settings, updateSettings } = useStore()
  const [newTimer, setNewTimer] = useState<string>('')

  // ============ 窗口监控测试状态 ============
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null)
  const [runningApps, setRunningApps] = useState<RunningApp[]>([])
  const [isFocusWatching, setIsFocusWatching] = useState(false)
  const [focusHistory, setFocusHistory] = useState<string[]>([])

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
    </div>
  )
}
