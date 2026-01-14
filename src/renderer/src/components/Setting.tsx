import { useStore } from '@renderer/hooks/useStore'
import { useState } from 'react'

export const Setting: React.FC = () => {
  const { settings, updateSettings } = useStore()
  const [newTimer, setNewTimer] = useState<string>('')

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
    <div style={{ padding: '20px', maxWidth: '600px' }}>
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
                background: '#f0f0f0',
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
    </div>
  )
}
