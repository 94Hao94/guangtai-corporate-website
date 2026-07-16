# 官网详情页与项目联系体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make detail pages easier to scan with an accessible numbered content switcher, distinguish the AI factory from AI solutions, and unify all project-contact entry points around a form with safe empty-channel behavior.

**Architecture:** A new client-island `CapabilityNavigator` consumes existing `capabilities` and `scenarios` arrays, pairing each capability with its matching scenario in a stable, accessible tab interface. `PageTemplate` selects compact compositions for `/about`, `/guangtai-ai-factory`, and `/contact`; dedicated components keep the factory experience placeholder and form logic outside the shared template. Header/menu data continues to derive from `SitePage` routes, while contact delivery stays explicitly unavailable until a channel is configured.

**Tech Stack:** Astro 7, TypeScript, Astro Content Collections, CSS, Vitest 4, Playwright 1.61.

---

## File Structure

| File                                              | Responsibility                                                          |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/components/pages/CapabilityNavigator.astro`  | Four-item keyboard, click, hover and touch-safe capability switcher.    |
| `src/components/pages/FactoryExperienceCta.astro` | Non-navigating, clearly reserved AI factory experience action.          |
| `src/components/pages/ContactForm.astro`          | Project inquiry fields, browser validation and empty-channel status.    |
| `src/components/pages/PageTemplate.astro`         | Chooses the compact About, Factory and Contact compositions.            |
| `src/components/pages/DeliverySection.astro`      | Supports a compact sequential delivery presentation for About.          |
| `src/components/site/ContactCta.astro`            | One consistent, rectangular project-contact CTA for non-contact pages.  |
| `src/components/site/SiteHeader.astro`            | “项目联系” header action and first “AI 与具身智能” menu group.          |
| `src/content/pages/about.json`                    | Four concise About capability/scenario pairs.                           |
| `src/content/pages/guangtai-ai-factory.json`      | Short platform-only AI factory copy.                                    |
| `src/content/pages/solutions--common--ai.json`    | AI workflow, agent and knowledge-base solution framing.                 |
| `src/styles/inner-page.css`                       | Navigator, compact page, form and CTA responsive layout.                |
| `src/styles/site-shell.css`                       | Header action and first menu group presentation.                        |
| `tests/rendered-site.test.ts`                     | Static output contract for compact pages, CTA semantics and menu group. |
| `tests/browser/site-smoke.spec.ts`                | Pointer, keyboard, mobile and empty-channel browser contracts.          |
| `说明文档.md`                                     | Records completion, test result and channel limitation.                 |

### Task 1: Lock the Output Contracts Before UI Changes

**Files:**

- Modify: `tests/rendered-site.test.ts`
- Modify: `tests/browser/site-smoke.spec.ts`

- [ ] **Step 1: Add a failing static-output test for the new page contracts.**

```ts
it('renders compact AI and contact journeys without duplicate project CTAs', async () => {
  const factory = await readFile(routeFile('/guangtai-ai-factory'), 'utf8');
  const contact = await readFile(routeFile('/contact'), 'utf8');
  const about = await readFile(routeFile('/about'), 'utf8');

  expect(factory).toContain('前去体验');
  expect(factory).toContain('aria-disabled="true"');
  expect(contact).toContain('<form data-project-contact-form');
  expect(contact).toContain('联系渠道尚未配置');
  expect(contact).not.toContain('START A PROJECT');
  expect(about).toContain('data-capability-navigator');
});
```

- [ ] **Step 2: Run the rendered-site test to confirm it fails.**

Run: `npm run build && npm run test:rendered`

Expected: FAIL because the navigator, form and factory experience control do not exist.

- [ ] **Step 3: Add failing browser contracts for desktop, keyboard, mobile and empty channels.**

```ts
test('capability navigator synchronizes pointer, keyboard and panel state', async ({
  page,
}) => {
  await page.goto('/about/');
  const navigator = page.locator('[data-capability-navigator]');
  const second = navigator.getByRole('tab', { name: /02/ });
  await second.hover();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(navigator.getByRole('tabpanel')).toContainText('软件');
  await page.keyboard.press('ArrowDown');
  await expect(navigator.getByRole('tab', { name: /03/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('contact form preserves a truthful empty-channel result', async ({
  page,
}) => {
  await page.goto('/contact/');
  await page.getByLabel('姓名').fill('测试客户');
  await page.getByLabel('联系方式').fill('contact@example.com');
  await page.getByLabel('需求描述').fill('需要了解 AI 智能体项目。');
  await page.getByRole('button', { name: '提交项目需求' }).click();
  await expect(page.getByRole('status')).toContainText('联系渠道尚未配置');
});
```

- [ ] **Step 4: Run only the new browser test names to confirm they fail.**

Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "capability navigator|truthful empty-channel"`

Expected: FAIL because neither selector exists.

- [ ] **Step 5: Commit the failing contracts.**

```bash
git add tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "test(site): define detail contact contracts"
```

### Task 2: Implement the Reusable Numbered Capability Navigator

**Files:**

- Create: `src/components/pages/CapabilityNavigator.astro`
- Modify: `src/components/pages/PageTemplate.astro:1-113`
- Modify: `src/styles/inner-page.css:176-308,440-523`

- [ ] **Step 1: Create the component with explicit item pairing and ARIA tabs.**

```astro
---
import type { SitePage } from '../../lib/page-schema';
interface Props {
  page: SitePage;
}
const { page } = Astro.props;
const items = page.capabilities.map((title, index) => ({
  title,
  scenario: page.scenarios[index] ?? page.scenarios.at(-1) ?? '',
  number: String(index + 1).padStart(2, '0'),
}));
---

<section class="capability-navigator" data-capability-navigator data-reveal>
  <div role="tablist" aria-label={`${page.title}核心能力`}>
    {
      items.map((item, index) => (
        <button
          role="tab"
          id={`capability-tab-${index}`}
          aria-controls={`capability-panel-${index}`}
          aria-selected={index === 0 ? 'true' : 'false'}
          tabindex={index === 0 ? '0' : '-1'}
          data-capability-tab={index}
        >
          {item.number}
          <b>{item.title}</b>
        </button>
      ))
    }
  </div>
  <div
    class="capability-panel"
    role="tabpanel"
    tabindex="0"
    data-capability-panel
    aria-labelledby="capability-tab-0"
  >
    <p data-capability-number>{items[0]?.number}</p><h2 data-capability-title>
      {items[0]?.title}
    </h2><p data-capability-copy>
      在 {items[0]?.scenario} 中形成可验证、可交付的业务结果。
    </p>
  </div>
</section>
```

- [ ] **Step 2: Add a single initialized client script that changes selection for hover, click, focus and Arrow keys.**

```ts
/** Activates one capability tab and updates its associated visible panel. */
const activate = (index: number, moveFocus = false): void => {
  tabs.forEach((tab, tabIndex) => {
    const selected = tabIndex === index;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', tabs[index].id);
  number.textContent = items[index].number;
  title.textContent = items[index].title;
  copy.textContent = `在 ${items[index].scenario} 中形成可验证、可交付的业务结果。`;
  if (moveFocus) tabs[index].focus();
};
```

- [ ] **Step 3: Replace `CapabilityCanvas` and the static `.inner-numbered-list` branch in `PageTemplate` with `CapabilityNavigator`.**

```astro
<section id="capabilities" class="inner-feature inner-section">
  <CapabilityNavigator page={page} />
</section>
```

- [ ] **Step 4: Add desktop and mobile CSS without layout-shifting active controls.**

```css
.capability-navigator {
  display: grid;
  grid-template-columns: minmax(16rem, 0.8fr) minmax(0, 1.2fr);
  border-block: 1px solid var(--line);
}
.capability-navigator [role='tab'] {
  display: grid;
  grid-template-columns: 3.5rem 1fr;
  min-height: 5.5rem;
  padding: 1rem;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: transparent;
  text-align: left;
}
.capability-navigator [role='tab'][aria-selected='true'] {
  color: var(--family);
  background: var(--family-soft);
}
.capability-panel {
  display: grid;
  align-content: center;
  min-height: 24rem;
  padding: clamp(2rem, 5vw, 5rem);
  background: var(--family-soft);
}
@media (max-width: 700px) {
  .capability-navigator {
    grid-template-columns: 1fr;
  }
  .capability-panel {
    min-height: 16rem;
  }
}
```

- [ ] **Step 5: Run the static and targeted browser contracts.**

Run: `npm run build && npm run test:rendered && npx playwright test tests/browser/site-smoke.spec.ts -g "capability navigator"`

Expected: PASS.

- [ ] **Step 6: Commit the navigator.**

```bash
git add src/components/pages/CapabilityNavigator.astro src/components/pages/PageTemplate.astro src/styles/inner-page.css tests
git commit -m "feat(site): add numbered detail navigator"
```

### Task 3: Create Compact About and AI Factory Journeys

**Files:**

- Create: `src/components/pages/FactoryExperienceCta.astro`
- Modify: `src/components/pages/PageTemplate.astro`
- Modify: `src/components/pages/DeliverySection.astro`
- Modify: `src/content/pages/about.json`
- Modify: `src/content/pages/guangtai-ai-factory.json`
- Modify: `src/styles/inner-page.css`

- [ ] **Step 1: Update the two page JSON files so their intent is distinct.**

```json
{
  "intro": "把模型、知识、工具、数据和业务流程编排为可运行、可评估、可迭代的行业智能体。",
  "positioning": "光泰AI应用工厂是项目的智能平台底座，统一承接模型、知识、工具、权限和评估，让后续的智能体与工作流能够持续运营。"
}
```

- [ ] **Step 2: Add the explicit reserved experience control.**

```astro
<section class="factory-experience" aria-label="AI应用工厂体验">
  <p>EXPERIENCE THE FACTORY</p><h2>从一个真实业务流程开始体验</h2>
  <button type="button" aria-disabled="true" disabled
    >前去体验 <span aria-hidden="true">↗</span></button
  >
</section>
```

- [ ] **Step 3: Select compact page compositions in `PageTemplate`.**

```tsx
const isAbout = page.path === '/about';
const isFactory = page.path === '/guangtai-ai-factory';
const isContact = page.path === '/contact';

{
  !isContact && (
    <section id="capabilities" class="inner-feature inner-section">
      <CapabilityNavigator page={page} />
    </section>
  );
}
{
  isContact && <ContactForm />;
}
{
  isFactory && <FactoryExperienceCta />;
}
{
  !isAbout && !isFactory && !isContact && <ScenarioSection page={page} />;
}
{
  isAbout && <DeliverySection page={page} compact />;
}
{
  !isAbout && !isFactory && !isContact && <DeliverySection page={page} />;
}
{
  !isFactory && !isContact && <RelatedPages pages={related} />;
}
{
  !isFactory && !isContact && <ContactCta />;
}
```

- [ ] **Step 4: Add the optional `compact` prop to `DeliverySection` and render its class modifier.**

```ts
interface Props { page: SitePage; compact?: boolean; }
const { page, compact = false } = Astro.props;

<section id="delivery" class:list={['inner-delivery', 'inner-section', { 'inner-delivery--compact': compact }]} data-reveal>
```

- [ ] **Step 5: Add `.page--compact` and `.factory-experience` CSS so the factory page ends after the experience section and the About delivery section follows the navigator without another oversized image grid.**

```css
.factory-experience {
  display: grid;
  gap: 1rem;
  padding: var(--section-space) max(48px, calc((100vw - 1440px) / 2));
  background: var(--blue-950);
  color: #fff;
}
.factory-experience button {
  width: fit-content;
  min-height: 3.25rem;
  padding: 0 1.2rem;
  border: 1px solid var(--cyan);
  color: var(--blue-950);
  background: var(--cyan);
  font: inherit;
}
.inner-delivery--compact .delivery-steps article {
  min-height: auto;
}
```

- [ ] **Step 6: Run static contracts and inspect the three routes at 1440 and 390 widths.**

Run: `npm run build && npm run test:rendered && npx playwright test tests/browser/site-smoke.spec.ts -g "compact|capability navigator"`

Expected: PASS with no horizontal overflow.

- [ ] **Step 7: Commit the compact compositions.**

```bash
git add src/components/pages src/content/pages src/styles/inner-page.css tests
git commit -m "feat(site): compact about and factory pages"
```

### Task 4: Unify Project Contact Entry Points and Add Truthful Form Status

**Files:**

- Create: `src/components/pages/ContactForm.astro`
- Modify: `src/components/pages/PageTemplate.astro`
- Modify: `src/components/site/ContactCta.astro`
- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/styles/inner-page.css`
- Modify: `src/styles/site-shell.css`

- [ ] **Step 1: Create a form with native required fields, accessible labels and a safe empty-channel status.**

```astro
<form class="project-contact-form" data-project-contact-form novalidate>
  <label>姓名<input name="name" required autocomplete="name" /></label>
  <label>单位<input name="organization" autocomplete="organization" /></label>
  <label>联系方式<input name="contact" required autocomplete="email" /></label>
  <label
    >项目类型<select name="projectType"
      ><option>AI应用与智能体</option><option>具身智能</option><option
        >系统集成</option
      ><option>其他项目</option></select
    ></label
  >
  <label
    >需求描述<textarea name="message" required minlength="10"></textarea></label
  >
  <button type="submit">提交项目需求</button><p
    role="status"
    aria-live="polite"
    data-contact-status
  >
  </p>
</form>
```

- [ ] **Step 2: Add the form script that stops invalid submissions and reports the unconfigured state after valid submission.**

```ts
/** Reports a truthful configuration state because no delivery target has been supplied. */
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  status.textContent = '联系渠道尚未配置，请稍后联系。';
  status.dataset.state = 'unconfigured';
});
```

- [ ] **Step 3: Render `ContactForm` only on `/contact`, omit `ContactCta` there, and give non-contact pages a rectangular CTA.**

```astro
<a class="inner-cta-action" data-route-cta href="/contact"
  >提交项目需求 <span aria-hidden="true">↗</span></a
>
```

- [ ] **Step 4: Rename only the header CTA to “项目联系”; keep the primary navigation link as “联系我们”.**

```astro
<a class="header-contact" href="/contact"
  >项目联系 <span aria-hidden="true">↗</span></a
>
```

- [ ] **Step 5: Run form and navigation browser tests.**

Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "truthful empty-channel|project CTA"`

Expected: PASS; contact never reports a sent message when no delivery channel exists.

- [ ] **Step 6: Commit the project-contact flow.**

```bash
git add src/components/pages/ContactForm.astro src/components/pages/PageTemplate.astro src/components/site src/styles tests
git commit -m "feat(site): unify project contact flow"
```

### Task 5: Clarify the First Solution Group and Complete Verification

**Files:**

- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/content/pages/solutions--common--ai.json`
- Modify: `tests/rendered-site.test.ts`
- Modify: `tests/browser/site-smoke.spec.ts`
- Modify: `说明文档.md`

- [ ] **Step 1: Change the first menu group so AI and embodied links appear first, and remove both from the general group.**

```ts
{
  title: 'AI 与具身智能',
  eyebrow: 'AI & EMBODIED',
  pages: pages.filter((page) => [
    '/solutions/common/ai',
    '/solutions/common/embodied-intelligence',
  ].includes(page.path)),
},
```

- [ ] **Step 2: Rewrite the existing AI solution intro and capabilities to name agents, workflow orchestration, RAG knowledge bases, tool automation and AI engineering without repeating the factory platform positioning.**

```json
{
  "title": "智能体与AI工作流",
  "intro": "以智能体、AI工作流、知识库与自动化工具，为具体业务流程建立可持续运行的智能入口。",
  "seoTitle": "智能体与AI工作流 | 天津光泰科技集团"
}
```

- [ ] **Step 3: Extend the rendered and browser tests.**

```ts
await solutions.hover();
await expect(page.locator('.mega-group').first()).toContainText(
  'AI 与具身智能',
);
await expect(
  page.locator('[data-solution-option="/solutions/common/ai"]'),
).toBeVisible();
await expect(
  page.locator(
    '[data-solution-option="/solutions/common/embodied-intelligence"]',
  ),
).toBeVisible();
```

- [ ] **Step 4: Run the complete validation suite.**

Run: `npm run verify`

Expected: format, Astro check, unit tests, production build, rendered-site tests and Playwright tests all pass. If a pre-existing intermittent motion test fails, rerun the individual failing test once; document both outputs and do not mask the failure.

- [ ] **Step 5: Start a dedicated worktree server only after verifying port 4324 is occupied, using `npm run dev -- --host 127.0.0.1 --port 4329`; validate `/about`, `/guangtai-ai-factory`, `/solutions/common/ai` and `/contact` at desktop and mobile widths.**

Expected: every target route renders the new composition, controls remain readable, and there is no horizontal overflow.

- [ ] **Step 6: Update `说明文档.md` with the completed work, test output and the remaining requirement for an actual delivery channel, then commit.**

```bash
git add src/components/site/SiteHeader.astro src/content/pages/solutions--common--ai.json tests 说明文档.md
git commit -m "feat(site): clarify AI solution menu"
```
