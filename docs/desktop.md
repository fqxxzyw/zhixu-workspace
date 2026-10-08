# Windows 桌面预览版

桌面源代码位于 `desktop/`，复用 Web 的编辑器和知识 API。Electron 只提供窗口、文件夹选择和文件定位；受沙箱保护的渲染进程没有 Node.js 或任意文件读写权限。本地 HTTP 服务只绑定 127.0.0.1，检查 Host / Origin，所有知识接口必须持有本地会话。

## 安装与存储

在 GitHub Releases 下载 Windows x64 安装包。首次启动设置本地账户和密码，新用户没有示例笔记。密码经随机盐 scrypt 派生后保存，登录会话 8 小时有效；当前版本每台安装仅支持一个账户，无密码找回。

数据目录默认 `%APPDATA%\知序`，可通过顶部硬盘图标打开。`knowledge.sqlite` 保存知识、索引和修改历史；`resources` 保存用户显式上传的资源；`secret.enc` 保存经系统保护的密钥。AI API Key 在数据库中加密。备份应关闭应用后保存整个数据目录。卸载默认保留数据。

## 本地文件整理

点击“本地文件索引 → 选择文件夹”，系统窗口选择目录后才开始扫描。索引保存路径、大小、修改时间和独立的分类信息，不写入原目录。目录树、文件类别、学科和虚拟目录可切换。预览只读取内容；“创建学习笔记”把原文件路径记录到独立笔记。

刷新索引保留分类与笔记；已删除文件标为不可用。扫描可暂停，不把未完成扫描中的文件误判为删除。不递归符号链接和常见构建目录。单目录扫描上限 50,000 文件，列表与索引搜索最多覆盖显示的 5,000 条；大目录应选择更小的子目录。文本预览 2 MB，图片 12 MB，PDF / Office 等通过“定位原文件”使用外部应用阅读。

“上传 / 导入”是显式创建应用副本；与只建立索引的本地文件入口不同。应用没有自动云同步。AI 只有主动发起请求时才发送所选笔记上下文。

## 构建

需要 Windows x64、Node.js 24 和 pnpm 11.25.0。在仓库根目录执行：

```sh
pnpm install --frozen-lockfile
npm ci --prefix desktop
pnpm check
npm --prefix desktop run build
npm --prefix desktop test
npm --prefix desktop run package:win
```

安装包位于 `desktop/release/Zhixu-Setup-0.2.0-x64.exe`。开发启动：`npm --prefix desktop start`（先 build）。Windows Actions 自动执行集成测试、NSIS 打包、打包程序启动、静默安装与再次启动验证，通过后发布预览 Release 和 SHA256。

当前没有代码签名证书。桌面版本不执行 Python / Java / C++ 内核，不提供跨设备协作。Web 与桌面本地数据库分离；可通过 Markdown / JSON 导入导出迁移笔记。
