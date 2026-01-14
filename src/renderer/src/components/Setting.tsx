import { useStore } from '@renderer/hooks/useStore'

export const Setting: React.FC = () => {
  const { settings, updateSettings } = useStore()

  return (
    <div style={{ padding: '20px' }}>
      <h2>设置</h2>

      <div style={{ marginBottom: '16px' }}>
        <label htmlFor="defaultDuration" style={{ display: 'block', marginBottom: '8px' }}>
          默认专注时长（分钟）
        </label>
        <input
          id="defaultDuration"
          type="number"
          min="1"
          max="120"
          value={settings.defaultDuration}
          onChange={(e) => updateSettings({ defaultDuration: Number(e.target.value) })}
          style={{ padding: '4px 8px', width: '100px' }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
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

      <div style={{ marginBottom: '16px' }}>
        <label>
          <input
            type="checkbox"
            checked={settings.showTrayIcon}
            onChange={(e) => updateSettings({ showTrayIcon: e.target.checked })}
            style={{ marginRight: '8px' }}
          />
          显示托盘图标
        </label>
      </div>
    </div>
  )
}
