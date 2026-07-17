# Storyblok 内容后台与阿里云发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Astro 官网升级为 Storyblok 区块式 Headless CMS，使非技术人员能够编辑、预览、审批并发布内容，同时保留现有静态官网的视觉、性能、SEO 与 Docker/Nginx 生产交付方式。

**Architecture:** 生产站继续在构建期从 Storyblok Delivery API 读取已发布内容，生成静态 `dist/` 并由非 root Nginx 服务。阿里云 ECS 另外运行受访问控制的 Astro Node 预览容器，读取草稿内容并接入 Storyblok Visual Editor；Storyblok 发布事件触发 GitHub Actions 校验、构建镜像、推送阿里云 ACR，并以新 SHA 更新 ECS 生产容器。

**Tech Stack:** Astro 7、TypeScript 6、`@storyblok/astro` 10.2.0、`@astrojs/node`、Storyblok SaaS、Vitest、Playwright、GitHub Actions、阿里云 ACR、阿里云 ECS、Docker Compose、nginx-unprivileged。

---

## 已确认边界

- CMS 为 Storyblok SaaS。编辑者只能使用开发预设的区块与字段，不能写入任意 HTML 或修改 CSS。
- 生产始终只使用 `published` 内容和静态 Nginx 容器；草稿令牌绝不进入生产构建、生产容器或浏览器。
- `preview` 子域名运行独立 Astro Node 容器，使用 `draft` 内容、Storyblok Bridge、`Cache-Control: private, no-store` 和 `X-Robots-Tag: noindex, nofollow`。
- 发布流程为 Storyblok → GitHub Actions → ACR → ECS；通过健康检查失败即保持或恢复上一镜像 SHA，不使用 `latest`。
- 本期迁移首页、29 个内页、导航、页脚、SEO 与允许的内容区块；不包含 CRM、表单后端、多语言或自由页面搭建。

## 管理员前置条件

1. 创建 Storyblok Space，并分别生成 Published Delivery Token、Draft Delivery Token、Management Token 和 Webhook Secret。
2. 创建阿里云 ACR 私有仓库；GitHub Actions 只取得该仓库的 push 权限。
3. 准备已安装 Docker Compose v2 的 ECS，并配置正式域名与 `preview` 子域名的 HTTPS、WAF/访问控制。
4. 创建 ECS 部署专用 SSH 账户与密钥；禁止复用 root 或个人密钥。
5. 配置 Storyblok 发布 Webhook 调用 GitHub Actions 的 `repository_dispatch`；Webhook 仅传递签名与 Story 标识，不传递任何 token。

## File Map

- Create: `src/lib/storyblok/types.ts` — CMS 原始 blok、故事与全局配置类型。
- Create: `src/lib/storyblok/client.ts` — 仅服务端使用的 Delivery API 与分页读取。
- Create: `src/lib/storyblok/mapper.ts` — CMS 内容到现有 `SitePage` 合同的纯函数。
- Create: `src/lib/storyblok/content.ts` — published/draft 内容仓库。
- Create: `src/lib/storyblok/image.ts` — Storyblok 图片 URL、尺寸与 alt 处理。
- Create: `src/components/storyblok/StoryblokPage.astro` 和 `src/components/storyblok/blocks/*.astro` — 受控 blok 渲染器。
- Create: `scripts/storyblok/export-current-content.ts`、`scripts/storyblok/verify-space.ts` — 迁移和空间校验。
- Create: `docker/Dockerfile.preview`、`docker-compose.preview.yml` — 仅草稿预览使用的 Node 容器。
- Create: `.github/workflows/storyblok-publish.yml`、`scripts/deploy/ecs-release.sh` — 发布、ACR 与 ECS 回滚。
- Create: `docs/cms/storyblok-content-model.md`、`docs/cms/storyblok-editor-guide.md`、`docs/deployment/aliyun-storyblok.md`。
- Modify: `package.json`、`package-lock.json`、`astro.config.mjs`、`.env.example`。
- Modify: `src/pages/index.astro`、`src/pages/[...slug].astro`、`src/layouts/BaseLayout.astro`、`src/components/site/SiteHeader.astro`、`src/components/site/SiteFooter.astro`、`src/lib/images.ts`。
- Modify: `Dockerfile`、`docker-compose.yml`、`docker/nginx.conf`、`.github/workflows/ci.yml`、`README.md`、`说明文档.md`。
- Create tests: `tests/storyblok-mapper.test.ts`、`tests/storyblok-client.test.ts`、`tests/storyblok-preview.test.ts`、`tests/storyblok-webhook.test.ts`。
- Modify tests: `tests/content-collection.test.ts`、`tests/assets.test.ts`、`tests/rendered-site.test.ts`、`tests/docker-contract.test.ts`、`tests/browser/site-smoke.spec.ts`。

