# 天津光泰科技集团官网

基于 Astro 的静态企业官网，视觉、信息架构和内容来自产品经理提供的 MVP，经类型化迁移后生成首页、29 个内页和品牌 404。

## 本地开发

```bash
npm ci
npm run dev
```

## 质量验证

```bash
npm run verify
```

该命令执行格式检查、Astro 类型检查、单元测试、30 个页面构建和渲染链接检查。

## MVP 内容和资产迁移

MVP 目录仅作为只读输入：

```bash
npm run import:mvp-content -- ../../网站/app/content/pages.ts
npm run import:mvp-assets -- ../../网站/public/assets
```

生成结果提交在 `src/content/pages` 和 `src/assets/mvp`。生产构建不依赖 MVP 目录。

## Docker + Nginx

```bash
cp .env.example .env
docker compose up --build
```

打开 `http://localhost:8080`。正式部署必须将 `SITE_URL` 设置为正式 HTTPS 域名，该值在构建期写入 canonical 和 Sitemap。

完整说明见 [Docker + Nginx 部署指南](docs/deployment/docker-nginx.md)。
