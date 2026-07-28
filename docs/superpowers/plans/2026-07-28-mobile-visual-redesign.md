# 光泰官网移动端视觉重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变桌面端业务顺序和交互策略的前提下，把光泰官网手机端重构为紧凑、清晰、可访问的企业官网体验。

**Architecture:** 保留现有 Astro 内容集合、桌面组件和 ClientRouter 生命周期，在 `max-width: 700px` 下启用移动端专用信息摘要、四家族导航和折叠交互。首页新增少量职责单一的手机端组件，内页与站点壳在现有组件中增加自适应语义和样式；所有内容继续来自现有页面、首页数据和伙伴数据，不建立第二套业务内容源。

**Tech Stack:** Astro 7、TypeScript 6、CSS、GSAP 3/ScrollTrigger、Vitest 4、Playwright 1.61、Astro Assets。

## Global Constraints

- 设计基准视口为 `390 × 844`，同时覆盖 `375 × 812`、`320 × 700`、`768 × 1024` 和 `1440 × 900`。
- 手机 Header 固定为 `58px`；首页 Hero 为 `220px`；普通内页 Hero 为 `230px`；联系页 Hero 为 `180px`。
- 手机内容左右边距为 `20px`，Header 左右边距为 `18px`；普通章节上下留白为 `40–56px`。
- 主要触控目标最小高度为 `48px`；Header 图标按钮为 `38px`，并保留周边间距。
- 手机主标题为 `25–29px`，正文为 `12–14px` 且行高不低于 `1.5`；不得按视口宽度连续缩放字号，字距不得为负。
- 手机端不加载 Spline；使用同一获批 Hero 素材生成 `780 × 440` 的移动端构图版本，人物或设备焦点位于右侧、左侧保留文字安全区。
- 桌面端既有业务顺序、Spline 场景、Mega Menu 预览和页面切换行为不得发生非预期变化。
- 不新增 CMS、表单后端、真实联系渠道、客户名称、案例数量、项目指标、ICP备案号或法律链接。
- 页脚只展示仓库中已有的真实版权信息；备案和法律内容待真实资料提供后再加入。
- `.superpowers/`、既有未跟踪计划、Logo ZIP 和 Logo 目录不得进入任何提交。
- 实施前使用 `superpowers:using-git-worktrees` 创建 `codex/mobile-visual-redesign` 隔离分支和 worktree；不得直接在当前 `main` 上实施产品代码。
- 每个任务按红灯、绿灯、重构顺序执行；只暂存该任务列出的文件。

## File Structure

- `src/components/site/SiteHeader.astro`：共享头部、手机主导航和四家族解决方案折叠逻辑。
- `src/components/site/SiteFooter.astro`：共享页脚、三个手机折叠分组和真实版权/项目联系信息。
- `src/components/home/MobileCapabilityOverview.astro`：手机首屏四项核心能力与下一章节露头。
- `src/components/home/MobileDeliverySection.astro`：手机端三步交付路径。
- `src/components/home/MobileScenarioSection.astro`：手机端单一重点场景和四个业务家族入口。
- `src/components/home/MobileProjectSection.astro`：手机端项目类型编号列表和生态伙伴横滑摘要。
- `src/components/home/HomeHero.astro`：共享 Hero；桌面维持原结构，手机启用专用构图和精简文案。
- `src/data/home.ts`：桌面和手机首页共用的能力、交付、场景、项目类型数据。
- `src/components/pages/InnerHero.astro`：普通内页与联系页的紧凑 Hero 变体。
- `src/components/pages/CapabilityNavigator.astro`：桌面 Tab 与手机单选折叠列表，共享同一 `items` 数据。
- `src/components/pages/ContactForm.astro`：手机字段布局、字段级错误和真实未配置状态。
- `src/styles/base.css`：移动端全局边距、标题和进入动效回退值。
- `src/styles/site-shell.css`：Header、导航、页脚的移动端合同。
- `src/styles/home.css`：手机首页专用节奏和桌面区块的响应式显隐。
- `src/styles/inner-page.css`：内页 Hero、章节导航、折叠项、联系表单和 CTA 的移动端合同。
- `src/scripts/site-motion.ts`：手机较短的揭示动效，跳过响应式隐藏内容和隐藏轨道。
- `src/components/home/DataNetwork.astro`：手机端不初始化 Hero Canvas。
- `tests/rendered-site.test.ts`：静态 HTML、内容来源和无虚构信息合同。
- `tests/browser/site-smoke.spec.ts`：交互、尺寸、可访问性、无溢出和截图合同。
- `说明文档.md`：实施进度、验证证据和遗留风险。

---

### Task 1: 58px 站点壳与四家族手机导航

**Files:**

- Modify: `src/components/site/SiteHeader.astro:9-249`
- Modify: `src/styles/site-shell.css:1-373`
- Modify: `tests/rendered-site.test.ts:171-198`
- Modify: `tests/browser/site-smoke.spec.ts:318-344`

**Interfaces:**

- Consumes: `SitePage[]` 与现有 `solutionGroups` 四组数据。
- Produces: `[data-solution-group-trigger]`、`[data-solution-group-panel]`、`setSolutionGroup(index: number)`、`.mobile-nav-contact`。
- Preserves: 桌面 `data-solutions-mega-menu`、24 个 `data-solution-option`、预览面板、Escape、焦点恢复、Body 滚动锁定和 `astro:after-swap` 当前页同步。

- [ ] **Step 1: 写入失败的静态渲染合同**

在 `tests/rendered-site.test.ts` 的解决方案菜单测试后增加：

