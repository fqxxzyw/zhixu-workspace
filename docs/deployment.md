# 开发与部署

## 当前可用的部署

目前经过部署验证的是 Sites 上的 Web 版本：Vinext / React + Cloudflare Worker + D1 + R2 + 托管身份。Windows EXE 尚未实现。

`.openai/hosting.json` 只声明 `DB` 和 `BUCKET` 两个逻辑绑定，没有复制原站点的项目 ID。新站点须注册自己的项目，再按平台流程配置身份、资源、服务器密钥和发布版本，不能将仓库直接当成纯静态站点部署。

## 安装与检查

使用 Node.js ≥ 22.13.0、pnpm 11.25.0，保留 `pnpm-lock.yaml`：

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:tools
pnpm build
pnpm test:integration
```

集成检查创建临时模拟数据库和文件桶，应用全部迁移；使用模拟身份与 AI 响应，不读取实际学习数据或调用付费模型。`test:integration` 依赖前一步已生成的 `dist/server` 和 `dist/client`。

`install:ci` 和部分 Sites 管理脚本是 Linux 环境工具。Windows 日常开发使用普通 `pnpm install`，不要将依赖 GNU timeout / flock 的脚本当作桌面安装器。

## 本地 Web 开发

1. 安装依赖。
2. 在根目录创建被 Git 忽略的 `.dev.vars`，设置随机的 `APP_SECRET`，用于本地 AI Key 加密。
3. 使用本地 Wrangler 配置声明 Worker 入口、`DB`、`BUCKET`、兼容日期和 `drizzle` 迁移目录。按迁移顺序初始化本地 D1；配置应与 Vite 中的数据库名称 `site-creator-d1` 及桶名称 `site-creator-r2` 一致。
4. 启动 `pnpm dev`，开发端口为 5173。本地 mock 登录适配仅允许 localhost / 回环访问，是开发工具，不是本地账户密码系统。

本地配置示例（保存为 `wrangler.local.jsonc`；用于本地模拟，不包含真实资源 ID）：

```json
{
  "name": "zhixu-local",
  "main": "build/sites-worker.ts",
  "compatibility_date": "2026-05-15",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [{
    "binding": "DB",
    "database_name": "site-creator-d1",
    "database_id": "00000000-0000-4000-8000-000000000000",
    "migrations_dir": "drizzle"
  }],
  "r2_buckets": [{"binding": "BUCKET", "bucket_name": "site-creator-r2"}]
}
```

```sh
pnpm exec wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
pnpm dev
```

这套本地浏览器流程并未作为 Windows 桌面环境做完整安装验收；遇到模拟资源不一致时检查实际 Wrangler 持久化目录和 Vite 配置。最明确、可重复的业务检查仍是仓库中的临时资源集成测试。

## 托管发布

在 Sites 中创建独立站点后，以该站点对应的项目 ID 配置发布；逻辑绑定由平台映射到真实资源，`APP_SECRET` 通过服务器环境配置保存。按平台流程构建、打包、保存与部署相同源码版本。数据库迁移只追加，不修改已经应用的旧迁移。

迁移 `0002` 增加使用引导进度，并把当时已有用户标为已完成，避免强制旧用户进入新手引导。新账户默认处于第一个引导步骤。

若改用其他服务自部署，需要适配可信认证入口和 Worker/D1/R2 绑定。未经替换的身份头读取不能独立承担公网认证；当前仓库不是普通 Node.js 后端或离线应用。

## 配置与备份

- 真实 API Key、`APP_SECRET`、`.dev.vars`、数据库、上传资料、`node_modules` 和构建输出不应提交到仓库。
- 保持已有 `APP_SECRET` 稳定，更换密钥前设计密钥轮换与旧 Key 迁移。
- D1 与 R2 都需要备份；Markdown / JSON 导出是笔记级导出，不是整个服务的备份工具。
- 站点对外访问范围和空间成员权限分别管理，公开网站并不自动公开个人笔记。
