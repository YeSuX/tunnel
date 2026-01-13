### 1. 产品定位 (Positioning)

- **产品名称代号**：**Tunnel (隧道)**
- **一句话口号**：The **ruthless desktop** alternative to Mom Clock. (专为电脑工作者设计的“强制聚焦”工具)。
- **核心差异点**：
  - **场景差异**：Mom Clock 针对生活琐事（手机端）；Tunnel 针对深度工作（桌面端）。
  - **体验差异**：Mom Clock 靠“唠叨”；Tunnel 靠“视觉剥夺”（Visual Deprivation）——除了工作窗口，其余全黑。
  - **商业差异**：一次性买断（Lifetime Deal），无订阅。

### 2. 核心功能 (Core Features - MVP Scope)

- **Killer Feature (杀手锏)：单窗口锁定模式 (The Spotlight)**
  - 用户选择一个目标应用（例如：VS Code）。
  - 开启 Timer 后，屏幕上除了该应用窗口，其余部分全部变成**纯黑色遮罩**（Dimmed/Blacked out）。
  - **逻辑**：如果用户尝试 `Alt-Tab` 或点击其他地方，Tunnel 会立即强制将焦点拉回目标窗口，并播放一声短促的“拒绝音效”。
  - _这是“不协商”的桌面版体现。_

- **Basic Features (基础功能)**
  - **快速计时器**：预设 15min, 30min, 60min 按钮（减少决策）。
  - **允许列表 (Allowlist)**：允许用户添加 1-2 个辅助应用（如：允许 VS Code 的同时允许 Chrome，但仅限特定 URL，MVP 期可简化为仅允许 App）。
  - **紧急出口 (Emergency Exit)**：为了防止死机或真正的紧急情况，用户必须**长按 Esc 键 10 秒钟**才能强制退出。这增加了退出的摩擦成本。

- **不做列表 (Not Doing - MVP)**
  - **不做**：复杂的日程表/日历集成（MVP 只有“现在开始”）。
  - **不做**：移动端 App。
  - **不做**：统计报表/图表（用户不在乎你专注了多久，只在乎任务做没做完）。
  - **不做**：社交分享功能。
  - **不做**：网站具体的 URL 拦截（技术复杂，MVP 阶段只做进程级拦截）。

### 3. 用户旅程 (User Journey)

1.  **启动**：用户打开 Tunnel（常驻菜单栏）。
2.  **设定**：点击图标，下拉框选择当前要专注的 App（系统自动列出当前运行的 App，如 Figma）。
3.  **承诺**：选择时长 "45 Minutes"。
4.  **行动 (Aha Moment)**：点击 "Enter Tunnel"。
    - _瞬间效果_：屏幕背景变黑，Dock 栏消失，只有 Figma 亮着。
    - _尝试违规_：用户下意识按 `Cmd+Tab` 想看微信。微信窗口刚闪现 0.1 秒，Tunnel 立刻将其盖住并把 Figma 重新置顶。
    - _心理反馈_：用户意识到“没法摸鱼了”，只能继续工作。
5.  **完成**：倒计时结束，黑色遮罩褪去，播放清脆的完成音，弹出文字：“You crushed it.”

### 4. 技术栈推荐 (Tech Stack for Speed)

- **框架**：**Electron** (配合 React/Vue)。
  - _理由_：虽然包体积大，但开发速度最快，且社区有大量现成的“窗口管理”库。对于 MVP，开发速度 > 软件体积。
- **关键“偷懒”方案 (npm 库)**：
  - `active-win` (Sindre Sorhus)：获取当前活动窗口的信息。
  - `electron-overlay-window` 或 自定义 `BrowserWindow`：用于制作覆盖全屏的黑色遮罩层。
  - `robotjs` 或 `nut.js`：用于由代码强制控制键盘/鼠标焦点（如果 Electron 原生 API 不够强硬的话）。
- **数据存储**：**electron-store**。
  - _理由_：简单的 JSON 文件存储配置。不需要后端数据库，完全 Local-first。

### 5. 数据结构 (Simplified Schema)

由于是 Local-first，这是存储在本地 JSON 中的结构：

```json
{
  "user_settings": {
    "strict_mode": true, // 是否开启强制拉回焦点
    "sound_enabled": true
  },
  "history": [
    {
      "id": "uuid",
      "app_name": "VS Code",
      "duration_minutes": 45,
      "completed_at": "2023-10-27T10:00:00Z",
      "status": "completed" // or "aborted"
    }
  ]
}
```

### 6. 商业模式与定价 (Monetization Strategy)

- **定价策略**：**早期买断制 (Lifetime Deal)**。
  - **价格**：$14.99 (早鸟价) -> $29.99 (正价)。
  - **话术**：“比你因为分心而浪费的一小时时薪还便宜。” (Cheaper than one hour of your distracted time.)
  - **对比**：Mom Clock 可能每月收 $5，我们一次性收费，吸引讨厌订阅的用户。

- **早期获客**：
  - **渠道**：Hacker News, Reddit (r/productivity, r/gamedev, r/adhd_programmers)。
  - **钩子**：发布一个 GIF 动图，展示“试图打开 Twitter 却被无情地弹回代码编辑器”的画面。这种视觉冲击力在社交媒体上极强。

### 7. 风险提示

- **系统权限风险**：macOS 对 Accessibility（辅助功能）和 Screen Recording（屏幕录制/捕获）权限要求越来越严。
  - _对策_：在 Onboarding（新手引导）流程中，必须制作非常清晰的 GIF 教程，引导用户去“系统设置”里开启权限，否则 App 无法运行。
- **Windows/Mac 差异**：Windows 的窗口管理 API 和 Mac 完全不同。
  - _对策_：MVP 建议**先只做一个平台**（推荐 macOS，因付费意愿更高且独立开发者聚集），验证成功后再移植。

---

**顾问总结**：
这个方案的核心在于**做减法**。Mom Clock 试图做“全能管家”，我们做“单一场景的保镖”。通过聚焦 Desktop 场景，避开了移动端红海，同时利用“买断制”吸引对订阅疲劳的高价值用户。
