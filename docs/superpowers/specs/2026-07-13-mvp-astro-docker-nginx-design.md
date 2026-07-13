# 光泰官网 MVP 迁移与 Docker + Nginx 部署设计

## 目标

以产品经理提供的 `网站/` MVP 为视觉、内容和信息架构基准，在现有 Astro 项目中落地天津光泰科技集团官网，并使用多阶段 Docker 镜像和非 root Nginx 提供生产静态站点。

最终交付包含首页、29 个内页、品牌 404、响应式导航、内容 Schema、SEO、自动化验证、容器健康检查和可回滚镜像。当前 MVP 目录在迁移验收前保持只读，不删除、不格式化、不提交其构建产物。

## 已确认的技术决策

- 正式前端：Astro 7、TypeScript、Tailwind CSS 和 Astro Content Collections。
- MVP 用途：保留视觉、文案、路由、交互意图和已确认资产，不沿用 Next.js、React、Vinext、Wrangler、D1、R2 或 ChatGPT Auth 运行时。
- 渲染模式：全部公开页面在构建期静态生成，不启用 Astro SSR Adapter。
- 生产运行：多阶段 Docker 构建，非 root Nginx 只读取并服务 `dist/`。
- TLS、WAF 和公网 CDN：由容器外部的负载均衡或 CDN 负责。
- 正式域名：通过 Docker build argument `SITE_URL` 在构建期写入 canonical、Sitemap 和 Open Graph URL；生产构建缺少该值时必须失败。

## MVP 盘点结论

MVP 包含首页和 29 个内页，集中内容模型位于 `网站/app/content/pages.ts`，页面分为 overview、detail 和 brand 三类。项目包含 72 个视觉资产，约 74MB；源码实际引用 44 个，约 36MB。

MVP 当前使用 Next.js 16、React 19、Vinext、Vite 和 Cloudflare Worker。首页因为 Canvas 和滚动动画被整体声明为客户端组件，现有构建客户端 JavaScript 约 324KB 未压缩。D1、R2、ChatGPT Auth 和 Worker 运行能力没有进入官网业务流程。

复制进来的 MVP 缺少 `.openai/hosting.json`、`build/sites-vite-plugin` 和 README 所述测试源码，因此不作为可复现的生产代码基线。

## 总体架构

```text
MVP 路由、文案、视觉和资产
              |
              v
Astro Content Collections + 页面组件
              |
              v
Astro 静态构建（30 个 URL）
              |
              v
Docker builder 生成 dist/
              |
              v
非 root Nginx :8080
              |
              v
负载均衡 / CDN / HTTPS / WAF
```

运行容器不包含 Node、npm、源代码、MVP、Git 历史或构建密钥。

## 内容与路由设计

新增 `pages` 内容集合，每个内页一个内容文件。Schema 包含：

- slug、template、parent、title、english、category
- visualFamily、hero、heroPosition、heroFit
- description、intro、positioning
- capabilities、scenarios、delivery、related images
- draft、SEO 标题、SEO 描述和 Open Graph 图片

`src/pages/[...slug].astro` 使用 `getStaticPaths()` 生成 29 个内页。首页继续使用 `src/pages/index.astro`，404 使用 `src/pages/404.astro`。导航、面包屑、子页面、兄弟页面和相关页面全部从同一内容树派生。

内容工具必须检测重复路径、孤立父级、循环父级、无效模板、缺失图片和断开的内部链接。

## 页面与组件边界

公共组件：

- `SiteHeader`：桌面 Mega Menu、移动菜单和当前栏目状态
- `SiteFooter`：平台、解决方案、行业和品牌入口
- `Breadcrumbs`：由内容树自动生成
- `ChapterNav`：内容页锚点导航
- `ContactCta`：统一跳转 `/contact`
- `SeoHead`：metadata、canonical、Open Graph 和 JSON-LD

首页组件：

- Hero、DataNetwork、SolutionSplit、FactorySection
- EmbodiedSection、EducationSection、TechnologySection
- CaseSection、ProjectCta

内页模板：

- `OverviewPage`：父级概览和子页面矩阵
- `DetailPage`：能力、场景与交付详情
- `BrandPage`：案例、关于和联系页面

业务文案不写入展示组件；组件只接收类型化属性。

## 客户端 JavaScript

普通页面和内页模板不 hydration。仅保留以下浏览器代码：

- 移动菜单和 Mega Menu 的键盘、焦点与开关状态
- 首页 Canvas 数据网络
- IntersectionObserver 滚动揭示

这些行为使用独立原生 TypeScript 模块，不加载 React。关闭 JavaScript 时，导航链接、页面内容和咨询路径仍可使用。`prefers-reduced-motion` 下 Canvas 停止动画，滚动揭示直接显示最终状态。

