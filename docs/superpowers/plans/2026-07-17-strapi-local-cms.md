# Strapi Local CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paused Storyblok implementation with a locally runnable Strapi 5 + PostgreSQL CMS that lets non-technical editors manage the Guangtai website while Astro continues to generate the public static site.

**Architecture:** A new `cms/` Strapi application runs with PostgreSQL 16 through a dedicated local Compose stack. Astro reads only published Strapi content through one typed repository during build; Strapi drafts, credentials, media volumes, and admin access never enter the public site bundle. The existing Storyblok code is removed only after the Strapi mapper and repository have their own passing tests.

**Tech Stack:** Strapi 5.50.2, PostgreSQL 16, Node 24, Docker Compose, Astro 7, TypeScript 6, Zod, Vitest, Playwright, Docker, nginx-unprivileged.

---

## File Map

- Create: `cms/package.json` — Strapi application dependencies and local scripts.
- Create: `cms/config/{database,server,admin,api}.js` — local Strapi runtime configuration.
- Create: `cms/src/api/site-page/content-types/site-page/schema.json` — page collection type.
- Create: `cms/src/api/home-page/content-types/home-page/schema.json` — homepage single type.
- Create: `cms/src/api/site-setting/content-types/site-setting/schema.json` — navigation, footer, contact, and default SEO single type.
- Create: `cms/src/components/shared/*.json` — fixed Dynamic Zone component schemas.
- Create: `cms/src/index.js` — bootstrap validation and initial role restrictions.
- Create: `cms/scripts/import-current-content.mjs` — deterministic import from the current 29 JSON pages and home data.
- Create: `cms/scripts/verify-content.mjs` — validates API data after import.
- Create: `cms/.env.example`, `cms/Dockerfile`, `docker-compose.cms.yml`, `docs/cms/strapi-local-setup.md`.
- Create: `src/lib/strapi/{types,client,mapper,content,image}.ts` — the only Astro-to-Strapi boundary.
- Create: `tests/{strapi-mapper,strapi-client,strapi-content,strapi-compose}.test.ts`.
- Modify: `src/pages/index.astro`, `src/pages/[...slug].astro`, `src/layouts/BaseLayout.astro`, `src/components/site/SiteHeader.astro`, `src/components/site/SiteFooter.astro`, `src/lib/images.ts`, `.env.example`, `README.md`, `说明文档.md`.
- Modify: `tests/content-collection.test.ts`, `tests/rendered-site.test.ts`, `tests/assets.test.ts`, `tests/docker-contract.test.ts`, `tests/browser/site-smoke.spec.ts`.
- Delete after replacement tests pass: `src/lib/storyblok/`, `tests/storyblok-*.test.ts`, `@storyblok/astro`, `@astrojs/node`, Storyblok variables in `.env.example`, and the obsolete Storyblok plan.

## Task 1: Define the Strapi response contract before removing Storyblok

**Files:**

- Create: `src/lib/strapi/types.ts`
- Create: `src/lib/strapi/mapper.ts`
- Create: `tests/strapi-mapper.test.ts`
- Modify: `src/lib/page-schema.ts`

- [x] **Step 1: Write a failing mapper test for one flat Strapi v5 page response.**

```ts
import { expect, it } from 'vitest';
import { mapStrapiPage } from '../src/lib/strapi/mapper';

it('maps a published Strapi page to SitePage', () => {
  expect(
    mapStrapiPage({
      documentId: 'page-about',
      slug: 'about',
      template: 'brand',
      title: '关于光泰',
      english: 'ABOUT GUANGTAI',
      category: '品牌',
      visualFamily: 'brand',
      intro: '从技术能力走向长期服务。',
      positioning: '以工程能力服务真实场景。',
      hero: {
        url: '/uploads/about.jpg',
        alternativeText: '光泰办公空间',
        width: 1600,
        height: 900,
      },
      images: [
        {
          url: '/uploads/about-a.jpg',
          alternativeText: '团队协作',
          width: 1200,
          height: 800,
        },
        {
          url: '/uploads/about-b.jpg',
          alternativeText: '项目交付',
          width: 1200,
          height: 800,
        },
      ],
      capabilities: ['系统建设'],
      scenarios: ['行业服务'],
      delivery: ['项目实施'],
      seoTitle: '关于光泰｜光泰',
      seoDescription: '从技术能力走向长期服务。',
      ogImage: {
        url: '/uploads/about-og.jpg',
        alternativeText: '光泰办公空间',
        width: 1200,
        height: 630,
      },
    }),
  ).toMatchObject({ path: '/about', template: 'brand', title: '关于光泰' });
});
```

