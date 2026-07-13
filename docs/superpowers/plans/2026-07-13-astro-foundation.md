# Astro Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Astro foundation for a static-first corporate website with typed content, reusable layout components, tests, formatting, and CI.

**Architecture:** Astro prerenders every initial route to static HTML. Content Collections validate local news content at build time, while presentational components receive data through props and emit no client JavaScript. Tailwind and CSS variables provide a small design-token layer without importing a complete theme.

**Tech Stack:** Astro, TypeScript strict mode, Tailwind CSS, Astro Sitemap, Content Collections, Prettier, Vitest, GitHub Actions

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/pages/index.astro`

- [ ] **Step 1: Generate the minimal project**

Run:

```bash
npx create-astro@latest . --template minimal --add tailwind sitemap --install --no-git --no-ai --yes
```

Expected: the current directory contains an installable Astro project and keeps the existing `docs/` directory.

- [ ] **Step 2: Add quality dependencies**

Run:

```bash
npm install --save-dev @astrojs/check typescript vitest prettier prettier-plugin-astro
```

Expected: the dependencies are present in `package.json` and locked in `package-lock.json`.

- [ ] **Step 3: Add project scripts**

Run:

```bash
npm pkg set scripts.check="astro check"
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.format:check="prettier --check ."
npm pkg set scripts.verify="npm run format:check && npm run check && npm test && npm run build"
```

Expected: `npm run` lists `check`, `test`, `format:check`, and `verify`.

- [ ] **Step 4: Configure a deployment-neutral site URL**

Set `astro.config.mjs` to:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://example.com',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 5: Verify the untouched scaffold**

Run: `npm run build`

Expected: exit code 0 and a generated `dist/` directory.

### Task 2: Add typed content with a tested formatter

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/news/welcome.md`
- Create: `src/utils/formatDate.ts`
- Test: `tests/formatDate.test.ts`

- [ ] **Step 1: Write the failing formatter test**

Create `tests/formatDate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDate } from '../src/utils/formatDate';

describe('formatDate', () => {
  it('formats a date for Chinese readers', () => {
    expect(formatDate(new Date('2026-07-13T12:00:00Z'))).toBe('2026年7月13日');
  });

  it('rejects invalid dates', () => {
    expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date');
  });
});
```

- [ ] **Step 2: Verify that the test fails**

Run: `npm test`

Expected: FAIL because `src/utils/formatDate.ts` does not exist.

- [ ] **Step 3: Implement the formatter**

Create `src/utils/formatDate.ts`:

```ts
export function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid date');
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
```

- [ ] **Step 4: Verify that the formatter passes**

Run: `npm test`

Expected: 2 tests pass.

- [ ] **Step 5: Define the news collection**

Create `src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    publishedAt: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
```

Create `src/content/news/welcome.md`:

```md
---
title: 企业官网基础框架已建立
summary: 这是一条用于验证内容模型、日期格式和静态构建流程的示例新闻。
publishedAt: 2026-07-13
draft: false
---

此内容仅用于展示 Astro Content Collections 的结构化内容能力。
```

### Task 3: Build the design foundation and homepage

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Container.astro`
- Create: `src/components/SiteHeader.astro`
- Create: `src/components/SiteFooter.astro`
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`
- Create: `public/robots.txt`

- [ ] **Step 1: Add global tokens and accessibility defaults**

Create `src/styles/global.css`:

```css
@import 'tailwindcss';

:root {
  --color-bg: #f7f8fa;
  --color-surface: #ffffff;
  --color-text: #172033;
  --color-muted: #5f6b7c;
  --color-brand: #155eef;
  --color-border: #dfe3ea;
  --radius: 1rem;
  --container: 72rem;
  color: var(--color-text);
  background: var(--color-bg);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-synthesis: none;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  min-width: 20rem;
  margin: 0;
  line-height: 1.6;
}

a {
  color: inherit;
}

img {
  display: block;
  max-width: 100%;
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-brand) 65%, white);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Create the base layout**

Create `src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  canonical?: URL | string;
}

const { title, description, canonical } = Astro.props;
const canonicalUrl =
  canonical ?? new URL(Astro.url.pathname, Astro.site ?? Astro.url.origin);
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <link rel="canonical" href={canonicalUrl} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Create focused presentation components**

Create `src/components/Container.astro`:

```astro
---
interface Props {
  class?: string;
}

const { class: className } = Astro.props;
---

<div class:list={['container', className]}>
  <slot />
</div>

<style>
  .container {
    width: min(calc(100% - 2rem), var(--container));
    margin-inline: auto;
  }
</style>
```

Create `src/components/SiteHeader.astro`:

```astro
---
import Container from './Container.astro';

interface NavItem {
  label: string;
  href: string;
}

interface Props {
  brand: string;
  items: NavItem[];
}

const { brand, items } = Astro.props;
---

<header class="site-header">
  <Container class="header-inner">
    <a class="brand" href="/">{brand}</a>
    <nav aria-label="主要导航">
      <ul>
        {items.map((item) => <li><a href={item.href}>{item.label}</a></li>)}
      </ul>
    </nav>
  </Container>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  }

  .header-inner,
  ul {
    display: flex;
    align-items: center;
  }

  .header-inner {
    min-height: 4.5rem;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .brand {
    font-weight: 750;
    text-decoration: none;
  }

  ul {
    gap: 1.25rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  nav a {
    color: var(--color-muted);
    text-decoration: none;
  }

  nav a:hover {
    color: var(--color-brand);
  }
</style>
```

Create `src/components/SiteFooter.astro`:

