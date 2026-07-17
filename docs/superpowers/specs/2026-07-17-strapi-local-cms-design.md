# Strapi 本地 CMS 设计

## 目标

将光泰官网从已停止推进的 Storyblok 路线切换为自托管 Strapi CMS，使非技术编辑者可在本地后台维护页面、首页模块、导航、页脚、SEO 与媒体资源。Astro 保持为公开官网的静态渲染层，现有组件、动效、SEO、测试与 Nginx 生产容器继续复用。

本阶段先完成本地可运行、可编辑、可构建的 CMS 闭环；阿里云 ACR/ECS、HTTPS 预览域名、正式发布 Webhook 和媒体对象存储属于后续部署阶段，不是本地验证的前置条件。

## 已确认决策

- CMS：Strapi 5.50.2，自托管，不使用 Storyblok 或 Strapi Cloud。
- 数据库：PostgreSQL 16，通过 Docker Compose 在本地运行。
- 官网：Astro 7 静态构建；构建过程以只读 Strapi API Token 拉取已发布内容，浏览器不接触 CMS token。
- 编辑流：Strapi Draft & Publish；编辑者在 `http://localhost:1337/admin` 保存草稿、预览本地 Astro 站点、发布后触发静态重新构建。
- 内容策略：编辑者只能使用预设的 Strapi 组件和字段，不提供任意 HTML、自由 CSS 或任意布局拖拽。
- 迁移处理：当前 `codex/storyblok-aliyun-cms` 分支上的 Storyblok 代码和依赖在 Strapi 合同测试到位后，以独立、可回滚的提交删除；此前 Git 提交保留历史，不改写历史。

## 本地运行架构

```text
编辑者浏览器
      │
      ├── Strapi Admin :1337
      │         │
      │      PostgreSQL 16（仅 Docker 内部网络）
      │
      └── Astro Dev :4324
                │
                └── Strapi Content API（只读 API Token）

Astro build → dist/ → Nginx（后续生产仍沿用）
```

新增独立 `cms/` 应用目录和 `docker-compose.cms.yml`。Compose 仅公开 Strapi 的 1337 端口；PostgreSQL 不映射宿主机端口，数据卷与上传媒体卷均持久化。Strapi 使用 Node 24，数据库用户名、密码、JWT/应用密钥、API Token 只写入未跟踪的 `cms/.env`，模板只保留变量名。

## 内容模型

### Collection Type：Site Page

每条内页对应一个 `site-page`，以 `slug` 形成公开 URL。字段与现有 `SitePage` 合同一一对应：

- `slug`、`template`（overview/detail/brand）、`parentPath`、`title`、`english`、`category`、`visualFamily`
- `intro`、`positioning`、`capabilities`、`scenarios`、`delivery`
- `hero`、`images`、`ogImage` 媒体字段；每个媒体字段都必须有 alt 文本
- `seoTitle`、`seoDescription`
- `blocks` Dynamic Zone，用于页面模板以外的受控附加区块

`slug`、`parentPath` 与 `template` 在发布前由 Strapi lifecycle 校验：slug 唯一、父级存在、父级不形成循环。Astro 在构建时再次执行现有内容树校验，确保 CMS 数据不能绕过路由、面包屑或 SEO 合同。

### Single Types：Site Settings 与 Home Page

- `site-settings`：公司名称、联系方式、默认 SEO、主导航、页脚分组和公共 CTA。
- `home-page`：首页 SEO、Hero 配置及 `blocks` Dynamic Zone。

首页和页面 Dynamic Zone 只允许使用以下 Strapi 组件：

- `shared.hero`
- `shared.feature-list`
- `shared.card-grid`
- `shared.image-copy`
- `shared.partner-marquee`
- `shared.cta`

每个组件由一个 Astro 组件映射，未知组件会让构建失败并显示 Strapi UID；组件字段不允许包含富文本 HTML。必要的富文本仅使用 Strapi Rich Text 结构并由受控渲染器输出。

## 数据与媒体流

Astro 新增 Strapi repository，作为唯一 CMS 读取入口：