- [x] **Step 2: Run the focused test and confirm the missing module failure.**

Run: `npm test -- tests/strapi-mapper.test.ts`

Expected: FAIL because `src/lib/strapi/mapper.ts` does not exist.

- [x] **Step 3: Define narrow Strapi types and the mapper.**

```ts
export interface StrapiMedia {
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
}

export interface StrapiPage {
  documentId: string;
  slug: string;
  template: 'overview' | 'detail' | 'brand';
  title: string;
  english: string;
  category: string;
  visualFamily: 'platform' | 'common' | 'higher' | 'k12' | 'brand';
  parentPath?: string | null;
  intro: string;
  positioning: string;
  hero: StrapiMedia;
  images: [StrapiMedia, StrapiMedia];
  capabilities: string[];
  scenarios: string[];
  delivery: string[];
  seoTitle: string;
  seoDescription: string;
  ogImage: StrapiMedia;
}

export function mapStrapiPage(page: StrapiPage): SitePage {
  return pageSchema.parse({
    id: page.documentId,
    path: '/' + page.slug.replace(/^\//, ''),
    template: page.template,
    title: page.title,
    english: page.english,
    category: page.category,
    visualFamily: page.visualFamily,
    parentPath: page.parentPath ?? undefined,
    intro: page.intro,
    positioning: page.positioning,
    hero: toStrapiImageUrl(page.hero),
    images: [
      toStrapiImageUrl(page.images[0]),
      toStrapiImageUrl(page.images[1]),
    ],
    capabilities: page.capabilities,
    scenarios: page.scenarios,
    delivery: page.delivery,
    draft: false,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ogImage: toStrapiImageUrl(page.ogImage),
  });
}
```

- [x] **Step 4: Add a second failing test for a missing Strapi alternative text value, then implement `toStrapiImageUrl` to reject it.**

```ts
expect(() =>
  mapStrapiPage({ ...page, hero: { ...page.hero, alternativeText: null } }),
).toThrow('hero.alternativeText must not be empty');
```

```ts
export function toStrapiImageUrl(media: StrapiMedia, field = 'media'): string {
  if (!media.alternativeText?.trim()) {
    throw new Error(field + '.alternativeText must not be empty');
  }
  return media.url;
}
```

- [x] **Step 5: Run mapper tests, type checks, and formatting.**

Run: `npm test -- tests/strapi-mapper.test.ts && npm run check && npm run format:check`

Expected: PASS with zero Astro errors, warnings, and hints.

- [ ] **Step 6: Commit the Strapi contract.**

```bash
git add src/lib/strapi/types.ts src/lib/strapi/mapper.ts src/lib/page-schema.ts tests/strapi-mapper.test.ts
git commit -m "feat(cms): define Strapi page contract"
```

## Task 2: Create the local Strapi and PostgreSQL runtime

**Files:**

- Create: `cms/package.json`
- Create: `cms/.env.example`
- Create: `cms/config/database.js`
- Create: `cms/config/server.js`
- Create: `cms/Dockerfile`
- Create: `docker-compose.cms.yml`
- Create: `tests/strapi-compose.test.ts`
- Create: `docs/cms/strapi-local-setup.md`

- [ ] **Step 1: Write a failing Compose contract test.**

