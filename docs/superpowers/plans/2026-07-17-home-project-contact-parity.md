# Home Project Contact Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage's final project CTA render the same shared project-contact entry used on inner pages.

**Architecture:** `ProjectCta.astro` remains the homepage composition boundary but delegates its entire visual output to `ContactCta.astro`. A rendered-site test protects the shared copy and contact route while rejecting the previous homepage-only CTA copy.

**Tech Stack:** Astro 7, TypeScript, Vitest, Prettier.

---

### Task 1: Guard and unify the homepage project contact entry

**Files:**

- Modify: `tests/rendered-site.test.ts:153-160`
- Modify: `src/components/home/ProjectCta.astro:1-8`

- [x] **Step 1: Write the failing rendered-output contract**

Add a test that reads `dist/index.html` and verifies:

```ts
expect(homepage).toContain('PROJECT CONTACT');
expect(homepage).toContain('从一个真实项目需求开始');
expect(homepage).toContain('提交项目需求');
expect(homepage).not.toContain('START A PROJECT');
expect(homepage).not.toContain('项目咨询');
```

- [x] **Step 2: Verify the contract fails on the current build**

Run: `npm run build && npx vitest run tests/rendered-site.test.ts`

Expected: the new homepage CTA assertions fail because `ProjectCta.astro` still emits `START A PROJECT` and “项目咨询”.

- [x] **Step 3: Delegate homepage rendering to the common CTA component**

Replace the contents of `src/components/home/ProjectCta.astro` with:

```astro
---
import ContactCta from '../site/ContactCta.astro';
---

<ContactCta />
```

- [x] **Step 4: Verify the common CTA contract passes**

Run: `npm run format && npm run build && npx vitest run tests/rendered-site.test.ts`

Expected: formatting succeeds; all rendered-site tests pass and the homepage CTA uses the common copy and `/contact` route.

### Task 2: Record and verify the scoped change

**Files:**

- Modify: `说明文档.md`

- [x] **Step 1: Update the project record**

Add a completed 2026-07-17 progress row and change-record entry describing that `ProjectCta.astro` now delegates to `ContactCta.astro`, yielding the same project-contact entry as inner pages.

- [x] **Step 2: Run scoped quality checks**

Run: `npm run format:check && npm run check && npm test && npm run build && npm run test:rendered`

Expected: all checks pass with no Astro diagnostics or Vitest failures.
