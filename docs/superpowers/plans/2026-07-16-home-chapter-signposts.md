# Home Chapter Signposts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent, lightweight chapter signposts to every major homepage business section so scrolling visitors can identify the current business area.

**Architecture:** A reusable Astro component owns the chapter number, Chinese name, English helper text, and light/dark color variant. Homepage sections opt into it without moving their existing titles, cards, images, links, or content order; nested sections use decimal numbering to make their parent chapter visible.

**Tech Stack:** Astro 7, TypeScript, project CSS, Vitest rendered-site tests, Playwright.

---

### Task 1: Lock the homepage chapter contract

**Files:**

- Modify: `tests/rendered-site.test.ts`

- [ ] **Step 1: Write the failing rendered-output assertion**

```ts
expect(homeHtml).toContain('01 / AI 应用工厂');
expect(homeHtml).toContain('02.1 / 具身生态伙伴');
expect(homeHtml).toContain('03.1 / 教育行业场景');
expect(homeHtml).toContain('04 / 项目实践');
```

- [ ] **Step 2: Run the rendered test to verify it fails**

Run: `npm run test:rendered`
Expected: FAIL because homepage HTML does not yet contain the chapter signposts.

### Task 2: Add the reusable signpost and section wiring

**Files:**

- Create: `src/components/home/HomeChapter.astro`
- Modify: `src/components/home/FactorySection.astro`
- Modify: `src/components/home/EmbodiedSection.astro`
- Modify: `src/components/home/PartnerMarquee.astro`
- Modify: `src/components/home/SolutionSplit.astro`
- Modify: `src/components/home/TechnologySection.astro`
- Modify: `src/components/home/EducationSection.astro`
- Modify: `src/components/home/CaseSection.astro`

- [ ] **Step 1: Implement the component API**

```astro
---
interface Props {
  number: string;
  title: string;
  english: string;
  tone?: 'light' | 'dark';
}
const { number, title, english, tone = 'light' } = Astro.props;
---

<div class:list={['home-chapter', `home-chapter--${tone}`]}>
  <span>{number}</span><div><b>{title}</b><small>{english}</small></div>
</div>
```

- [ ] **Step 2: Render chapter signposts before each existing section heading**

```astro
<HomeChapter
  number="03.1"
  title="工程与技术"
  english="TECHNOLOGY & ENGINEERING"
  tone="dark"
/>
```

- [ ] **Step 3: Run the rendered test to verify it passes**

Run: `npm run test:rendered`
Expected: PASS with all homepage chapter labels present.

### Task 3: Style the hierarchy without changing existing layouts

**Files:**

- Modify: `src/styles/home.css`

- [ ] **Step 1: Add shared signpost rules and narrow-screen layout**

```css
.home-chapter {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
}
.home-chapter--dark {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.35);
}
@media (max-width: 760px) {
  .home-chapter {
    grid-template-columns: 2.5rem 1fr;
  }
}
```

- [ ] **Step 2: Run type and style checks**

Run: `npm run format:check && npm run check`
Expected: both commands pass with no errors.

### Task 4: Verify desktop and mobile reading flow

**Files:**

- Modify: `tests/browser/site-smoke.spec.ts`

- [ ] **Step 1: Add browser checks for the first and last signposts and mobile overflow**

```ts
await expect(page.getByText('01 / AI 应用工厂')).toBeVisible();
await expect(page.getByText('04 / 项目实践')).toBeVisible();
expect(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
).toBe(true);
```

- [ ] **Step 2: Run the targeted browser test**

Run: `npm run test:e2e:run -- --grep "homepage chapter signposts"`
Expected: PASS at desktop and 390px widths.

- [ ] **Step 3: Update `说明文档.md` and commit**

```bash
git add src/components/home src/styles/home.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts 说明文档.md docs/superpowers
git commit -m "feat(home): add chapter signposts"
```