```ts
expect(compose).toContain('postgres:16-alpine');
expect(compose).toContain('127.0.0.1:1337:1337');
expect(compose).not.toMatch(/5432:5432/);
expect(compose).toContain('strapi-postgres-data');
expect(compose).toContain('strapi-uploads');
```

- [ ] **Step 2: Run the test and confirm the missing Compose file failure.**

Run: `npm test -- tests/strapi-compose.test.ts`

Expected: FAIL because `docker-compose.cms.yml` does not exist.

- [ ] **Step 3: Scaffold the Strapi 5 application in `cms/` and pin its runtime dependency.**

Run: `npx create-strapi-app@5.50.2 cms --skip-cloud --no-run --js --use-npm`

Expected: `cms/package.json` contains `@strapi/strapi: 5.50.2`; no generated database or secret file is committed.

- [ ] **Step 4: Configure Strapi to use PostgreSQL and bind locally.**

```js
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'postgres'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'guangtai_cms'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD'),
      ssl: false,
    },
  },
});
```

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: { keys: env.array('APP_KEYS') },
});
```

- [ ] **Step 5: Create the local-only Compose stack.**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env_file: cms/.env
    volumes: [strapi-postgres-data:/var/lib/postgresql/data]
    healthcheck:
      test: [CMD-SHELL, pg_isready -U strapi -d guangtai_cms]
  strapi:
    build: { context: cms, dockerfile: Dockerfile }
    env_file: cms/.env
    ports: [127.0.0.1:1337:1337]
    volumes: [strapi-uploads:/opt/app/public/uploads]
    depends_on:
      postgres: { condition: service_healthy }
volumes:
  strapi-postgres-data:
  strapi-uploads:
```

- [ ] **Step 6: Add a secret-free environment template and local setup guide.**

```dotenv
HOST=0.0.0.0
PORT=1337
APP_KEYS=local-key-one,local-key-two,local-key-three,local-key-four
API_TOKEN_SALT=local-api-token-salt
ADMIN_JWT_SECRET=local-admin-jwt-secret
TRANSFER_TOKEN_SALT=local-transfer-token-salt
JWT_SECRET=local-jwt-secret
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=guangtai_cms
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=local-strapi-password
POSTGRES_DB=guangtai_cms
POSTGRES_USER=strapi
POSTGRES_PASSWORD=local-strapi-password
```

The guide must require `cp cms/.env.example cms/.env`, generating unique local secrets, `docker compose -f docker-compose.cms.yml up -d`, creating the initial administrator, and verifying `http://127.0.0.1:1337/admin`.

- [ ] **Step 7: Run the Compose contract test and start the local stack.**

Run: `npm test -- tests/strapi-compose.test.ts && docker compose -f docker-compose.cms.yml up -d`

Expected: PASS; PostgreSQL reports healthy; Strapi responds on `http://127.0.0.1:1337/admin`; host port 5432 is not listening.

- [ ] **Step 8: Commit the local runtime.**

```bash
git add cms docker-compose.cms.yml tests/strapi-compose.test.ts docs/cms/strapi-local-setup.md
git commit -m "feat(cms): add local Strapi runtime"
```

## Task 3: Add Strapi schemas, validation, and editor permissions

**Files:**

- Create: `cms/src/api/site-page/content-types/site-page/schema.json`
- Create: `cms/src/api/home-page/content-types/home-page/schema.json`
- Create: `cms/src/api/site-setting/content-types/site-setting/schema.json`
- Create: `cms/src/components/shared/{hero,feature-list,card-grid,image-copy,partner-marquee,cta}.json`
- Create: `cms/src/index.js`
- Create: `cms/src/api/site-page/content-types/site-page/lifecycles.js`
- Create: `tests/strapi-schema.test.ts`

- [ ] **Step 1: Write schema tests that inspect every required content type, component UID, Dynamic Zone allowlist, and required media alt field.**

```ts
expect(sitePageSchema.attributes.blocks.components).toEqual([
  'shared.hero',
  'shared.feature-list',
  'shared.card-grid',
  'shared.image-copy',
  'shared.partner-marquee',
  'shared.cta',
]);
expect(sitePageSchema.attributes.slug.unique).toBe(true);
expect(sitePageSchema.options.draftAndPublish).toBe(true);
```

