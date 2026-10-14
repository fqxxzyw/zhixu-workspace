# Fluent 桌面界面

Web 与 Electron 共用 React 工作台、编辑器、API 和 Radix 控件。评估 Fluent UI React v9 后保留现有 Radix 的焦点锁定、键盘导航与门户机制，避免更换编辑器及业务逻辑；样式由统一的 Fluent 语义令牌控制，所有图标使用 `@fluentui/react-icons` 的 Regular 图形。新增 UI 应复用 `app/ui.tsx` 的 `Btn`、`IconButton`、`Choice`、`Modal`、`SettingRow`、`LoadingState` 以及现有导航组件。

## 规范来源

设计和本次修订参考微软官方 Design Tokens、Fluent Motion、NavigationView / WinUI Gallery 示例、Fluent UI v9 Button 实现，以及 Electron 原生窗口与主题 API。

- [Fluent 2 Design Tokens](https://fluent2.microsoft.design/design-tokens)
- [Fluent 2 Motion](https://fluent2.microsoft.design/motion)
- [Windows NavigationView 与 WinUI Gallery 示例](https://learn.microsoft.com/windows/apps/develop/ui/controls/navigationview)
- [Electron nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme)
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

## v0.3.0 修订

- 取消 document.startViewTransition 整页快照，保留 CSS 内容淡入，连续操作不会被快照层拦截。文本框只在内容或宽度变化时测量，不再每次按键重建 ResizeObserver。
- Modal 统一使用固定标题和可滚动正文。网格列使用 minmax(0, …)，长文本换行；代码、公式、表格在自己的区域滚动，深层目录缩进最多占 84px。
- FileIndex 使用一次构建的目录树、可见行分页（每页 100 项）和明确的加载状态。5000 文件树展开与分组有覆盖测试；UI 测试通过真实扫描的 230 个文件验证分页、分类、搜索和预览。
- 本地 appearance.json 采用串行原子写入，启动先读取再应用主题；Web 仍使用 localStorage。原生材质根据高对比与减少透明度设置回退。
- 大于 100,000 字符或未知语言的代码以完整纯文本展示，不执行自动语言探测；普通高亮通过 memo/useMemo 缓存。
- 测试新增弹窗内部 scrollWidth 断言，避免正文已经在弹窗里溢出但整个页面宽度仍正常的漏检。

Windows 发布流水线还会运行 UI 测试并保留截图；所有打包与安装检查通过后才公开 EXE、完整 ZIP、校验文件。原生 Mica/Snap/多显示器切换仍需 Windows 11 交互式人工验收。
