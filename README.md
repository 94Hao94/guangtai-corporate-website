# 企业官网

基于 Astro 的静态优先企业官网基础框架。

## 环境

- Node.js 24 LTS 或更高版本
- npm 11 或更高版本

## 开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm run verify
```

该命令执行格式检查、Astro 类型检查、单元测试和生产构建。

## 目录

- `src/components`：可复用展示组件
- `src/content`：本地结构化内容
- `src/layouts`：页面文档骨架
- `src/pages`：文件路由
- `src/styles`：全局样式和设计令牌
- `tests`：单元测试

新闻内容保存在 `src/content/news`，字段由 `src/content.config.ts` 校验。

生产部署时通过 `SITE_URL` 设置正式域名；未设置时使用文档保留域名 `https://example.com`。
