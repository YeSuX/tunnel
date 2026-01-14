/**
 * 应用根组件
 *
 * 这是渲染进程的主要界面组件
 * 演示了基本的 React 组件结构和 Electron IPC 通信
 */

import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  /**
   * IPC 通信处理函数
   *
   * 演示如何从渲染进程向主进程发送消息：
   * 1. 通过 window.electron.ipcRenderer.send() 发送消息
   * 2. 主进程通过 ipcMain.on() 监听并处理消息
   * 3. 这是 Electron 进程间通信的基本模式
   *
   * 消息流程：
   * 渲染进程（这里）-> preload 脚本 -> 主进程（index.ts）
   */
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      {/* 应用 Logo */}
      <img alt="logo" className="logo" src={electronLogo} />

      {/* 技术栈说明 */}
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>

      {/* 开发提示 */}
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>

      {/* 操作按钮区域 */}
      <div className="actions">
        {/* 文档链接 */}
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>

        {/* IPC 通信测试按钮 */}
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
      </div>

      {/* 版本信息组件 */}
      <Versions></Versions>
    </>
  )
}

export default App