- [ ] **Step 2: Run the focused test and confirm it fails before schemas exist.**

Run: `npm test -- tests/strapi-schema.test.ts`

Expected: FAIL because the schema files do not exist.

- [ ] **Step 3: Implement the Site Page collection schema.**

```json
{
  "kind": "collectionType",
  "collectionName": "site_pages",
  "info": {
    "singularName": "site-page",
    "pluralName": "site-pages",
    "displayName": "Site Page"
  },
  "options": { "draftAndPublish": true },
  "attributes": {
    "slug": { "type": "string", "required": true, "unique": true },
    "template": {
      "type": "enumeration",
      "enum": ["overview", "detail", "brand"],
      "required": true
    },
    "title": { "type": "string", "required": true },
    "hero": {
      "type": "media",
      "multiple": false,
      "required": true,
      "allowedTypes": ["images"]
    },
    "blocks": {
      "type": "dynamiczone",
      "components": [
        "shared.hero",
        "shared.feature-list",
        "shared.card-grid",
        "shared.image-copy",
        "shared.partner-marquee",
        "shared.cta"
      ]
    }
  }
}
```

Add the remaining scalar fields listed in the design document, the two required `images`, a required `ogImage`, and the three repeatable text fields. Use Strapi field descriptions to state that every uploaded media asset requires alternative text.

- [ ] **Step 4: Implement Home Page, Site Setting, and the six fixed Dynamic Zone components.**

Each component schema must have a required `displayName`, fixed field types, and no custom HTML field. `shared.cta` has required `heading`, `label`, and `link`; `shared.image-copy` has required `heading`, `copy`, and one image; `shared.card-grid` has an enumeration for two, three, or four columns.

- [ ] **Step 5: Add lifecycle validation for whitespace-only slug, empty media alternative text, and parentPath self-reference.**

```js
function assertText(value, field) {
  if (!value || !value.trim()) throw new Error(field + ' must not be empty');
}

module.exports = {
  beforeCreate(event) {
    assertText(event.params.data.slug, 'slug');
    if (event.params.data.parentPath === '/' + event.params.data.slug) {
      throw new Error('parentPath cannot reference the page itself');
    }
  },
  beforeUpdate(event) {
    module.exports.beforeCreate(event);
  },
};
```

- [ ] **Step 6: Restrict the public role and document the editor workflow.**

In `cms/src/index.js`, do not grant public content permissions. The setup guide must instruct the administrator to create one read-only API token for Astro and editor accounts for humans. The token is saved only in the root `.env` as `STRAPI_API_TOKEN`.

- [ ] **Step 7: Run schema tests and verify the Admin panel.**

Run: `npm test -- tests/strapi-schema.test.ts && docker compose -f docker-compose.cms.yml restart strapi`

Expected: PASS; Admin lists Site Page, Home Page, Site Setting, and exactly six shared block types.

- [ ] **Step 8: Commit content modeling.**

```bash
git add cms/src tests/strapi-schema.test.ts docs/cms/strapi-local-setup.md
git commit -m "feat(cms): define Strapi content models"
```

## Task 4: Import and verify existing site content

**Files:**

- Create: `cms/scripts/import-current-content.mjs`
- Create: `cms/scripts/verify-content.mjs`
- Create: `tests/strapi-import.test.ts`
- Modify: `cms/package.json`

- [ ] **Step 1: Write a failing import test that loads the 29 current JSON pages and produces one deterministic Strapi payload for every route.**

```ts
expect(await exportPages()).toHaveLength(29);
expect((await exportPages()).map((page) => page.slug)).toContain('about');
expect((await exportPages())[0].blocks).toEqual([]);
```

- [ ] **Step 2: Run the focused test and confirm it fails because the import API does not exist.**

Run: `npm test -- tests/strapi-import.test.ts`

Expected: FAIL because `cms/scripts/import-current-content.mjs` does not export `exportPages`.