```ts
it('renders four mobile solution family controls and a project contact action', async () => {
  const homepage = await readFile(resolve('dist/index.html'), 'utf8');

  expect(homepage.match(/data-solution-group-trigger/g)).toHaveLength(4);
  expect(homepage.match(/data-solution-group-panel/g)).toHaveLength(4);
  expect(homepage).toContain('class="mobile-nav-contact"');
  expect(homepage).toContain('>提交项目需求<');
});
```

- [ ] **Step 2: 运行静态合同并确认红灯**

Run: `npm run build && npm run test:rendered`

Expected: FAIL，缺少 `data-solution-group-trigger` 和 `.mobile-nav-contact`。

- [ ] **Step 3: 为四个家族增加手机折叠触发器**

在每个 `.mega-group` 中保留桌面标题并添加仅手机显示的按钮，面板继续包含原来的链接：

```astro
<h2 class="mega-group-title">{group.title}</h2>
<button
  class="mega-group-trigger"
  type="button"
  aria-expanded={groupIndex === 0 ? 'true' : 'false'}
  aria-controls={`solution-group-${groupIndex + 1}`}
  data-solution-group-trigger={groupIndex}
>
  <span>{String(groupIndex + 1).padStart(2, '0')}</span>
  <strong>{group.title}</strong>
  <small>{group.pages.length} 项</small>
</button>
<div
  id={`solution-group-${groupIndex + 1}`}
  class="mega-option-list"
  data-solution-group-panel={groupIndex}
>
  {
    group.pages.map((page) => (
      <a
        href={page.path}
        data-solution-option={page.path}
        data-preview-title={page.title}
        data-preview-copy={page.intro}
        aria-current={pathname === page.path ? 'page' : undefined}
      >
        <>
          <b>{page.title}</b>
          <i aria-hidden="true">↗</i>
        </>
      </a>
    ))
  }
</div>
```

在主导航最后增加：

```astro
<a class="mobile-nav-contact" href="/contact">提交项目需求 <span>↗</span></a>
```

- [ ] **Step 4: 实现一次只展开一个手机家族**

在现有 Header 脚本中缓存触发器和面板，并加入：

```ts
const solutionGroupTriggers = Array.from(
  header.querySelectorAll<HTMLButtonElement>('[data-solution-group-trigger]'),
);
const solutionGroupPanels = Array.from(
  header.querySelectorAll<HTMLElement>('[data-solution-group-panel]'),
);

const setSolutionGroup = (nextIndex: number): void => {
  solutionGroupTriggers.forEach((trigger, index) =>
    trigger.setAttribute('aria-expanded', String(index === nextIndex)),
  );
  solutionGroupPanels.forEach((panel, index) =>
    panel.toggleAttribute('data-mobile-open', index === nextIndex),
  );
};

solutionGroupTriggers.forEach((trigger, index) => {
  trigger.addEventListener('click', () => setSolutionGroup(index));
});
setSolutionGroup(0);
```

`setMainMenu(false)` 同时调用 `closeSolutions()`；关闭后保持菜单按钮焦点恢复。`setSolutions(true)` 使用以下逻辑展开当前路由所在家族，未匹配时展开第一组：

```ts
const currentGroupIndex = solutionGroupPanels.findIndex((panel) =>
  Boolean(panel.querySelector('[data-solution-option][aria-current="page"]')),
);
setSolutionGroup(currentGroupIndex >= 0 ? currentGroupIndex : 0);
```

- [ ] **Step 5: 写入 58px Header 和折叠家族样式**

在 `@media (max-width: 700px)` 中使用精确合同：

```css
.site-header {
  min-height: 58px;
  padding-inline: 18px;
}
.menu-toggle {
  width: 38px;
  height: 38px;
}
.primary-nav {
  top: 58px;
  max-height: calc(100dvh - 58px);
  padding: 12px 20px 20px;
}
.mega-group-title,
.mega-group > p,
.mega-option-list {
  display: none;
}
.mega-group-trigger {
  display: grid;
  min-height: 52px;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  width: 100%;
}
.mega-group-trigger[aria-expanded='true'] + .mega-option-list {
  display: grid;
}
.mobile-nav-contact {
  display: flex;
  min-height: 48px;
}
```

桌面默认 `.mega-group-trigger, .mobile-nav-contact { display: none; }`，并保持 `.mega-option-list { display: grid; }`。

- [ ] **Step 6: 更新手机导航浏览器测试**

在现有手机 Escape 测试中增加：

```ts
const familyButtons = page.locator('[data-solution-group-trigger]');
await expect(familyButtons).toHaveCount(4);
await expect(familyButtons.first()).toHaveAttribute('aria-expanded', 'true');
await familyButtons.nth(2).click();
await expect(familyButtons.nth(2)).toHaveAttribute('aria-expanded', 'true');
await expect(familyButtons.first()).toHaveAttribute('aria-expanded', 'false');
await expect(page.locator('[data-solution-group-panel]:visible')).toHaveCount(
  1,
);
await expect(page.getByRole('link', { name: /提交项目需求/ })).toBeVisible();
```

另增加 Header 尺寸断言：

```ts
await expect
  .poll(() =>
    page
      .locator('.site-header')
      .evaluate((element) =>
        Math.round(element.getBoundingClientRect().height),
      ),
  )
  .toBe(58);
```