## 视觉资产策略

- 只迁移源码实际引用且通过视觉审核的资产。
- 原始图片进入 `src/assets/`，通过 Astro Image 生成响应式尺寸和 WebP/AVIF。
- 场景照片使用明确焦点；架构图和机器人主体不得被裁切。
- 修复 `home-common-engineering.png` 等存在透明黑块或异常合成的资产后再使用。
- 维护资产来源、授权、原始尺寸、页面用途和替代文本清单。
- 未使用资产不进入生产镜像，但在 MVP 只读目录中保留到最终验收。
- 字体自托管，不在构建期或运行时依赖 Google Fonts。

## Docker 镜像设计

### Builder 阶段

- 使用固定 Node 24 Alpine 基础镜像。
- 只复制 `package.json` 和 lockfile 后执行 `npm ci`，复用依赖缓存层。
- 再复制 Astro 配置、`src/` 和 `public/`。
- 接收并校验 `SITE_URL`。
- 运行 `npm run build` 生成 `dist/`。

测试、格式检查和 Astro Check 在 CI 的镜像构建之前执行，避免测试工具进入运行镜像。

### Runtime 阶段

- 使用固定的 `nginx-unprivileged` Alpine 稳定镜像。
- 监听 8080，进程以非 root 用户运行。
- 只复制 builder 的 `dist/` 和受版本控制的 Nginx 配置。
- 容器文件系统只读，仅 `/tmp` 使用 tmpfs。
- 删除所有 Linux capabilities，并启用 `no-new-privileges`。
- 提供 `/healthz`，Docker HEALTHCHECK 必须验证该端点。

## Nginx 行为

- `/assets/` 和 Astro 哈希资源：`Cache-Control: public, max-age=31536000, immutable`。
- HTML、Sitemap 和 robots：可重新验证，不设置长期 immutable。
- 使用 `try_files $uri $uri/ =404` 支持 Astro 目录式路由。
- `error_page 404 /404.html` 返回品牌 404，同时保持 HTTP 404 状态。
- 开启 gzip，覆盖 HTML、CSS、JavaScript、JSON、XML 和 SVG。
- 访问日志写 stdout，错误日志写 stderr。
- 添加 HSTS 以外的安全响应头；HSTS 只在外层 HTTPS 已稳定后启用。
- CSP 在迁移完成后根据实际内联样式和脚本生成，不能先使用会破坏页面的宽泛模板。

## 本地与生产运行

本地开发仍使用 `npm run dev`，不要求开发者每次修改都重建容器。

容器验收使用 `docker compose up --build`，映射 `8080:8080`。生产镜像以 Git commit SHA 标记；发布系统保留上一稳定 SHA，回滚通过切换镜像标签完成，不在运行容器内修改文件。

生产配置不通过运行时环境变量修改静态页面内容。域名、分析标识和公开配置需要在构建阶段固定并重新生成镜像。

## CI/CD 质量门

提交和 Pull Request：

1. Prettier、Astro Check 和 Vitest。
2. 生成全部 30 个 URL。
3. 检查重复路由、父子关系、图片存在、内部链接和 metadata。
4. 生产输出不得包含不必要的 React/Next/Vinext 客户端包。
5. 构建 Docker 镜像并启动容器。
6. 检查 `/healthz`、首页、代表性内页、404 状态和缓存响应头。
7. 使用容器漏洞扫描器阻止高危、可修复漏洞。

发布前浏览器验收覆盖 1440、1280、768 和 390 像素视口，检查横向溢出、菜单键盘操作、图片裁切、控制台错误和减少动画模式。

## 验收标准

1. 首页和 29 个内页全部静态生成并返回正确 metadata。
2. 所有站内链接、导航、面包屑和相关页面无断链。
3. 无缺失图片，生产只包含已使用和已授权资产。
4. 生产首页不加载 React、Next.js 或 Vinext 运行时。
5. Astro Check 为 0 errors、0 warnings、0 hints；所有测试通过。
6. Docker 镜像以非 root 用户运行，健康检查通过，根文件系统可设为只读。
7. Nginx 正确返回品牌 404、缓存头、安全头和压缩内容。
8. 容器在收到停止信号后优雅退出，可通过上一镜像 SHA 回滚。
9. 桌面与移动端无横向溢出、内容遮挡或不可操作导航。

## 本阶段不包含

- CMS 后台、数据库、登录和会员系统
- 在线表单提交后端、邮件或 CRM 集成
- Kubernetes Helm Chart
- 自动申请 TLS 证书
- 未经确认的电话、邮箱、地址、客户、资质和案例数据

联系表单后端和 CMS 若后续需要，应作为独立服务设计，不改变静态官网容器的最小运行边界。