```astro
---
import Container from './Container.astro';

interface Props {
  company: string;
}

const { company } = Astro.props;
---

<footer>
  <Container>
    <p>© {new Date().getUTCFullYear()} {company}。保留所有权利。</p>
  </Container>
</footer>

<style>
  footer {
    padding-block: 2rem;
    color: var(--color-muted);
    border-top: 1px solid var(--color-border);
  }

  p {
    margin: 0;
  }
</style>
```

Create `src/components/Hero.astro`:

```astro
---
interface Props {
  eyebrow: string;
  title: string;
  description: string;
}

const { eyebrow, title, description } = Astro.props;
---

<section class="hero">
  <p class="eyebrow">{eyebrow}</p>
  <h1>{title}</h1>
  <p class="description">{description}</p>
</section>

<style>
  .hero {
    max-width: 52rem;
    padding-block: clamp(4rem, 10vw, 8rem);
  }

  .eyebrow {
    margin: 0 0 1rem;
    color: var(--color-brand);
    font-weight: 700;
  }

  h1 {
    max-width: 15ch;
    margin: 0;
    font-size: clamp(2.6rem, 8vw, 5.75rem);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }

  .description {
    max-width: 42rem;
    margin: 1.5rem 0 0;
    color: var(--color-muted);
    font-size: clamp(1.05rem, 2vw, 1.3rem);
  }
</style>
```

- [ ] **Step 4: Compose the homepage**

Replace `src/pages/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import Container from '../components/Container.astro';
import Hero from '../components/Hero.astro';
import SiteFooter from '../components/SiteFooter.astro';
import SiteHeader from '../components/SiteHeader.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import { formatDate } from '../utils/formatDate';

const news = (await getCollection('news', ({ data }) => !data.draft)).sort(
  (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
);

const navigation = [
  { label: '关于我们', href: '#about' },
  { label: '新闻动态', href: '#news' },
  { label: '联系我们', href: '#contact' },
];
---

<BaseLayout
  title="Astro 企业官网基础框架"
  description="一个静态优先、类型安全、便于长期演进的企业官网技术底座。"
>
  <SiteHeader brand="企业品牌" items={navigation} />
  <main>
    <Container>
      <Hero
        eyebrow="Astro Foundation"
        title="为长期演进而设计的企业官网"
        description="静态优先、局部交互，并用清晰的组件和内容边界保持速度、安全与可维护性。"
      />
    </Container>

    <section id="about" class="section">
      <Container>
        <p class="kicker">基础能力</p>
        <h2>先建立可靠底座，再进入品牌设计</h2>
        <p>当前版本验证页面结构、内容模型、SEO 基线与自动化质量检查。</p>
      </Container>
    </section>

    <section id="news" class="section">
      <Container>
        <p class="kicker">新闻动态</p>
        <div class="news-grid">
          {
            news.map((entry) => (
              <article>
                <time datetime={entry.data.publishedAt.toISOString()}>
                  {formatDate(entry.data.publishedAt)}
                </time>
                <h2>{entry.data.title}</h2>
                <p>{entry.data.summary}</p>
              </article>
            ))
          }
        </div>
      </Container>
    </section>

    <section id="contact" class="section">
      <Container>
        <p class="kicker">下一阶段</p>
        <h2>替换为真实品牌、业务内容和联系方式</h2>
      </Container>
    </section>
  </main>
  <SiteFooter company="企业品牌" />
</BaseLayout>

<style>
  .section {
    padding-block: 4rem;
  }

  .section:nth-child(even) {
    background: var(--color-surface);
  }

  .kicker,
  time {
    color: var(--color-brand);
    font-weight: 700;
  }

  h2 {
    max-width: 28ch;
    margin: 0.5rem 0;
    font-size: clamp(1.75rem, 4vw, 3rem);
    line-height: 1.15;
  }

  .news-grid {
    display: grid;
    gap: 1rem;
    margin-top: 2rem;
  }

  article {
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
  }
</style>
```

- [ ] **Step 5: Add crawler defaults**

Create `public/robots.txt`:

```text
User-agent: *
Allow: /
```

- [ ] **Step 6: Validate the page layer**

Run: `npm run check`

Expected: exit code 0 with no Astro or TypeScript errors.

### Task 4: Add formatting, documentation, and CI

**Files:**
- Create: `.prettierrc.mjs`
- Create: `.prettierignore`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Configure Astro-aware formatting**

Create `.prettierrc.mjs`:

```js
export default {
  plugins: ['prettier-plugin-astro'],
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
  singleQuote: true,
  trailingComma: 'all',
};
```

Create `.prettierignore`:

```text
dist
node_modules
.astro
.worktrees
coverage
```

- [ ] **Step 2: Format the repository**

Run: `npm run format`

Expected: source and configuration files are formatted without errors.

- [ ] **Step 3: Add CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run verify
```

- [ ] **Step 4: Document local development**

Replace `README.md`:

````md
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
````

### Task 5: Complete verification

**Files:**
- Verify: all project files

- [ ] **Step 1: Run the complete quality gate**

Run: `npm run verify`

Expected: formatting check, Astro Check, 2 Vitest tests, and production build all pass.

- [ ] **Step 2: Inspect the production output**

Run:

```bash
find dist -maxdepth 2 -type f -print
rg -n '<script' dist/index.html
```

Expected: `dist/index.html`, sitemap output, and static assets exist; the script search returns no nonessential homepage client bundle.

- [ ] **Step 3: Review repository state**

Run:

```bash
git status --short
git diff --check
```

Expected: only intentional project files are changed and no whitespace errors are reported.