- [ ] **Step 7: 运行导航专项验证并提交**

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "desktop navigation|mobile navigation|solutions menu"`

Expected: 静态合同通过；桌面 24 链接和预览不回归；手机只显示一个家族面板；Escape 后 Body 可滚动且菜单按钮恢复焦点。

```bash
git add src/components/site/SiteHeader.astro src/styles/site-shell.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(site): compact mobile navigation"
```

---

### Task 2: 220px Hero 与首屏四项核心能力

**Files:**

- Create: `src/components/home/MobileCapabilityOverview.astro`
- Modify: `src/data/home.ts:1-39`
- Modify: `src/components/home/HomeHero.astro:1-39`
- Modify: `src/pages/index.astro:1-24`
- Modify: `src/styles/home.css:1-115,438-497`
- Modify: `src/styles/base.css:168-178`
- Modify: `tests/rendered-site.test.ts:39-69`
- Modify: `tests/browser/site-smoke.spec.ts:200-246`

**Interfaces:**

- Consumes: `mobileCapabilities` from `src/data/home.ts`。
- Produces: `[data-mobile-capabilities]`，固定 `430px`；`[data-mobile-delivery-teaser]`，固定 `136px`。
- Produces: `.hero-image--desktop`、`.hero-image--mobile` 和 `.hero-mobile-eyebrow`。
- Preserves: 桌面 Hero 高度、品牌重心、Spline Canvas 和 `/about` CTA。

- [ ] **Step 1: 写入手机首屏失败测试**

在 `tests/browser/site-smoke.spec.ts` 增加：

```ts
test('mobile homepage fits the compact Hero, four capabilities, and delivery teaser in the first viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const metrics = await page.evaluate(() => {
    const header = document
      .querySelector('.site-header')!
      .getBoundingClientRect();
    const hero = document.querySelector('.home-hero')!.getBoundingClientRect();
    const capabilities = document
      .querySelector('[data-mobile-capabilities]')!
      .getBoundingClientRect();
    const teaser = document
      .querySelector('[data-mobile-delivery-teaser]')!
      .getBoundingClientRect();
    return {
      header: Math.round(header.height),
      hero: Math.round(hero.height),
      capabilities: Math.round(capabilities.height),
      teaser: Math.round(teaser.height),
      teaserBottom: Math.round(teaser.bottom),
    };
  });

  expect(metrics).toEqual({
    header: 58,
    hero: 220,
    capabilities: 430,
    teaser: 136,
    teaserBottom: 844,
  });
  await expect(page.locator('[data-mobile-capabilities] a')).toHaveCount(4);
});
```

- [ ] **Step 2: 运行测试并确认缺少手机首屏结构**

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "mobile homepage fits"`

Expected: FAIL，找不到 `[data-mobile-capabilities]`。

- [ ] **Step 3: 创建手机核心能力组件**

先在 `src/data/home.ts` 增加唯一能力摘要数据源：

```ts
export const mobileCapabilities = [
  ['01', 'AI 应用工厂', '/guangtai-ai-factory'],
  ['02', '具身智能', '/solutions/common/embodied-intelligence'],
  ['03', '系统集成', '/solutions/common'],
  ['04', '行业场景', '/solutions/industries'],
] as const;
```

`MobileCapabilityOverview.astro` 导入并渲染它：

```astro
---
import { mobileCapabilities } from '../../data/home';
---

<div class="mobile-home-intro">
  <section
    class="mobile-capabilities"
    data-mobile-capabilities
    aria-labelledby="mobile-capabilities-title"
  >
    <p>CORE CAPABILITIES</p>
    <h2 id="mobile-capabilities-title">四项能力，连接平台、设备与真实场景</h2>
    <nav aria-label="核心能力">
      {
        mobileCapabilities.map(([number, title, href]) => (
          <a href={href}>
            <>
              <span>{number}</span>
              <strong>{title}</strong>
              <i aria-hidden="true">↗</i>
            </>
          </a>
        ))
      }
    </nav>
  </section>
  <a
    class="mobile-delivery-teaser"
    href="#mobile-delivery"
    data-mobile-delivery-teaser
  >
    <span>DELIVERY PATH</span><strong>从能力到项目交付</strong><i
      aria-hidden="true">↓</i
    >
  </a>
</div>
```

在 `index.astro` 中紧接 `<HomeHero />` 渲染该组件。

- [ ] **Step 4: 为 Hero 增加手机专用构图而不改变桌面**

将当前图片标记为 `.hero-image--desktop`，再用同一获批素材生成手机 `780 × 440` 版本：

```astro
<Image
  class="hero-image hero-image--mobile"
  src={hero}
  alt=""
  width={780}
  height={440}
  loading="eager"
/>
<p class="hero-mobile-eyebrow">AI APPLICATION & DIGITAL SOLUTIONS</p>
```

手机隐藏 `.hero-context`、`.hero-actions`、`#ai-canvas`，标题允许两行；桌面隐藏 `.hero-image--mobile` 和 `.hero-mobile-eyebrow`。

- [ ] **Step 5: 写入精确手机尺寸和全局密度样式**

```css
.hero-image--mobile,
.hero-mobile-eyebrow,
.mobile-home-intro {
  display: none;
}

@media (max-width: 700px) {
  .section-pad,
  .inner-section {
    padding-block: 48px;
    padding-inline: 20px;
  }
  .home-hero {
    min-height: 220px;
    height: 220px;
  }
  .hero-image--desktop,
  .hero-context,
  .hero-actions,
  #ai-canvas {
    display: none;
  }
  .hero-image--mobile,
  .hero-mobile-eyebrow,
  .mobile-home-intro {
    display: block;
  }
  .home-hero h1 {
    max-width: 7ch;
    font-size: 29px;
    line-height: 1.14;
    white-space: normal;
  }
  .hero-copy {
    align-content: center;
    padding: 0 20px;
  }
  .mobile-capabilities {
    height: 430px;
    padding: 28px 20px 24px;
  }
  .mobile-capabilities a {
    min-height: 58px;
  }
  .mobile-delivery-teaser {
    display: grid;
    height: 136px;
    padding: 24px 20px;
  }
}
```