- [ ] **Step 3: Implement deterministic JSON conversion from `src/content/pages/*.json`.**

```js
export async function exportPages() {
  const pages = await readLegacyPages();
  return pages.map((page) => ({
    slug: page.path.slice(1),
    template: page.template,
    title: page.title,
    english: page.english,
    category: page.category,
    visualFamily: page.visualFamily,
    parentPath: page.parentPath ?? null,
    intro: page.intro,
    positioning: page.positioning,
    capabilities: page.capabilities,
    scenarios: page.scenarios,
    delivery: page.delivery,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    blocks: [],
  }));
}
```

The script must upload referenced local assets before creating entries, use Strapi bootstrap/entity service with `STRAPI_ADMIN_TOKEN`, and refuse to overwrite an existing slug unless `--replace` is explicitly supplied.

- [ ] **Step 4: Implement post-import verification against Strapi Content API.**

```js
const pages = await getPublishedPages();
if (pages.length !== 29) throw new Error('Expected 29 published pages');
if (validatePages(pages).length)
  throw new Error(validatePages(pages).join('\n'));
```

The verifier must compare URL, title, SEO title, description, hero URL and OG URL against the legacy JSON baseline.

- [ ] **Step 5: Import into the local Strapi instance and publish all 29 pages.**

Run: `npm --prefix cms run import:current-content -- --replace && npm --prefix cms run verify:content`

Expected: all 29 pages, Home Page, and Site Setting appear in Admin as published content; verification reports no mismatches.

- [ ] **Step 6: Commit migration tooling.**

```bash
git add cms/scripts cms/package.json tests/strapi-import.test.ts
git commit -m "feat(cms): import current content into Strapi"
```

## Task 5: Switch Astro to the Strapi repository

**Files:**

