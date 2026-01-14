/**
 * 渲染进程入口文件
 *
 * 渲染进程是 Electron 应用的前端部分，运行在 Chromium 浏览器环境中，负责：
 * 1. 构建和渲染用户界面
 * 2. 处理用户交互事件
 * 3. 管理前端状态和路由
 * 4. 通过 window.electron API 与主进程通信
 *
 * 本项目使用 React + TypeScript 技术栈
 */

import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

/**
 * React 应用挂载
 *
 * 1. 获取 HTML 中的根元素节点（id="root"）
 * 2. 使用 React 18 的 createRoot API 创建根实例
 * 3. 在 StrictMode 下渲染 App 组件
 *
 * StrictMode 的作用：
 * - 检测潜在问题（副作用、过时 API 等）
 * - 开发模式下会进行额外的检查和警告
 * - 不影响生产环境构建
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