- [ ] **Step 6: 扩展静态合同并运行桌面回归**

在首页渲染测试中断言四个链接和手机 Hero 图片存在，同时保留现有桌面标题、文案、Spline 和 `/about` CTA 断言。

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "homepage centers|mobile homepage fits|chapter signposts"`

Expected: 手机尺寸合同通过；桌面 Hero 重心仍位于 `42%–60%`。

- [ ] **Step 7: 提交首屏改造**

```bash
git add src/components/home/MobileCapabilityOverview.astro src/data/home.ts src/components/home/HomeHero.astro src/pages/index.astro src/styles/home.css src/styles/base.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(home): build compact mobile first viewport"
```

---

### Task 3: 手机首页交付、场景、项目与伙伴节奏

**Files:**

- Create: `src/components/home/MobileDeliverySection.astro`
- Create: `src/components/home/MobileScenarioSection.astro`
- Create: `src/components/home/MobileProjectSection.astro`
- Modify: `src/data/home.ts:1-39`
- Modify: `src/components/home/CaseSection.astro:1-35`
- Modify: `src/pages/index.astro:1-24`
- Modify: `src/styles/home.css:116-497`
- Modify: `src/styles/inner-page.css:574-605,741-747`
- Modify: `tests/rendered-site.test.ts:83-107,161-169`
- Modify: `tests/browser/site-smoke.spec.ts:188-198,226-246`

**Interfaces:**

- Produces: `mobileDeliverySteps`、`mobileScenarioLinks`、`projectTypes` from `src/data/home.ts`。
- Produces: `#mobile-delivery`、`[data-mobile-scenario]`、`[data-mobile-projects]`、`[data-mobile-partners]`。
- Consumes: `partners` from `src/data/partners.ts`；不复制伙伴名称或 Logo 路径。
- Preserves: 桌面 Factory、Embodied、Partner、Solution、Education、Technology、Cases 的现有顺序和内容。

- [ ] **Step 1: 写入手机叙事结构的失败合同**

在渲染测试中增加：

```ts
it('renders the compact mobile delivery, scenario, project, and partner flow from real data', async () => {
  const homepage = await readFile(resolve('dist/index.html'), 'utf8');

  expect(homepage).toContain('id="mobile-delivery"');
  expect(homepage).toContain('data-mobile-scenario');
  expect(homepage).toContain('data-mobile-projects');
  expect(homepage).toContain('data-mobile-partners');
  expect(homepage).toContain('需求与场景定义');
  expect(homepage).toContain('平台与系统建设');
  expect(homepage).toContain('运营与持续优化');
});
```

- [ ] **Step 2: 运行合同并确认红灯**

Run: `npm run build && npm run test:rendered`

Expected: FAIL，缺少 `mobile-delivery` 和三个手机区块标记。

- [ ] **Step 3: 集中首页手机数据**

在 `src/data/home.ts` 增加并让 `CaseSection.astro` 复用 `projectTypes`：

```ts
export const mobileDeliverySteps = [
  ['需求与场景定义', '明确目标、使用角色、既有系统与验收边界。'],
  ['平台与系统建设', '组合 AI、软件、设备与空间能力，完成实施联调。'],
  ['运营与持续优化', '以真实使用反馈持续评估、迭代和优化。'],
] as const;

export const mobileScenarioLinks = [
  ['AI 与具身智能', '/solutions/common/ai'],
  ['通用方案', '/solutions/common'],
  ['高校场景', '/solutions/industries/higher-education'],
  ['中小学场景', '/solutions/industries/k12'],
] as const;

export const projectTypes = [
  ['校园AI智能体', '知识库、教师助手、学习服务与管理流程智能体。'],
  [
    '具身智能实训与巡检',
    '人形、四足与轮式设备的任务编排、数据回传和运行管理。',
  ],
  [
    '智能空间与系统集成',
    '会议、报告、展示、安防、机房与业务系统的一体化建设。',
  ],
] as const;
```

- [ ] **Step 4: 创建三个职责单一的手机区块**

`MobileDeliverySection.astro` 输出深蓝三步列表：

```astro
<section
  id="mobile-delivery"
  class="mobile-delivery"
  aria-labelledby="mobile-delivery-title"
>
  <p>DELIVERY PATH</p><h2 id="mobile-delivery-title">
    把技术能力变成可验收的项目
  </h2>
  <ol>
    {
      mobileDeliverySteps.map(([title, text], index) => (
        <li>
          <>
            <span>0{index + 1}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </>
        </li>
      ))
    }
  </ol>
</section>
```

`MobileScenarioSection.astro` 使用 `/assets/embodied-intelligence.png` 作为唯一重点图，链接到 `/solutions/common/embodied-intelligence`，下方渲染四个 `mobileScenarioLinks` 横向入口。

`MobileProjectSection.astro` 使用 `projectTypes` 输出紧凑编号列表，并用 `partners` 输出手动横滑、`scroll-snap-type: x mandatory` 的 Logo 轨道；不得使用 `data-partner-track`，避免 GSAP 自动轮播。

- [ ] **Step 5: 在手机首屏后按批准顺序渲染**

`index.astro` 顺序为：

