# Fluent 桌面界面

Web 与 Electron 共用 React 工作台、编辑器、API 和 Radix 控件。评估 Fluent UI React v9 后保留现有 Radix 的焦点锁定、键盘导航与门户机制，避免更换编辑器及业务逻辑；样式由统一的 Fluent 语义令牌控制，所有图标使用 `@fluentui/react-icons` 的 Regular 图形。新增 UI 应复用 `app/ui.tsx` 的 `Btn`、`IconButton`、`Choice`、`Modal`、`SettingRow`、`LoadingState` 以及现有导航组件。

## 规范来源

设计前查阅了微软官方材料、动效文档和 Fluent UI v9 的 Button 实现；官方网站在云环境返回 403，因此通过对应官方 GitHub 仓库读取内容。

- [Windows Materials](https://learn.microsoft.com/windows/apps/design/signature-experiences/materials)；[官方 Markdown](https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/signature-experiences/materials.md)
- [Windows Timing and easing](https://learn.microsoft.com/windows/apps/design/motion/timing-and-easing)；[官方 Markdown](https://github.com/MicrosoftDocs/windows-dev-docs/blob/docs/hub/apps/design/motion/timing-and-easing.md)
- [Fluent UI v9 Button styles](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-button/library/src/components/Button/useButtonStyles.styles.ts)
- [Electron background materials](https://www.electronjs.org/docs/latest/api/browser-window#winsetbackgroundmaterialmaterial-windows)
- [Electron Window Controls Overlay](https://www.electronjs.org/docs/latest/api/structures/base-window-options)

## 可复用规则

`app/fluent.css` 包含浅色与深色语义颜色、Segoe UI Variable 字体栈、4/8/12/16/24/32px 间距、4px 控件圆角、8px 卡片圆角、12px 弹窗圆角，以及 83/167/250ms 动效。控件使用低对比边框，选中导航使用强调色指示条。页面、列表和浮层保留克制的位移/淡入，Radix 提供弹窗、菜单的退出动画。减少动画遵循系统设置和应用开关；高对比模式使用系统颜色。

`AppearanceProvider` 统一处理主题持久化、系统主题更新、减少动画和 Windows 强调色。强调色在每个主题下调整到可读亮度，同时选择有足够对比度的按钮文字颜色。无需联网获取字体、图标或主题。

`desktop/main.cjs` 在 Windows 11 22H2（build 22621）及以上调用 Electron `backgroundMaterial: 'mica'`，保留系统窗口按钮、拖动、调整大小、最大化和 Windows 窗口行为。旧 Windows 和其他平台使用纯色表面。菜单位于现有渲染窗口的 Radix 门户内，目前使用纯色回退；没有用 CSS blur 模拟原生 Acrylic。渲染进程的 Node 隔离与 IPC 来源验证保持启用。

## 修复的问题

- 桌面 Vite 构建缺少共享 App/组件 Tailwind 扫描路径，导致门户定位与控件样式缺失。
- 长标题改为自动高度文本框；长名称、路径、标签与列表列明确分配可收缩空间。
- 目录箭头不再被通用按钮的 `flex: 1` 拉宽。
- 快速切换笔记或文件预览时，过期响应不能覆盖最后的选择；文件搜索增加防抖。
- 手动打开的对话框、确认框和侧面板关闭后恢复原控件焦点。
- 复习卡片支持空格/Enter；掌握程度滑块通过键盘调整后同样保存。

## 验证

```sh
pnpm check
pnpm test:tools
pnpm build
pnpm test:integration
npm --prefix desktop run build
npm --prefix desktop test
# 使用现有 Chromium，或先安装 Playwright 浏览器。
CHROMIUM_PATH=/usr/bin/chromium pnpm test:ui
```

`test:ui` 启动真实桌面本地服务和临时 SQLite，替代测试中的原生 IPC。测试账户登录、笔记保存、复习、各主要页面、主题与动效偏好、焦点恢复、请求竞态，以及 360–1380px 窗口和 100/125/150/200% 比例的逻辑视口/DPR 组合。截图保存到被忽略的 `outputs/fluent/`。

浏览器验证不能替代 Windows 实机验收：原生 Mica、窗口按钮/Snap、多显示器 DPI 切换、系统凭据加密以及 EXE 安装仍应在 Windows 11 验证。当前未将 CSS 视口/DPR 模拟描述为 Windows 实机缩放测试。