## Task 1: 固化 CMS 数据合同

**Files:**

- Create: `src/lib/storyblok/types.ts`
- Create: `src/lib/storyblok/mapper.ts`
- Create: `tests/storyblok-mapper.test.ts`
- Modify: `src/lib/page-schema.ts`
- Modify: `.env.example`

- [x] **Step 1: 写失败的 mapper 合同测试。**

```ts
expect(
  mapStoryPage({
    full_slug: 'pages/solutions/smart-campus',
    content: {
      component: 'site_page',
      template: 'detail',
      title: '智慧园区',
      english: 'SMART CAMPUS',
      category: '解决方案',
      visual_family: 'common',
      intro: '连接真实空间与数字服务。',
      positioning: '统一管理园区系统与智能设备。',
      hero: {
        filename: 'https://a.storyblok.com/f/1/hero.jpg',
        alt: '园区夜景',
      },
      images: [
        { filename: 'https://a.storyblok.com/f/1/a.jpg', alt: '控制中心' },
        { filename: 'https://a.storyblok.com/f/1/b.jpg', alt: '服务终端' },
      ],
      capabilities: ['统一接入'],
      scenarios: ['园区管理'],
      delivery: ['实施交付'],
      seo_title: '智慧园区｜光泰',
      seo_description: '连接真实空间与数字服务。',
      og_image: {
        filename: 'https://a.storyblok.com/f/1/og.jpg',
        alt: '园区夜景',
      },
    },
  }),
).toMatchObject({
  path: '/solutions/smart-campus',
  template: 'detail',
  title: '智慧园区',
});
```

- [x] **Step 2: 运行测试确认失败。**

Run: `npm test -- tests/storyblok-mapper.test.ts`

Expected: FAIL，因为 mapper 不存在。

- [x] **Step 3: 定义受限的页面内容类型和纯 mapper。**

```ts
export type CmsAsset = { filename: string; alt: string };

export type CmsPageContent = {
  component: 'site_page';
  template: 'overview' | 'detail' | 'brand';
  title: string;
  english: string;
  category: string;
  visual_family: 'platform' | 'common' | 'higher' | 'k12' | 'brand';
  parent_path?: string;
  intro: string;
  positioning: string;
  hero: CmsAsset;
  images: [CmsAsset, CmsAsset];
  capabilities: string[];
  scenarios: string[];
  delivery: string[];
  seo_title: string;
  seo_description: string;
  og_image: CmsAsset;
};

export function mapStoryPage(story: {
  full_slug: string;
  content: CmsPageContent;
}) {
  const c = story.content;
  return {
    id: story.full_slug,
    path: '/' + story.full_slug.replace(/^pages\//, '').replace(/\/$/, ''),
    template: c.template,
    title: c.title,
    english: c.english,
    category: c.category,
    visualFamily: c.visual_family,
    parentPath: c.parent_path,
    intro: c.intro,
    positioning: c.positioning,
    hero: c.hero.filename,
    images: [c.images[0].filename, c.images[1].filename],
    capabilities: c.capabilities,
    scenarios: c.scenarios,
    delivery: c.delivery,
    draft: false,
    seoTitle: c.seo_title,
    seoDescription: c.seo_description,
    ogImage: c.og_image.filename,
  };
}
```