```astro
<HomeHero />
<MobileCapabilityOverview />
<MobileDeliverySection />
<MobileScenarioSection />
<MobileProjectSection />
<FactorySection /><EmbodiedSection /><PartnerMarquee /><SolutionSplit />
<EducationSection /><TechnologySection /><CaseSection />
<ProjectCta />
```

- [ ] **Step 6: 设置手机专用节奏并隐藏桌面长区块**

桌面默认 `.mobile-delivery, .mobile-scenario, .mobile-projects { display: none; }`。在 `max-width: 700px` 下显示它们，并隐藏 `.factory, .embodied, .partner-marquee, .solutions, .education, .technology, .cases`。

具体合同：交付区 `padding: 48px 20px`；重点场景图片 `aspect-ratio: 4 / 3`；分类入口横滑且下一项至少露出 `28px`；项目列表不设卡片最小高度；伙伴 Logo 轨道只允许用户手动滚动；任何横滑容器不得改变页面高度或阻断纵向滚动。

共享 `.inner-cta` 在手机端改为：

```css
.inner-cta {
  min-height: 220px;
  padding: 36px 20px;
}
.inner-cta h2 {
  font-size: 29px;
}
.inner-cta a {
  width: 100%;
  min-height: 48px;
}
```

- [ ] **Step 7: 增加手机顺序与无溢出浏览器测试**

```ts
test('mobile homepage uses the approved delivery-to-partner sequence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const order = await page
    .locator('main > :visible')
    .evaluateAll((elements) =>
      elements.map((element) => element.id || [...element.classList].join('.')),
    );
  expect(order.join('|')).toMatch(
    /home.*mobile-home-intro.*mobile-delivery.*mobile-scenario.*mobile-projects.*inner-cta/,
  );
  await expect(page.locator('[data-mobile-partners] a')).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
```

- [ ] **Step 8: 运行首页专项验证并提交**

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "homepage|partner|project CTA"`

Expected: 手机专用区块按批准顺序可见且无横向页面溢出；桌面七个章节标识和八伙伴轮播保持原样。

```bash
git add src/components/home/MobileDeliverySection.astro src/components/home/MobileScenarioSection.astro src/components/home/MobileProjectSection.astro src/data/home.ts src/components/home/CaseSection.astro src/pages/index.astro src/styles/home.css src/styles/inner-page.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(home): reshape mobile content rhythm"
```

---

### Task 4: 230px 内页 Hero、46px 章节导航与手机能力折叠

**Files:**

- Modify: `src/components/pages/InnerHero.astro:1-43`
- Modify: `src/components/pages/CapabilityNavigator.astro:1-152`
- Modify: `src/styles/inner-page.css:1-228,633-748`
- Modify: `tests/rendered-site.test.ts:109-137`
- Modify: `tests/browser/site-smoke.spec.ts:364-499`

**Interfaces:**

- Produces: `.inner-hero--contact`、`[data-mobile-capability-accordion]`、`[data-mobile-capability-trigger]`、`[data-mobile-capability-panel]`。
- Preserves: 桌面 `role="tablist"`、`role="tab"`、`role="tabpanel"` 和 hover/focus/箭头键行为。
- Mobile contract: 每次只展开一个能力，按钮最小 `52px`，使用 `aria-expanded` 与 `aria-controls`。

- [ ] **Step 1: 写入移动内页尺寸和折叠行为失败测试**

```ts
test('mobile inner page reaches an accessible capability accordion in the first viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');

  await expect
    .poll(() =>
      page
        .locator('.inner-hero')
        .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
    )
    .toBe(230);
  await expect
    .poll(() =>
      page
        .locator('.chapter-nav')
        .evaluate((el) => Math.round(el.getBoundingClientRect().height)),
    )
    .toBe(46);
  const accordion = page.locator('[data-mobile-capability-accordion]');
  await expect(accordion).toBeVisible();
  expect(
    await accordion.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeLessThan(844);

  const triggers = accordion.locator('[data-mobile-capability-trigger]');
  await expect(triggers).toHaveCount(4);
  await triggers.nth(1).click();
  await expect(triggers.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expect(triggers.first()).toHaveAttribute('aria-expanded', 'false');
  await expect(
    accordion.locator('[data-mobile-capability-panel]:visible'),
  ).toHaveCount(1);
});
```

- [ ] **Step 2: 运行测试并确认红灯**

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "mobile inner page reaches"`

Expected: FAIL，Hero 约 `672px` 且不存在手机折叠结构。

- [ ] **Step 3: 为 Hero 增加联系页变体和紧凑上下文**

`InnerHero.astro` 的根类改为：

```astro
<section
  class:list={[
    'inner-hero',
    { 'inner-hero--contact': page.path === '/contact' },
  ]}
>
</section>
```

手机端保留 `h1`、两行以内 `.inner-lead` 和紧凑面包屑；隐藏 `.inner-hero-button` 与 `.inner-hero-index`。普通 Hero `height/min-height: 230px`，联系 Hero `180px`，图片继续 eager 加载。

- [ ] **Step 4: 在同一数据源上渲染手机折叠列表**

在现有桌面 Tab 之后增加：