- Create: `src/lib/strapi/client.ts`
- Create: `src/lib/strapi/content.ts`
- Create: `src/lib/strapi/image.ts`
- Create: `tests/strapi-client.test.ts`
- Create: `tests/strapi-content.test.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/[...slug].astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/components/site/SiteFooter.astro`
- Modify: `src/lib/images.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write a failing repository test that asserts a bearer token, published status, pagination, and no browser-side token.**

```ts
expect(request.headers.Authorization).toBe('Bearer local-read-token');
expect(request.url).toContain('status=published');
expect(await getSitePage('/about')).toMatchObject({ title: '关于光泰' });
```

- [ ] **Step 2: Run the focused test and confirm it fails before the client exists.**

Run: `npm test -- tests/strapi-client.test.ts tests/strapi-content.test.ts`

Expected: FAIL because the Strapi repository modules do not exist.

- [ ] **Step 3: Implement the server-only Strapi client.**

```ts
export async function getStrapiJson<T>(path: string): Promise<T> {
  const baseUrl = process.env.STRAPI_URL;
  const token = process.env.STRAPI_API_TOKEN;
  if (!baseUrl || !token)
    throw new Error('STRAPI_URL and STRAPI_API_TOKEN are required');
  const response = await fetch(new URL(path, baseUrl), {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (!response.ok)
    throw new Error('Strapi request failed with ' + response.status);
  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Implement typed page, home, and site-setting repositories.**

```ts
export async function getSitePages(): Promise<SitePage[]> {
  const response = await getStrapiJson<StrapiListResponse<StrapiPage>>(
    '/api/site-pages?status=published&pagination[pageSize]=100&populate=*',
  );
  return response.data.map(mapStrapiPage);
}
```

The home and setting queries must explicitly populate their Dynamic Zone media; page queries must sort by slug to yield deterministic static paths.

- [ ] **Step 5: Update Astro routes and shell to read only from the Strapi repository.**

```ts
export async function getStaticPaths() {
  const pages = await getSitePages();
  return pages.map((page) => ({
    params: { slug: page.path.slice(1) },
    props: { page, pages },
  }));
}
```

For the home route call `getHomePage()`; for header/footer call `getSiteSettings()`. Keep `buildContentTree`, breadcrumb JSON-LD, current template selection, ClientRouter, GSAP, and existing component interfaces.

- [ ] **Step 6: Run a local Strapi-backed static build.**

Run: `STRAPI_URL=http://127.0.0.1:1337 STRAPI_API_TOKEN=local-read-token SITE_URL=https://www.example.com npm run build`

Expected: all existing routes appear in `dist/`; output contains no API token and no request to Storyblok.

- [ ] **Step 7: Commit Astro integration.**

```bash
git add src/lib/strapi src/pages src/layouts src/components/site src/lib/images.ts .env.example tests/strapi-*.test.ts
git commit -m "feat(cms): render Astro pages from Strapi"
```

## Task 6: Remove Storyblok and complete local CMS acceptance

**Files:**

- Delete: `src/lib/storyblok/`
- Delete: `tests/storyblok-*.test.ts`
- Delete: `docs/superpowers/plans/2026-07-16-storyblok-aliyun-cms.md`
- Modify: `package.json`, `package-lock.json`, `.env.example`, `README.md`, `说明文档.md`
- Modify: `tests/content-collection.test.ts`, `tests/rendered-site.test.ts`, `tests/assets.test.ts`, `tests/docker-contract.test.ts`, `tests/browser/site-smoke.spec.ts`

- [ ] **Step 1: Write a failing source-contract test that rejects Storyblok imports, environment fields, package dependencies, and output URLs.**

```ts
expect(packageJson.dependencies['@storyblok/astro']).toBeUndefined();
expect(sourceFiles.join('\n')).not.toContain('storyblok');
expect(envExample).not.toContain('STORYBLOK_');
```

- [ ] **Step 2: Run it and confirm it fails while Storyblok code is still present.**

Run: `npm test -- tests/strapi-removal.test.ts`

Expected: FAIL because Storyblok dependencies and files still exist.

- [ ] **Step 3: Remove Storyblok implementation in one reversible commit.**

Run: `npm uninstall @storyblok/astro @astrojs/node`

Delete the Storyblok source/tests and replace every Storyblok variable in `.env.example` with:

```dotenv
STRAPI_URL=http://127.0.0.1:1337
STRAPI_API_TOKEN=
```

Retain `src/content/pages` until two local import-and-build rehearsals pass and the user separately confirms deletion.

- [ ] **Step 4: Update documentation and the project record.**

The setup guide, README, and `说明文档.md` must document local Strapi startup, first-admin creation, read-only API token creation, import, verification, static build, backup of Docker volumes, and the fact that cloud deployment is intentionally not configured in this stage.

- [ ] **Step 5: Run full local acceptance.**

Run: `npm run verify && npm --prefix cms run verify:content && docker compose -f docker-compose.cms.yml ps`

Expected: formatting, type checks, unit tests, static build, rendered-site tests, browser tests, content verification, and Compose health checks all pass.

- [ ] **Step 6: Run an editor acceptance rehearsal.**

Perform: edit a non-homepage draft in Strapi → verify it is absent from Astro static output → publish it → rebuild Astro → confirm title, SEO, and image alt appear in the generated route → restore the previous Strapi version.

Expected: published content alone changes static output; the restoration produces the previous generated HTML.

- [ ] **Step 7: Commit Strapi cutover and document verification.**

```bash
git add -A
git commit -m "feat(cms): replace Storyblok with Strapi"
```

## Plan Self-Review

- Spec coverage: Tasks 1–6 cover the local runtime, PostgreSQL isolation, Strapi schemas, editor permissions, deterministic import, Astro reads, media/alt validation, Storyblok cleanup, tests, docs, and local acceptance. Alibaba Cloud deployment remains intentionally excluded.
- Placeholder scan: This plan contains no unfinished implementation markers; all external values are supplied through secret-free environment templates.
- Type consistency: `StrapiMedia`, `StrapiPage`, `mapStrapiPage`, `getStrapiJson`, `getSitePages`, and `getSitePage` are defined before use and retain the same names in every task.