- [x] **Step 4: 使用现有 `pageSchema` 解析 mapper 结果，拒绝空路径、空 alt、无 SEO 和无图片内容。**

```ts
export function mapAndValidateStoryPage(story: StoryPage): SitePage {
  return pageSchema.parse(mapStoryPage(story));
}
```

- [x] **Step 5: 增加环境变量样例。**

```dotenv
SITE_URL=https://www.example.com
STORYBLOK_PUBLISHED_TOKEN=
STORYBLOK_DRAFT_TOKEN=
STORYBLOK_SPACE_ID=
STORYBLOK_WEBHOOK_SECRET=
ASTRO_DEPLOY_TARGET=production
```

Management Token 只允许在本地迁移工具或受限 GitHub Actions Secret 中使用，不能写进样例、生产镜像或 ECS 运行环境。

- [x] **Step 6: 验证并提交。**

Run: `npm test -- tests/storyblok-mapper.test.ts && npm run check`

Expected: PASS。

```bash
git add src/lib/storyblok src/lib/page-schema.ts .env.example tests/storyblok-mapper.test.ts
git commit -m "feat(cms): define Storyblok page contract"
```

## Task 2: 接入构建期 Storyblok 内容仓库

**Files:**

- Create: `src/lib/storyblok/client.ts`
- Create: `src/lib/storyblok/content.ts`
- Create: `tests/storyblok-client.test.ts`
- Modify: `package.json`、`package-lock.json`、`astro.config.mjs`

- [ ] **Step 1: 写失败测试，要求生产查询携带 `version: published`，预览查询携带 `version: draft`，分页合并后获得 29 个故事。**

```ts
expect(await listStories(fakeClient, 'published')).toHaveLength(29);
expect(fakeClient.get).toHaveBeenCalledWith(
  'cdn/stories',
  expect.objectContaining({ version: 'published', per_page: 100 }),
);
```

- [ ] **Step 2: 安装与 Astro 7 兼容的依赖。**

Run: `npm install @storyblok/astro@10.2.0 @astrojs/node`

Expected: 仅更新 package 清单和 lockfile；不修改运行时页面。

- [ ] **Step 3: 注册 Storyblok SDK，并按目标选择静态或 Node 输出。**

```ts
const target = process.env.ASTRO_DEPLOY_TARGET ?? 'production';

export default defineConfig({
  output: target === 'preview' ? 'server' : 'static',
  adapter: target === 'preview' ? node({ mode: 'standalone' }) : undefined,
  integrations: [
    sitemap(),
    storyblok({
      accessToken:
        target === 'preview'
          ? process.env.STORYBLOK_DRAFT_TOKEN!
          : process.env.STORYBLOK_PUBLISHED_TOKEN!,
      bridge: target === 'preview',
    }),
  ],
});
```

- [ ] **Step 4: 实现唯一内容读取入口，禁止组件直接调用 CMS。**

```ts
export type ContentVersion = 'draft' | 'published';

export async function getSitePages(
  version: ContentVersion,
): Promise<SitePage[]> {
  const stories = await listStories(useStoryblokApi(), version, {
    starts_with: 'pages/',
  });
  return stories.map(mapAndValidateStoryPage);
}

export async function getSitePage(path: string, version: ContentVersion) {
  return (await getSitePages(version)).find((page) => page.path === path);
}
```

- [ ] **Step 5: 为缺失 token 提供不泄密的错误。**

```ts
if (!process.env.STORYBLOK_PUBLISHED_TOKEN) {
  throw new Error(
    'STORYBLOK_PUBLISHED_TOKEN is required for a production build',
  );
}
```

- [ ] **Step 6: 验证并提交。**

Run: `npm test -- tests/storyblok-client.test.ts && npm run check`