```astro
<div class="mobile-capability-accordion" data-mobile-capability-accordion>
  {
    items.map((item, index) => (
      <section>
        <button
          type="button"
          aria-expanded={index === 0 ? 'true' : 'false'}
          aria-controls={`${item.id}-mobile-panel`}
          id={`${item.id}-mobile-trigger`}
          data-mobile-capability-trigger={index}
        >
          <>
            <span>{item.number}</span>
            <strong>{item.title}</strong>
            <i aria-hidden="true">+</i>
          </>
        </button>
        <div
          id={`${item.id}-mobile-panel`}
          aria-labelledby={`${item.id}-mobile-trigger`}
          hidden={index !== 0}
          data-mobile-capability-panel={index}
        >
          <>
            <h2>{item.headline}</h2>
            <p>{item.copy}</p>
          </>
        </div>
      </section>
    ))
  }
</div>
```

- [ ] **Step 5: 实现单选折叠初始化和 ClientRouter 回访**

```ts
const initializeMobileAccordion = (accordion: HTMLElement): void => {
  if (accordion.dataset.mobileAccordionInitialized) return;
  accordion.dataset.mobileAccordionInitialized = 'true';
  const triggers = Array.from(
    accordion.querySelectorAll<HTMLButtonElement>(
      '[data-mobile-capability-trigger]',
    ),
  );
  const panels = Array.from(
    accordion.querySelectorAll<HTMLElement>('[data-mobile-capability-panel]'),
  );
  const activate = (nextIndex: number): void => {
    triggers.forEach((trigger, index) =>
      trigger.setAttribute('aria-expanded', String(index === nextIndex)),
    );
    panels.forEach((panel, index) => {
      panel.hidden = index !== nextIndex;
    });
  };
  triggers.forEach((trigger, index) =>
    trigger.addEventListener('click', () => activate(index)),
  );
};
```

与现有初始化一样，在初次加载和 `astro:page-load` 后查找并初始化。

- [ ] **Step 6: 写入内页手机尺寸样式**

```css
@media (max-width: 700px) {
  .inner-hero {
    height: 230px;
    min-height: 230px;
  }
  .inner-hero--contact {
    height: 180px;
    min-height: 180px;
  }
  .inner-hero-copy {
    padding-top: 28px;
  }
  .inner-hero h1 {
    font-size: 29px;
  }
  .inner-lead {
    max-width: 34ch;
    font-size: 14px;
    line-height: 1.5;
  }
  .inner-hero-button,
  .inner-hero-index {
    display: none;
  }
  .chapter-nav {
    top: 58px;
    height: 46px;
    padding: 0 20px;
    align-items: center;
  }
  .value-tags,
  .inner-intro-copy {
    display: none;
  }
  .inner-intro {
    display: block;
  }
  .mobile-capability-accordion {
    display: block;
  }
  .mobile-capability-accordion button {
    min-height: 52px;
    width: 100%;
  }
}
```

桌面默认 `.mobile-capability-accordion { display: none; }`。

- [ ] **Step 7: 更新静态与桌面回归合同**

