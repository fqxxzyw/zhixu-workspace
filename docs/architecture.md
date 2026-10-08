# 功能与架构

## 当前运行链路

React / Vinext 渲染工作台。Worker 请求由 `build/sites-worker.ts` 进入；`app/chatgpt-auth.ts` 读取托管平台提供的身份。API 通过 `lib/server.ts` 检查身份、空间成员与角色，再访问 D1 数据库或 R2 文件存储。

主要页面在 `app/workspace.tsx`；块渲染在 `app/block-editor.tsx`，目录、导入、导图、HTML 实验、图片编辑和使用引导各有组件。大工作台组件后续可按页面和业务进一步拆分，当前不为整理源码而改变已验证的数据流程。

## 业务入口

| 入口 | 数据流程 |
| --- | --- |
| `/api/workspace` | 空个人空间初始化、学科/页面、搜索、保存、评论、版本、AI、复习、成员、引导进度 |
| `/api/upload` | 验证角色和文件，保存资源与元数据 |
| `/api/import` | 验证相对路径、识别学科/类别、保留目录、转换正文、保存原件、处理重名 |
| `/api/assets/:id` | 验证所属空间权限后返回资源，不公开对象存储路径 |

所有知识内容来自数据库。客户端存储只保存设备上的主题、动效和目录展开等偏好；使用引导进度保存在用户记录中。

## 主要实体

身份与协作：`users`、`spaces`、`members`、`invitations`。

知识：`subjects`、`pages`、`blocks`、`tags`、`page_tags`、`links`、`images`。

讨论与版本：`comments`、`comment_likes`、`revisions`。

学习与 AI：`flashcards`、`reviews`、`progress`、`ai_providers`、`ai_models`、`ai_generations`。

正文由有序内容块构成，块内容使用 JSON。文件页面带 `file_type`、`source_path`、`source_asset`；文件夹作为可展开的目录页面。桌面索引模型另见桌面规划，不与上传页面混为一谈。

## 保存与生成

页面保存提交当前版本号；服务器进行冲突检查，写入新版本和内容块。旧版本恢复先成为草稿，用户保存才形成新版本。评论和复习独立于正文保存。

AI Key 用服务器 `APP_SECRET` 做 AES-GCM 加密；返回配置只含尾号。生成历史保存输入、输出和状态，结果先为草稿，采纳后才追加/替换笔记。知识卡片与思维导图生成需解析结构，不直接执行模型给出的代码。

## 权限与隔离

Owner / Admin 管理空间成员，Editor 编辑，Member 评论，Viewer 阅读与个人复习。站点访问范围与知识空间成员权限是两层独立配置。

服务器来自托管平台的身份头是认证边界，普通公网反向代理不能信任客户端自行提交的同名头。Web 自部署必须接入可信身份层；桌面版须替换为本地账户认证。

HTML 实验 iframe 不拥有主页面权限，网络访问受限制。Markdown / Mermaid 渲染进行清理。上传文件不会当作工作台主页面执行。

## 已验证范围

`tests/integration.mjs` 使用临时 Worker、D1、R2 验证空账号初始化、引导进度、数据持久化、冲突、搜索、标签、讨论、回滚、复习、角色和空间隔离、Key 加密、AI 草稿、导入、资源访问和 JSON 恢复。

`tests/knowledge-tools.mjs` 验证路径穿越拒绝、类别识别、Markdown 导出、导图布局与安全重挂。接口测试不等同于所有浏览器、移动设备或 Windows EXE 的视觉与运行验收。