Expected: PASS；日志不出现 token 值。

```bash
git add package.json package-lock.json astro.config.mjs src/lib/storyblok tests/storyblok-client.test.ts
git commit -m "feat(cms): load Storyblok content"
```

## Task 3: 建立 Space 模型并迁移现有内容

**Files:**

- Create: `scripts/storyblok/export-current-content.ts`
- Create: `scripts/storyblok/verify-space.ts`
- Create: `docs/cms/storyblok-content-model.md`
- Modify: `tests/storyblok-mapper.test.ts`

- [ ] **Step 1: 在 Storyblok Space 创建固定组件。**

| 组件              | 必填字段                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site_page`       | template、title、english、category、visual_family、parent_path、intro、positioning、hero、images、capabilities、scenarios、delivery、seo_title、seo_description、og_image、body |
| `site_config`     | company_name、phone、email、address、primary_navigation、footer_groups、default_seo_title、default_seo_description                                                              |
| `hero`            | eyebrow、title、summary、image、image_alt、cta_label、cta_link、variant                                                                                                         |
| `feature_list`    | heading、items、variant                                                                                                                                                         |
| `card_grid`       | heading、cards、columns、variant                                                                                                                                                |
| `image_copy`      | heading、copy、image、image_alt、image_position                                                                                                                                 |
| `partner_marquee` | heading、partners                                                                                                                                                               |
| `cta`             | heading、copy、label、link、variant                                                                                                                                             |

`template` 和 `visual_family` 必须使用 Task 1 的枚举；所有图片字段必须要求 alt。

- [ ] **Step 2: 编写确定性导出脚本，输出可导入的 29 页内容包。**

```ts
const output = {
  stories: pages.map((page) => ({
    name: page.title,
    slug: page.path.split('/').at(-1),
    full_slug: 'pages' + page.path,
    content: toStoryblokPage(page),
    is_folder: false,
  })),
};
await writeFile(
  resolve('tmp/storyblok-current-content.json'),
  JSON.stringify(output, null, 2) + '\n',
);
```

- [ ] **Step 3: 导出、导入并验证。**

Run: `npx tsx scripts/storyblok/export-current-content.ts && npx tsx scripts/storyblok/verify-space.ts`

Expected: Space 内有 29 个已发布 `pages/**` 故事和一个 `site-config`；所有父级路径、SEO、图片 URL、alt 与首页区块有效。

- [ ] **Step 4: 写入编辑模型文档。**

文档必须禁止删除在线 slug；改 slug 时必须同步设置 301；每张图片必须填写描述性 alt；发布前必须在 preview 检查桌面和移动端。

- [ ] **Step 5: 提交迁移工具。**

```bash
git add scripts/storyblok docs/cms tests/storyblok-mapper.test.ts
git commit -m "feat(cms): add content migration tools"
```

## Task 4: 从 CMS 渲染页面、首页和全局外壳

**Files:**

- Create: `src/components/storyblok/StoryblokPage.astro`
- Create: `src/components/storyblok/blocks/{Hero,FeatureList,CardGrid,ImageCopy,PartnerMarquee,Cta}.astro`
- Modify: `src/pages/index.astro`、`src/pages/[...slug].astro`
- Modify: `src/layouts/BaseLayout.astro`、`src/components/site/SiteHeader.astro`、`src/components/site/SiteFooter.astro`
- Modify: `src/lib/images.ts`
- Modify: `tests/rendered-site.test.ts`、`tests/browser/site-smoke.spec.ts`

- [ ] **Step 1: 写失败的静态输出测试，锁定 H1、SEO、面包屑、29 条 URL 和首页业务顺序。**

```ts
expect(html).toContain('<h1>智慧园区</h1>');
expect(html).toContain('<title>智慧园区｜光泰</title>');
expect(html).toContain('"@type":"BreadcrumbList"');
expect(cmsPages).toHaveLength(29);
```

- [ ] **Step 2: 在生产静态构建中用 published 内容生成所有路径；在预览中按 URL 读取 draft 内容。**

```ts
const version = import.meta.env.SSR ? 'draft' : 'published';
const path = ('/' + (Astro.params.slug ?? '')).replace(/\/$/, '') || '/';
const page = await getSitePage(path, version);

if (!page) return Astro.redirect('/404', 302);
```

生产模式的 `getStaticPaths()` 必须从 `getSitePages('published')` 返回所有路由；预览模式响应不得缓存超过 60 秒。

- [ ] **Step 3: 建立唯一 blok 渲染入口，预览才添加可视化编辑标记。**

```astro
---
import { storyblokEditable } from '@storyblok/astro';
const { blok, preview = false } = Astro.props;
---

<section
  {...preview ? storyblokEditable(blok) : {}}
  data-block={blok.component}
>
  <slot />
</section>
```

未知 blok 在 preview 显示组件名和诊断信息，在生产构建抛出 `Unsupported Storyblok component` 错误。

- [ ] **Step 4: 逐个包装现有首页组件，保留现有 CSS、Spline、DataNetwork、GSAP 与 ClientRouter 生命周期。**

允许的 blok 只有 `hero`、`feature_list`、`card_grid`、`image_copy`、`partner_marquee`、`cta`。每个 blok 只消费其定义 fields，不能接受 HTML 字符串。

- [ ] **Step 5: 让 Layout 从唯一 `site-config` 故事读取导航、页脚、联系方式与默认 SEO。**

```astro
<BaseLayout
  siteConfig={await getSiteConfig(version)}
  title={page.seoTitle}
  description={page.seoDescription}
>
  <Template
    page={page}
    ancestors={ancestors}
    children={children}
    related={related}
  />
</BaseLayout>
```

- [ ] **Step 6: 兼容 CMS 远程图片和现有本地资产。**

```ts
export function isStoryblokImage(source: string): boolean {
  return source.startsWith('https://a.storyblok.com/');
}
```

远程图片使用带 width、height、loading、decoding 和非空 alt 的原生 `img`；本地 `/assets/` 继续使用 Astro `Image`。

- [ ] **Step 7: 验证并提交。**

Run: `npm run verify`

Expected: 首页、29 内页、面包屑、菜单、动效、四视口检查全部通过；输出和浏览器网络请求不包含任何 token。

```bash
git add src/components/storyblok src/pages src/layouts src/components/site src/lib/images.ts tests
git commit -m "feat(cms): render site from Storyblok"
```

## Task 5: 部署受保护的草稿预览

**Files:**

- Create: `docker/Dockerfile.preview`
- Create: `docker-compose.preview.yml`
- Create: `tests/storyblok-preview.test.ts`
- Modify: `docker/nginx.conf`、`tests/docker-contract.test.ts`

- [ ] **Step 1: 写失败测试，确保 preview 使用 Node、需要 draft token、生产 Compose 不含 draft token，且响应不可缓存。**

```ts
expect(previewDockerfile).toContain('CMD ["node", "./dist/server/entry.mjs"]');
expect(previewCompose).toContain('STORYBLOK_DRAFT_TOKEN');
expect(productionCompose).not.toContain('STORYBLOK_DRAFT_TOKEN');
expect(previewHeaders['cache-control']).toContain('no-store');
```

- [ ] **Step 2: 创建 Node standalone 预览镜像。**

```dockerfile
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
EXPOSE 4321
USER node
CMD ["node", "./dist/server/entry.mjs"]
```

构建阶段必须以 `ASTRO_DEPLOY_TARGET=preview` 构建；运行时只接收 `SITE_URL`、`STORYBLOK_DRAFT_TOKEN` 和 preview 安全配置。

- [ ] **Step 3: 创建 ECS 预览 Compose。**

```yaml
services:
  cms-preview:
    image: ${PREVIEW_IMAGE}
    environment:
      SITE_URL: ${PREVIEW_SITE_URL}
      STORYBLOK_DRAFT_TOKEN: ${STORYBLOK_DRAFT_TOKEN}
      ASTRO_DEPLOY_TARGET: preview
    read_only: true
    tmpfs: [/tmp:rw, noexec, nosuid, size=64m]
    cap_drop: [ALL]
    security_opt: [no-new-privileges:true]
    restart: unless-stopped
```

- [ ] **Step 4: 配置 preview 域名。**

阿里云 WAF/ALB 或上游 Nginx 必须只允许授权编辑者访问，强制 HTTPS，并加 `X-Robots-Tag: noindex, nofollow`。生产 CSP 仍不加载 Storyblok Bridge；preview CSP 仅额外允许 `app.storyblok.com` 与 `a.storyblok.com`。

- [ ] **Step 5: 设置 Storyblok Visual Editor URL 并验收。**

把 Storyblok 的预览 URL 设置为管理员前置条件中已配置 HTTPS 的 preview 子域名，并附加故事的 `full_slug` 路径。编辑草稿必须能选择 blok、修改字段并看到更新，且地址始终是 preview 域名。

- [ ] **Step 6: 验证并提交。**

Run: `npm test -- tests/storyblok-preview.test.ts tests/docker-contract.test.ts`

Expected: preview 镜像可构建；生产镜像无 Node、无 draft token；preview 响应带 no-store 和 noindex。

```bash
git add docker/Dockerfile.preview docker-compose.preview.yml docker/nginx.conf tests
git commit -m "feat(cms): add protected draft preview"
```

## Task 6: 打通 Storyblok 发布、ACR 和 ECS 回滚

**Files:**

- Create: `.github/workflows/storyblok-publish.yml`
- Create: `scripts/deploy/ecs-release.sh`
- Create: `docs/deployment/aliyun-storyblok.md`
- Modify: `Dockerfile`、`docker-compose.yml`、`.github/workflows/ci.yml`
- Create: `tests/storyblok-webhook.test.ts`

- [ ] **Step 1: 写失败测试，要求发布流程先验证、使用 ACR SHA 标签、健康检查失败可回滚。**

```ts
expect(workflow).toContain('npm run verify');
expect(workflow).toContain('registry.cn-');
expect(workflow).toContain('docker compose pull');
expect(workflow).toContain('/healthz');
expect(workflow).not.toContain(':latest');
```

- [ ] **Step 2: 创建 Storyblok 发布工作流。**

```yaml
on:
  repository_dispatch:
    types: [storyblok-published]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npm run verify
```

后续步骤必须登录 ACR、构建并推送 commit SHA 标签、SSH 到 ECS 执行受限更新、轮询 `/healthz`，失败即切回记录的上一 SHA。

- [ ] **Step 3: 在 builder 阶段使用 Published Token 构建，最终 Nginx 镜像只能复制 dist。**

```dockerfile
ARG STORYBLOK_PUBLISHED_TOKEN
ENV STORYBLOK_PUBLISHED_TOKEN=$STORYBLOK_PUBLISHED_TOKEN
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY --from=builder --chown=101:101 /app/dist /usr/share/nginx/html
```

若构建缓存会被导出或共享，使用 BuildKit secret mount，禁止以公开层缓存 token。

- [ ] **Step 4: 实现 ECS 原子切换脚本。**

```sh
set -eu
docker compose pull website
docker compose up -d --no-deps website
for attempt in $(seq 1 30); do
  curl -fsS http://127.0.0.1:8080/healthz && exit 0
  sleep 2
done
exit 1
```

入口脚本必须在更新前保存 `previous-sha`，失败后以该 SHA 重启网站，不使用 latest。

- [ ] **Step 5: 验证并提交。**

Run: `npm test -- tests/storyblok-webhook.test.ts tests/docker-contract.test.ts && npm run verify:container`

Expected: 运行镜像不包含 Node、源代码、token 或 preview Bridge；健康检查、首页、详情页、Sitemap、404 和缓存头通过。

```bash
git add .github/workflows/storyblok-publish.yml scripts/deploy docs/deployment Dockerfile docker-compose.yml tests
git commit -m "feat(deploy): publish Storyblok releases to Aliyun"
```

## Task 7: 切换验收与编辑者交接

**Files:**

- Create: `docs/cms/storyblok-editor-guide.md`
- Modify: `README.md`、`说明文档.md`
- Modify: `tests/content-collection.test.ts`、`tests/assets.test.ts`、`tests/rendered-site.test.ts`、`tests/browser/site-smoke.spec.ts`

- [ ] **Step 1: 在切换期让本地 JSON 与 CMS fixture 的路径一一对应。**

```ts
expect(cmsPages.map((page) => page.path).sort()).toEqual(
  legacyPages.map((page) => page.path).sort(),
);
expect(cmsPages).toHaveLength(29);
```

- [ ] **Step 2: 执行内容冻结与全量验收。**

Run: `npx tsx scripts/storyblok/verify-space.ts && npm run verify && npm run verify:container`

Expected: 29 条页面 URL、H1、SEO title、description、OG 图片、面包屑和关键导航链接与迁移基准一致；没有新横向溢出、缺图或控制台错误。

- [ ] **Step 3: 编写编辑者手册。**

手册必须说明：新建 `site_page`、填写 slug/SEO/alt、添加允许的 blok、保存草稿、打开预览、提交审核、发布、恢复 Storyblok 历史版本。不得指导编辑者修改代码、删除在线 slug 或在生产 URL 测试草稿。

- [ ] **Step 4: 完成一次上线与回滚演练。**

顺序固定为：编辑非首页草稿 → preview 检查桌面和移动端 → 发布 → 等待 GitHub Actions → 验证生产页面和 Sitemap → 恢复 Storyblok 上一版本 → 触发重新发布。记录耗时、执行人和任何失败步骤。

- [ ] **Step 5: 迁移期 JSON 的删除单独立项并等待用户确认。**

只有同时满足以下条件才允许提出删除：连续两次演练通过、编辑者独立发布验收通过、production/preview token 已各轮换一次、映射报告已归档。删除不得与 CMS 上线提交混在一起。

- [ ] **Step 6: 更新项目记录并提交。**

```bash
git add docs/cms README.md 说明文档.md tests
git commit -m "docs(cms): hand off publishing workflow"
```

## 总体验收标准

1. 非技术编辑者可在 Storyblok 管理首页、29 个既有页面、导航、页脚、SEO、图片与受控区块，不接触 Git 或代码。
2. 草稿只在受保护 preview 域名出现，带 no-store/noindex；生产永远不使用 Draft Token。
3. 发布后 CI 自动执行 `npm run verify`、ACR 推送、ECS 健康检查与镜像部署；质量门失败不影响生产。
4. 生产仍为静态 dist + non-root Nginx，保留现有性能、SEO、Sitemap、404、GSAP、ClientRouter、菜单与浏览器回归。
5. 所有 token、Management API 权限、预览入口和 ECS SSH 密钥均不进入 Git、浏览器、公开日志或最终 Nginx 镜像。
6. 运维人员可在十分钟内回滚到上一镜像 SHA；内容人员可恢复 Storyblok 历史版本并触发可审计重新发布。

## 风险与后续决策

- Storyblok 是 SaaS；若日后要求内容完全自托管，保留 mapper 和 blok 组件接口，将内容仓库替换为 Strapi，不重写页面组件。
- Storyblok 图片 CDN 必须使用受控 CSP 域名白名单，不能添加宽泛的 `https:`。
- 静态生产站不能实时显示草稿，因此独立预览容器是必要安全边界。
- 联系表单后端、CRM、多语言与任意布局拖拽不在本计划范围，必须在 CMS 发布流程稳定后单独规划。
