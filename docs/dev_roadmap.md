# Tunnel Engineering Roadmap

> **Status**: Planning
> **Target Platform**: macOS (MVP)
> **Stack**: Electron, React, TypeScript, active-win

本文档旨在规划 **Tunnel** 从原型到 MVP 发布的工程路径。核心原则是优先解决技术风险（窗口管理、权限），确保核心体验的鲁棒性。

## 🏗 Phase 1: Foundation & Architecture (基建与架构)

目标：确立代码规范，搭建 IPC 通信框架，确保“地基”稳固。

- [x] **Project Constraints Configuration**
  - [x] 强制执行 TypeScript 严格模式 (`strict: true`).
  - [x] 配置 ESLint + Prettier (针对 Electron/React 最佳实践).
  - [x] 确立目录结构：分离 `Main Process` (系统交互) 与 `Renderer Process` (UI).
- [ ] **State Management & Persistence**
  - [x] 集成 `electron-store` 用于持久化用户配置 (Allowlist, Settings).
  - [ ] 定义 JSON Schema (参考 PRD Section 5).
  - [ ] 封装 `SettingsManager` 类，并在 Main Process 中单例运行。
- [ ] **IPC Bridge Design**
  - [ ] 定义类型安全的 IPC 通道 (`IPC_CHANNELS`).
  - [ ] 实现 `preload` 脚本，暴露受限 API 给渲染进程 (Context Isolation).

## ⚔️ Phase 2: Core Mechanics - "The Enforcer" (核心机制验证)

目标：攻克最难的技术点。如果这部分做不到“无缝”，UI 再漂亮也没用。**这是 MVP 的生死线。**

- [ ] **Window Detection (Sensing)**
  - [ ] 集成 `active-win` 或原生 macOS API。
  - [ ] 实现 `WindowMonitor` 服务：每秒轮询或监听系统事件，获取当前激活窗口的 PID 和 Bounds (坐标/尺寸)。
  - [ ] **技术难点验证**：确保获取窗口信息的延迟 < 100ms。
- [ ] **The "Blackout" Overlay (Visual Deprivation)**
  - [ ] 实现全屏透明/点击穿透窗口 (`BrowserWindow` setIgnoreMouseEvents).
  - [ ] **渲染策略**：
    - 方案 A：使用 SVG `<mask>` 在黑色背景中“挖孔”露出目标 App。
    - 方案 B：创建 4 个黑色无边框窗口围绕目标 App (避免遮挡目标 App 的交互)。
    - _决策点：优先测试方案 A 的性能与兼容性。_
- [ ] **Focus Enforcement (The Bouncer)**
  - [ ] 实现“焦点看门狗”逻辑：当用户切换到非白名单 App 时，强制 `focus` 回目标 App。
  - [ ] 集成音效播放 (拒绝音效)。
- [ ] **Emergency Exit (Safety)**
  - [ ] 注册全局快捷键 (GlobalShortcut)：监听长按 `ESC` 事件。
  - [ ] 实现倒计时逻辑 (10s) 及 UI 反馈。

## 🎨 Phase 3: MVP Features & UI (功能实现)

目标：基于稳固的核心机制，构建用户可交互的界面。

- [ ] **Main Dashboard UI**
  - [ ] App Selector：下拉列出当前运行的应用程序 (排除自身及系统进程)。
  - [ ] Timer Control：15/30/60 min 快速选择。
  - [ ] "Enter Tunnel" 触发动画。
- [ ] **Tray Integration**
  - [ ] 实现 macOS 菜单栏图标 (Tray)。
  - [ ] 支持 Tray 菜单快速退出或显示剩余时间。
- [ ] **Feedback Loop**
  - [ ] 完成时的界面状态 ("You crushed it").
  - [ ] 简单的历史记录写入 (`history` array).

## 🛡 Phase 4: System Integration & Hardening (系统集成与加固)

目标：处理操作系统层面的摩擦力，优化用户体验。

- [ ] **Permissions Handling (Critical)**
  - [ ] 实现 `PermissionGuard`：启动时检查 `Accessibility` 和 `Screen Recording` 权限。
  - [ ] 制作引导页：若权限缺失，通过 GIF/视频引导用户开启。
- [ ] **Edge Case Handling**
  - [ ] 处理目标 App 意外崩溃的情况。
  - [ ] 处理目标 App 全屏/非全屏切换的坐标同步。
  - [ ] 处理多显示器支持 (MVP 策略：仅在主屏生效或覆盖所有屏幕)。
- [ ] **Performance Tuning**
  - [ ] 优化轮询频率，降低 CPU 占用。
  - [ ] 确保遮罩层渲染不引起卡顿。

## 📦 Phase 5: Delivery (发布准备)

目标：打包、签名与分发。

- [ ] **Build Pipeline**
  - [ ] 配置 `electron-builder`。
  - [ ] 设置 macOS 代码签名 (Code Signing) 与公证 (Notarization) —— _必须，否则无法运行。_
- [ ] **Licensing Stub**
  - [ ] 预留 License Key 输入接口 (为后续接入 Gumroad/LemonSqueezy 做准备)。
- [ ] **Dogfooding**
  - [ ] 内部测试：在高强度开发环境下自用 1 周，修复体验 Bug。

---

### 📚 Tech Stack Summary

- **Core**: Electron, React, TypeScript
- **State**: electron-store, Zustand (Renderer state)
- **System**: active-win, iolet/robotjs (fallback for focus control)
- **Build**: electron-builder, electron-vite
