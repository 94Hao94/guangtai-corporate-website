# Homepage AI Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI application development and industry agents the first homepage business chapter, followed by embodied intelligence with its partner ecosystem, then systems integration and industry delivery, without changing existing layouts.

**Architecture:** Reorder only the existing homepage component instances in `src/pages/index.astro`; no component structure, assets, CSS, route, or motion lifecycle changes are needed. Reword the existing two-panel `SolutionSplit` so it introduces systems integration and industry delivery after the embodied partner carousel. A rendered-output regression test protects the required order and existing destinations.

**Tech Stack:** Astro 7, TypeScript, Vitest, Prettier, existing CSS and GSAP lifecycle.

---

### Task 1: Lock the homepage narrative in a rendered-output test

**Files:**

- Modify: `tests/rendered-site.test.ts:39-69`

- [x] **Step 1: Write the failing test**

Add this test immediately after `renders home and all 29 MVP routes with page metadata`:

```ts
it('orders AI, embodied partners, and systems integration on the homepage', async () => {
  const homepage = await readFile(resolve('dist/index.html'), 'utf8');
  const aiFactory = homepage.indexOf('GUANGTAI AI FACTORY');
  const embodied = homepage.indexOf('EMBODIED INTELLIGENCE');
  const partners = homepage.indexOf('与具身智能伙伴，共同进入真实场景');
  const integration = homepage.indexOf('SYSTEM INTEGRATION &amp; INDUSTRIES');

  expect(aiFactory).toBeGreaterThan(-1);
  expect(embodied).toBeGreaterThan(aiFactory);
  expect(partners).toBeGreaterThan(embodied);
  expect(integration).toBeGreaterThan(partners);
  expect(homepage).toContain('系统集成与工程交付');
  expect(homepage).toContain('href="/solutions/common"');
  expect(homepage).toContain('href="/solutions/industries"');
});
```

- [x] **Step 2: Build and run the test to verify it fails**

Run:

```bash
npm run build && npm run test:rendered
```

Expected: the new test fails because `EMBODIED INTELLIGENCE` occurs before `GUANGTAI AI FACTORY`, and `SYSTEM INTEGRATION &amp; INDUSTRIES` is absent.

### Task 2: Reorder the existing homepage sections without changing their layouts

**Files:**

- Modify: `src/pages/index.astro:20-23`

- [x] **Step 1: Replace only the existing component order**

Replace the `<main>` contents with:

```astro
<main>
  <HomeHero /><FactorySection /><EmbodiedSection /><PartnerMarquee
  /><SolutionSplit /><EducationSection /><TechnologySection /><CaseSection
  /><ProjectCta />
</main>
```

This preserves every existing component, its markup, classes, images, links, animations, and responsive styling. It only moves `FactorySection` directly after the Hero and keeps `PartnerMarquee` directly after `EmbodiedSection`.

- [x] **Step 2: Build and run the focused test**

Run:

```bash
npm run build && npm run test:rendered
```

Expected: the new test still fails only because the systems-integration eyebrow and card label have not been updated.

### Task 3: Reword the post-partner solutions chapter as integration and industry delivery

**Files:**

- Modify: `src/components/home/SolutionSplit.astro:8-25`

- [x] **Step 1: Replace the section heading and first card copy without changing its elements, image, or href**

Use the following existing markup values:

```astro
<div class="section-heading light" data-reveal>
  <p class="eyebrow">SYSTEM INTEGRATION &amp; INDUSTRIES</p><h2>
    从系统集成，走向每一个真实场景
  </h2><p>连接空间、设备、网络与软件系统，形成可交付、可运营的行业解决方案。</p>
</div>
```

For the first panel copy, retain `href="/solutions/common"`, the existing `common` image, its `alt`, and all classes. Replace only its visible content with:

```astro
<span>01 / INTEGRATION</span><h3>系统集成与工程交付</h3><p>
  连接空间、设备、音视频、安全治理和基础设施，打通真实业务的运行链路。
</p><b>进入方案 →</b>
```

Leave the second industry panel completely unchanged.

- [x] **Step 2: Build and run the focused test to verify it passes**

Run:

```bash
npm run build && npm run test:rendered
```

Expected: all rendered-site tests pass, including the new narrative-order test.

### Task 4: Verify layout preservation and document the completed change

**Files:**

- Modify: `说明文档.md:20-31, 变更记录`

- [x] **Step 1: Run formatting and static quality checks**

Run:

```bash
npm run format:check && npm run check && npm test
```

Expected: formatting, Astro type checking, and unit tests pass.

- [x] **Step 2: Run the targeted homepage browser check on the established preview URL**

Run:

```bash
npx playwright test tests/browser/site-smoke.spec.ts --grep "homepage|partner|return-to-home"
```

Expected: homepage navigation, partner carousel, and return-to-home scenarios remain green; no browser test requires a layout rewrite.

- [x] **Step 3: Update the project record**

Update the “首页 AI 业务优先级调整” row in `说明文档.md` to `已完成`, recording the implemented order, unchanged layout boundary, and actual verification result. Add a dated change-record bullet naming `src/pages/index.astro`, `src/components/home/SolutionSplit.astro`, and the regression test.

- [x] **Step 4: Review the final diff**

Run:

```bash
git diff --check && git diff -- src/pages/index.astro src/components/home/SolutionSplit.astro tests/rendered-site.test.ts 说明文档.md
```

Expected: no whitespace errors; only component order, minimal solutions copy, a rendered-order regression test, and project documentation are changed.