1. 使用服务端 `STRAPI_API_TOKEN` 请求 `/api/site-pages`、`/api/home-page` 和 `/api/site-settings`。
2. 通过 mapper 将 Strapi v5 的 `data`/`attributes` 结构转换为当前 `SitePage`、首页和站点配置类型。
3. 使用现有 Zod schema、内容树与图片 alt 合同验证转换结果；任何错误中止构建。
4. Astro 组件只接收转换后的类型，不直接访问 Strapi API。

本地媒体先使用 Strapi upload provider 的 Docker volume。Astro 使用 Strapi 返回的绝对媒体 URL，渲染带明确 `width`、`height`、`loading`、`decoding` 和非空 `alt` 的图片。未来接入阿里云 OSS 时只替换 Strapi upload provider，不改变 Astro 数据合同。

## 权限与安全

- Strapi Admin 只对已创建的编辑者开放；初始管理员在首次本地启动时创建。
- 公开角色默认不开放内容 API；Astro 使用只读、最小权限的 API Token。
- Admin 密钥、数据库口令、API Token 与上传文件不得进入 Git、Astro 浏览器 bundle、Nginx 生产镜像或构建日志。
- 本地 Strapi 默认只绑定 `127.0.0.1:1337`；后续公网部署才经由 HTTPS、WAF 和访问控制开放。
- Strapi API 失败、非 2xx 响应、分页异常、未知组件、缺 alt、重复 slug、断开 parentPath 均必须使构建失败，不输出部分失真的站点。

## 迁移与替换步骤

1. 先写 Strapi mapper、Content API client 和 Docker 合同的失败测试。
2. 新建 `cms/` Strapi 应用、PostgreSQL Compose、环境模板与健康检查。
3. 定义 content types、components、权限与生命周期校验；本地创建管理员和只读 API Token。
4. 从现有 29 个 JSON、`src/data/home.ts`、导航和页脚生成 Strapi 可导入 seed 数据；导入后运行一致性检查。
5. 将 Astro 路由、首页和外壳改为仅通过 Strapi repository 读取已发布内容；继续保留现有 HTML/Playwright 回归测试。
6. 确认本地 Strapi 编辑 → 发布 → Astro 重建闭环稳定后，删除 Storyblok SDK、mapper、测试、环境字段与旧计划，并更新文档。

## 测试策略

- 单元：Strapi response mapper、分页、鉴权头、URL/父级/SEO/alt 校验、未知 Dynamic Zone 组件拒绝。
- 集成：Compose 健康检查、PostgreSQL 持久化、Strapi Content API 已发布与草稿状态、种子导入后 29 个页面一致性。
- 构建：Astro 静态构建读取本地 Strapi，生成现有首页与全部路由；token 不出现于 `dist/`。
- 浏览器：现有菜单、动效、响应式、SEO、表单和图片完整性测试继续运行；新增一条编辑发布后的页面内容更新回归。
- 回滚：本地数据库卷快照和 Strapi Draft & Publish 历史恢复；Git 保留迁移前 JSON，直到两次本地演练通过并获得用户确认后才另行删除。

## 验收标准

1. 使用 `docker compose -f docker-compose.cms.yml up -d` 可在本机启动 PostgreSQL 和 Strapi，健康检查成功，数据库不暴露宿主机端口。
2. 编辑者可在 Strapi Admin 创建草稿、编辑受控区块、填写图片 alt 和 SEO，并发布内容。
3. 现有 29 个页面、首页、导航、页脚和 SEO 从 Strapi 已发布内容生成；路由、H1、metadata、面包屑与关键链接不回归。
4. 缺失 token、CMS API 错误、无 alt、未知 block、重复 slug 或无效 parentPath 都会在本地构建中明确失败。
5. `npm run verify`、Strapi/Compose 合同测试和本地编辑发布演练全部通过。
6. Storyblok 依赖和运行代码已从最终架构移除，且移除过程通过独立 Git 提交保留可回滚历史。

## 本期不包含

- 阿里云 ECS/ACR 自动部署、域名、TLS、WAF、Webhook、对象存储和正式预览环境。
- 联系表单后端、CRM、用户登录、多语言和任意页面布局拖拽。
- 未经用户确认地删除既有 JSON 迁移基准或重写 Git 历史。
