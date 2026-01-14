/**
 * 应用根组件
 *
 * 这是渲染进程的主要界面组件
 * 演示了基本的 React 组件结构和 Electron IPC 通信
 */

import { Setting } from './components/Setting'

function App(): React.JSX.Element {
  return (
    <>
      <Setting />
    </>
  )
}

export default App