静态测试断言手机按钮有 `aria-expanded`/`aria-controls`，并继续断言桌面 Tab 语义存在。桌面 Playwright 测试保持四个 Tab、唯一选中项、hover/focus 和 panel 关联不变。

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "representative overview|breadcrumbs|capability"`

Expected: 普通内页首屏出现第一条能力折叠；桌面 Tab 无回归；320px 无横向溢出。

- [ ] **Step 8: 提交内页改造**

```bash
git add src/components/pages/InnerHero.astro src/components/pages/CapabilityNavigator.astro src/styles/inner-page.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(site): compact mobile inner pages"
```

---

### Task 5: 首屏联系表单与三个折叠页脚分组

**Files:**

- Modify: `src/components/pages/PageTemplate.astro:34-69,102`
- Modify: `src/components/pages/ContactForm.astro:1-78`
- Modify: `src/components/site/SiteFooter.astro:1-22`
- Modify: `src/styles/inner-page.css:341-389,649-748`
- Modify: `src/styles/site-shell.css:237-373`
- Modify: `tests/rendered-site.test.ts:153-169`
- Modify: `tests/browser/site-smoke.spec.ts:519-539`

**Interfaces:**

- Produces: `.contact-intro`、`[data-field-error]`、`validateField(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean`。
- Produces: 三个 `.footer-group` 原生 `<details>` 和 `[data-footer-contact]`。
- Preserves: 无后端时只显示 `unconfigured`；不得显示“提交成功”或“已发送”。

- [ ] **Step 1: 写入联系页首屏、字段错误和页脚合同失败测试**

在静态测试中增加：

```ts
expect(contactHtml).toContain('data-field-error');
expect(contactHtml).toContain('novalidate');
const homepage = await readFile(resolve('dist/index.html'), 'utf8');
expect(homepage.match(/class="footer-group"/g)).toHaveLength(3);
expect(homepage).toContain('data-footer-contact');
expect(homepage).not.toMatch(/ICP备案|法律声明/);
```

浏览器测试增加空表单提交断言，并测量表单顶部：

```ts
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('/contact/');
const form = page.locator('[data-project-contact-form]');
expect(
  await form.evaluate((el) => el.getBoundingClientRect().top),
).toBeLessThan(844);
await form.locator('button[type="submit"]').click();
await expect(form.locator('[data-field-error]').first()).toContainText(
  '请输入姓名',
);
await expect(form.getByLabel('姓名')).toHaveAttribute('aria-invalid', 'true');
```

- [ ] **Step 2: 运行联系与页脚测试并确认红灯**

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "contact project form|mobile footer"`

Expected: FAIL，缺少字段错误、三个 footer group，表单顶部不在首屏。

- [ ] **Step 3: 压缩联系页介绍并保持表单首屏可见**

给联系页介绍区增加 `.contact-intro`；手机端使用 `padding: 28px 20px 20px`，隐藏重复的 `.section-kicker p`，标题控制为 `25px`、两行以内。联系 Hero `180px` + Header `58px` + Chapter Nav `46px` + 紧凑介绍后，表单标题与首个字段必须在 `844px` 内出现。

- [ ] **Step 4: 为每个字段输出关联错误区域**

表单增加 `novalidate`，所有字段都使用同一结构。字段 id、错误 id 和布局类固定为：`name/name-error`、`organization/organization-error`、`contact/contact-error/contact-form-contact`、`projectType/project-type-error`、`timeline/timeline-error`、`message/message-error/contact-form-message`。姓名字段示例：

```astro
<label>
  <span>姓名</span>
  <input
    name="name"
    required
    autocomplete="name"
    aria-describedby="name-error"
  />
  <small id="name-error" data-field-error="name"></small>
</label>
```

联系方式标签增加 `.contact-form-contact`，需求描述保持 `.contact-form-message`。

- [ ] **Step 5: 实现字段级校验和真实未配置状态**

```ts
type ContactControl =
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const requiredMessages: Record<string, string> = {
  name: '请输入姓名',
  organization: '请输入单位',
  contact: '请输入联系方式',
  projectType: '请选择项目类型',
  timeline: '请选择计划时间',
  message: '请至少输入 10 个字的需求描述',
};

const validateField = (control: ContactControl): boolean => {
  const error = form.querySelector<HTMLElement>(
    `[data-field-error="${control.name}"]`,
  );
  const valid = control.validity.valid;
  control.setAttribute('aria-invalid', String(!valid));
  if (error)
    error.textContent = valid
      ? ''
      : (requiredMessages[control.name] ?? '请检查此字段');
  return valid;
};
```

提交时验证所有控件，首个错误字段获得焦点；全部合法后仅设置 `status.dataset.state = 'unconfigured'` 和“联系渠道尚未配置，请稍后联系。”。每个字段在 `input`/`change` 时重新校验，不增加成功或网络分支。

- [ ] **Step 6: 保持短字段两列、联系方式与描述通栏**

手机 `.project-contact-form` 保持两列；`.contact-form-contact`、`.contact-form-message`、`.contact-form-action` 跨两列。控件最小高 `44px`，提交按钮 `48px`，320px 下名称、单位、项目类型和计划时间仍为两列，文字允许换行且不溢出。

- [ ] **Step 7: 将页脚改为三个原生折叠分组**

`SiteFooter.astro` 使用真实路由建立：

```ts
const footerGroups = [
  {
    title: '核心业务',
    links: [
      ['AI应用工厂', '/guangtai-ai-factory'],
      ['案例与客户', '/cases'],
    ],
  },
  {
    title: '解决方案',
    links: [
      ['通用解决方案', '/solutions/common'],
      ['行业解决方案', '/solutions/industries'],
    ],
  },
  {
    title: '了解光泰',
    links: [
      ['关于光泰', '/about'],
      ['联系我们', '/contact'],
    ],
  },
] as const;
```

每组渲染 `<details class="footer-group" open>`；手机初始化时移除 `open`，桌面保持 `open`。项目联系作为独立可见链接：

```astro
<a class="footer-contact" href="/contact" data-footer-contact
  >提交项目需求 <span>↗</span></a
>
```

页脚脚本按断点同步原生折叠状态，并用全局生命周期标记保证 ClientRouter 回访时只注册一次监听：

```ts
declare global {
  interface Window {
    footerGroupsLifecycleReady?: boolean;
  }
}

const footerQuery = window.matchMedia('(max-width: 700px)');
const syncFooterGroups = (mobile: boolean): void => {
  document
    .querySelectorAll<HTMLDetailsElement>('.footer-group')
    .forEach((group) => {
      group.open = !mobile;
    });
};
syncFooterGroups(footerQuery.matches);
if (!window.footerGroupsLifecycleReady) {
  window.footerGroupsLifecycleReady = true;
  footerQuery.addEventListener('change', (event) =>
    syncFooterGroups(event.matches),
  );
  document.addEventListener('astro:page-load', () =>
    syncFooterGroups(footerQuery.matches),
  );
}
```

保留现有真实版权句，不添加备案号或法律链接。

- [ ] **Step 8: 添加页脚手机交互测试**

```ts
test('mobile footer exposes three collapsed groups and visible project contact', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const footer = page.locator('.site-footer');
  const groups = footer.locator('details.footer-group');
  await expect(groups).toHaveCount(3);
  await expect(groups.first()).not.toHaveAttribute('open', '');
  await groups.first().locator('summary').click();
  await expect(groups.first()).toHaveAttribute('open', '');
  await expect(footer.locator('[data-footer-contact]')).toBeVisible();
});
```

- [ ] **Step 9: 运行专项验证并提交**

Run: `npm run build && npm run test:rendered`

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "contact project form|mobile footer"`

Expected: 字段错误与字段关联；表单首屏出现；有效表单只报告未配置；页脚三组默认收起且项目联系/版权可见。

```bash
git add src/components/pages/PageTemplate.astro src/components/pages/ContactForm.astro src/components/site/SiteFooter.astro src/styles/inner-page.css src/styles/site-shell.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(site): refine mobile contact and footer"
```

---

### Task 6: 手机动效性能、全视口截图与最终验证

**Files:**

- Modify: `src/scripts/site-motion.ts:10-69`
- Modify: `src/components/home/DataNetwork.astro:12-26`
- Modify: `src/styles/base.css:156-195`
- Modify: `tests/browser/site-smoke.spec.ts:1-570`
- Modify: `说明文档.md`

**Interfaces:**

- Produces: 可见元素过滤和 `compactMotion` 分支；手机 reveal 使用 `y: 12`、`duration: 0.35`、`start: 'top 94%'`。
- Preserves: 桌面 reveal `y: 28`、`duration: 0.65`、伙伴自动轮播和 ClientRouter 清理生命周期。
- Mobile performance: 不初始化 Spline、DataNetwork Canvas 或隐藏的桌面伙伴轨道。

- [ ] **Step 1: 扩展视口和减少动态效果失败测试**

将截图视口改为批准的五组：

```ts
const approvedViewports = [
  { name: 'mobile-320x700', width: 320, height: 700 },
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];
```

在 390 宽度断言不存在已初始化 Canvas：

```ts
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('/');
await expect(page.locator('#ai-canvas')).toHaveJSProperty('width', 300);
await expect(page.locator('spline-viewer')).toHaveCount(0);
```

这里 `300` 是未初始化 Canvas 的浏览器默认宽度；桌面现有测试继续断言 Canvas 匹配 `1440`。

- [ ] **Step 2: 运行动效测试并确认手机 Canvas 仍初始化**

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "reduced-motion|sitewide motion|approved responsive"`

Expected: FAIL，手机 Canvas 宽度被 `initDataNetwork` 改写。

- [ ] **Step 3: 跳过手机 Canvas 初始化**

在 `initializeDataNetwork` 中先清理旧循环，再检查：

```ts
const canvas = document.querySelector<HTMLCanvasElement>('#ai-canvas');
const isMobile = window.matchMedia('(max-width: 700px)').matches;
window.dataNetworkCleanup =
  !isMobile && canvas ? initDataNetwork(canvas) : undefined;
```

这样从桌面切到手机或 ClientRouter 回访时不会遗留动画循环。

- [ ] **Step 4: 让 GSAP 只处理当前响应式可见内容**

```ts
const compactMotion = window.matchMedia('(max-width: 700px)').matches;
const allReveals = Array.from(
  document.querySelectorAll<HTMLElement>('[data-reveal]'),
);
if (reduceMotion) {
  allReveals.forEach((element) => element.classList.add('is-visible'));
  cleanup = undefined;
  return;
}
const reveals = allReveals.filter((element) => element.offsetParent !== null);

const revealFrom = { autoAlpha: 0, y: compactMotion ? 12 : 28 };
const revealTo = {
  autoAlpha: 1,
  y: 0,
  duration: compactMotion ? 0.35 : 0.65,
  scrollTrigger: {
    trigger: element,
    start: compactMotion ? 'top 94%' : 'top 88%',
    once: true,
  },
};
```

只有当 `track.offsetParent !== null` 时创建桌面伙伴 tween。`prefers-reduced-motion` 仍立即为所有 `[data-reveal]` 添加 `.is-visible`。

- [ ] **Step 5: 为三类页面生成五视口截图**

截图测试遍历 `/`、`/solutions/common/embodied-intelligence/`、`/contact/`，文件名使用 `home-mobile-390x844.png`、`detail-mobile-390x844.png`、`contact-mobile-390x844.png` 格式。每次截图前断言：

```ts
expect(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
).toBe(true);
await expect(page.locator('h1')).toBeVisible();
```

Run: `npx playwright test tests/browser/site-smoke.spec.ts --grep "approved responsive viewports"`

Expected: 15 张截图生成，无横向页面滚动，无运行时错误。

- [ ] **Step 6: 人工检查关键截图**

用本地图片查看工具逐张检查至少以下六张：390 首页、320 首页、390 典型内页、320 典型内页、390 联系页、1440 首页。逐项确认：文字不遮挡、最长标题不溢出、Hero 裁切保留右侧主体和左侧文字、横滑区露出下一项、表单两列可读、桌面布局未变。

发现任一问题时只修改对应组件或样式，重新运行该路由的截图测试；不得通过放宽无溢出、尺寸或可见性断言掩盖问题。

- [ ] **Step 7: 运行完整质量门禁**

Run: `npm run format:check`

Expected: 所有项目文件符合 Prettier。

Run: `npm run check`

Expected: Astro/TypeScript `0 errors`。

Run: `npm test`

Expected: 单元与内容测试全部通过。

Run: `npm run build && npm run test:rendered`

Expected: 首页、29 个内容路由和 404 页面构建，渲染合同全部通过。

Run: `npm run test:e2e:run`

Expected: 所有 Playwright 测试通过，包含五视口与三路由截图。

Run: `npm run verify`

Expected: 完整串行门禁退出码 `0`。若既有首页回访动效时序用例再次波动，必须单独复跑并记录实际输出，不得把失败写成通过。

- [ ] **Step 8: 更新项目说明并提交最终验证**

在 `说明文档.md` 中：将移动端重构标记为已实施；记录各视口、测试数量、截图复核结果；保留任何真实失败或环境限制；明确未新增表单后端、备案号或法律链接。

```bash
git add src/scripts/site-motion.ts src/components/home/DataNetwork.astro src/styles/base.css tests/browser/site-smoke.spec.ts 说明文档.md
git commit -m "test(site): verify mobile visual redesign"
```

- [ ] **Step 9: 最终范围审查**

Run: `git diff origin/main...HEAD --stat`

Run: `git diff origin/main...HEAD --check`

Run: `git status --short --branch`

Expected: 只有本计划列出的源文件、测试和文档发生变化；`.superpowers/`、旧计划、Logo ZIP 和 Logo 目录保持未跟踪且未提交；分支不包含生成截图或 Playwright 报告。
