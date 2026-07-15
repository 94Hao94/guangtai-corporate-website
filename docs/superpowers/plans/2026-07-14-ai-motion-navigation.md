# AI 首页、导航与合作伙伴动效 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将具身智能与 AI 提升为首页首要业务，以合作伙伴轮播、GSAP 动效、明确 CTA 路由反馈和可预览的解决方案菜单改善企业官网体验。

**Architecture:** Astro 继续负责静态内容和路由；`ClientRouter` 负责同源页面转场，GSAP Core 与 ScrollTrigger 只管理可清理的局部动效。站点头部从静态三列菜单重构为基于现有 `SitePage` 内容的选择列表与预览面板；合作伙伴数据和 Logo 资产独立于首页组件。

**Tech Stack:** Astro 7、TypeScript、GSAP、ScrollTrigger、Astro ClientRouter、Playwright、Vitest。

---

## 文件结构

| 文件                                        | 职责                                                    |
| ------------------------------------------- | ------------------------------------------------------- |
| `src/data/partners.ts`                      | 八家合作伙伴的名称、官网、Logo 路径和可访问替代文本。   |
| `src/components/home/PartnerMarquee.astro`  | 合作伙伴无缝轨道的语义结构和可访问文本回退。            |
| `src/components/site/RouteTransition.astro` | 持久化的页面转场帷幕。                                  |
| `src/scripts/site-motion.ts`                | GSAP、ScrollTrigger、头部菜单和转场状态的初始化与清理。 |
| `src/components/site/SiteHeader.astro`      | 当前路由状态、四个解决方案入口、菜单预览与无障碍交互。  |
| `src/layouts/BaseLayout.astro`              | `ClientRouter`、持久化帷幕和页面进入初始化。            |
| `src/pages/index.astro`                     | 将具身智能区与合作伙伴区提前。                          |
| `src/styles/base.css`                       | 按钮、转场和 `data-reveal` 的 GSAP 兼容样式。           |
| `src/styles/site-shell.css`                 | 头部、Mega Menu、预览和选中态。                         |
| `src/styles/home.css`                       | 合作伙伴轨道和具身智能区动效锚点。                      |
| `tests/browser/site-smoke.spec.ts`          | 菜单、路由反馈、合作伙伴与减少动态效果场景。            |

### Task 1: 固化交互验收测试

**Files:**

- Modify: `tests/browser/site-smoke.spec.ts`

- [x] **Step 1: 为桌面菜单写失败测试**

  添加以下测试，使用可稳定定位的 `data-*` 属性而不是菜单文案结构：

  ```ts
  test('solutions menu previews the focused option and exposes the current route', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/solutions/common/embodied-intelligence/');

    const trigger = page.locator('[data-solutions-trigger]');
    await trigger.hover();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const menu = page.locator('[data-solutions-mega-menu]');
    const embodied = menu.locator(
      '[data-solution-option="/solutions/common/embodied-intelligence"]',
    );
    await expect(embodied).toHaveAttribute('aria-current', 'page');

    const higher = menu.locator(
      '[data-solution-option="/solutions/industries/higher-education"]',
    );
    await higher.hover();
    await expect(menu.locator('[data-solution-preview-title]')).toHaveText(
      '高校场景解决方案',
    );
  });
  ```

- [x] **Step 2: 运行测试并确认失败**

  Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "solutions menu previews"`

  Expected: FAIL，因为当前头部没有 `data-solutions-mega-menu`、方案预览和当前路径状态。

- [x] **Step 3: 为 CTA 路由反馈与合作伙伴区写失败测试**

  添加以下断言：

  ```ts
  test('CTA reports navigation intent and the partner marquee is accessible', async ({
    page,
  }) => {
    await page.goto('/');

    const cta = page.locator('[data-route-cta]').first();
    await cta.click();
    await expect(page.locator('[data-route-transition]')).toHaveAttribute(
      'data-state',
      'leaving',
    );
    await expect(page).toHaveURL(/guangtai-ai-factory/);

    await page.goto('/');
    const partners = page.locator('[data-partner-marquee]');
    await expect(partners.getByRole('link')).toHaveCount(8);
    await expect(partners).toHaveAttribute('aria-label', '合作伙伴');
  });
  ```

- [x] **Step 4: 运行测试并确认失败**

  Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "CTA reports"`

  Expected: FAIL，因为首页尚无合作伙伴轨道且 CTA 未暴露导航意图状态。

- [ ] **Step 5: 提交测试基线**

  ```bash
  git add tests/browser/site-smoke.spec.ts
  git commit -m "test(motion): define navigation interaction contract"
  ```

### Task 2: 引入 GSAP 与可清理的站点动效初始化

**Files:**

- Modify: `package.json`
- Create: `src/scripts/site-motion.ts`
- Modify: `src/styles/base.css`

- [x] **Step 1: 安装运行时依赖**

  Run: `npm install gsap@^3.13.0`

  Expected: `package.json` 的 `dependencies` 包含 `gsap`，并更新锁文件。

- [x] **Step 2: 创建站点动效模块**

  创建 `src/scripts/site-motion.ts`，导出唯一入口与清理函数：

  ```ts
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  let cleanup: (() => void) | undefined;

  export function initSiteMotion(): () => void {
    cleanup?.();
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]'),
    );

    if (reduceMotion) {
      revealTargets.forEach((target) => target.classList.add('is-visible'));
      return () => undefined;
    }

    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      revealTargets.forEach((target, index) => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.65,
            delay: Math.min(index * 0.04, 0.2),
            ease: 'power2.out',
            scrollTrigger: { trigger: target, start: 'top 88%', once: true },
          },
        );
      });
    });

    cleanup = () => context.revert();
    return cleanup;
  }
  ```

- [x] **Step 3: 调整基础 reveal 样式，避免 CSS 与 GSAP 双重过渡**

  在 `src/styles/base.css` 中保留无 JavaScript 回退，但移除 `[data-reveal]` 的 CSS transition；由 `is-visible` 与 GSAP 统一控制：

  ```css
  [data-reveal] {
    opacity: 0;
    transform: translateY(1.75rem);
  }

  [data-reveal].is-visible,
  .no-js [data-reveal] {
    opacity: 1;
    transform: none;
  }
  ```

- [x] **Step 4: 运行类型和格式检查**

  Run: `npm run format:check && npm run check`

  Expected: PASS。

- [ ] **Step 5: 提交 GSAP 基础设施**

  ```bash
  git add package.json package-lock.json src/scripts/site-motion.ts src/styles/base.css
  git commit -m "feat(motion): add GSAP site animation foundation"
  ```

### Task 3: 建立 CTA 与 Astro 页面转场反馈

**Files:**

- Create: `src/components/site/RouteTransition.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/home/HomeHero.astro`
- Modify: `src/components/home/ProjectCta.astro`
- Modify: `src/components/site/ContactCta.astro`
- Modify: `src/scripts/site-motion.ts`
- Modify: `src/styles/base.css`

- [x] **Step 1: 创建持久化转场帷幕组件**

  ```astro
  <div
    data-route-transition
    data-state="idle"
    aria-live="polite"
    aria-label="页面正在切换"
    transition:persist
  >
    <span data-route-transition-label>正在进入页面</span>
  </div>
  ```

- [x] **Step 2: 在基础布局启用 ClientRouter 并挂载帷幕**

  在 `BaseLayout.astro` 导入并插入：

  ```astro
  ---
  import { ClientRouter } from 'astro:transitions';
  import RouteTransition from '../components/site/RouteTransition.astro';
  ---

  <body>
    <RouteTransition />
    <SiteHeader pages={pages} /><slot /><SiteFooter />
    <ClientRouter />
  </body>
  ```

- [x] **Step 3: 为所有站内 CTA 标记统一契约**

  将 Hero、项目咨询和内页咨询链接统一为：

  ```astro
  <a class="button button-primary" data-route-cta href="/guangtai-ai-factory">
    了解AI应用工厂 <span aria-hidden="true">→</span>
  </a>
  ```

  `ProjectCta.astro` 和 `ContactCta.astro` 的 CTA 同样增加 `data-route-cta`，但保留原有 href 与可见文案。

- [x] **Step 4: 在 `site-motion.ts` 中绑定转场生命周期**

  增加以下逻辑：只处理没有 modifier、不是外链、不是锚点、不是下载链接、不是 `_blank` 的 `data-route-cta`。

  ```ts
  function initRouteFeedback(): () => void {
    const curtain = document.querySelector<HTMLElement>(
      '[data-route-transition]',
    );
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        '[data-route-cta]',
      );
      if (
        !link ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (link.target || link.href.startsWith('mailto:') || link.hash) return;
      curtain?.setAttribute('data-state', 'leaving');
      curtain
        ?.querySelector('[data-route-transition-label]')
        ?.replaceChildren('正在进入 ' + link.textContent?.trim());
    };
    const onPageLoad = () => curtain?.setAttribute('data-state', 'idle');
    document.addEventListener('click', onClick);
    document.addEventListener('astro:page-load', onPageLoad);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('astro:page-load', onPageLoad);
    };
  }
  ```

  在 `initSiteMotion()` 中组合并返回 `initRouteFeedback()` 的清理函数。

- [x] **Step 5: 添加帷幕与按钮状态样式**

  在 `base.css` 中添加：

  ```css
  [data-route-transition] {
    position: fixed;
    z-index: 100;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    color: #fff;
    background: var(--blue-950);
    opacity: 0;
    transform: translateY(-100%);
  }

  [data-route-transition][data-state='leaving'] {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 120ms ease,
      transform 240ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }

  [data-route-cta]:active {
    transform: scale(0.98);
  }
  [data-route-cta] span {
    transition: transform 160ms ease;
  }
  [data-route-cta]:hover span {
    transform: translateX(0.3rem);
  }
  ```

- [x] **Step 6: 运行 CTA Playwright 测试**

  Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "CTA reports"`

  Expected: PASS。

- [ ] **Step 7: 提交 CTA 与路由反馈**

  ```bash
  git add src/components/site/RouteTransition.astro src/layouts/BaseLayout.astro src/components/home/HomeHero.astro src/components/home/ProjectCta.astro src/components/site/ContactCta.astro src/scripts/site-motion.ts src/styles/base.css
  git commit -m "feat(navigation): add CTA route feedback"
  ```

### Task 4: 重构解决方案 Mega Menu

**Files:**

- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/styles/site-shell.css`
- Modify: `src/scripts/site-motion.ts`
- Modify: `tests/browser/site-smoke.spec.ts`

- [x] **Step 1: 生成四个明确的菜单入口**

  在 `SiteHeader.astro` 中定义：

  ```ts
  const embodied = pages.find(
    (page) => page.path === '/solutions/common/embodied-intelligence',
  );
  const solutionEntries = [
    embodied,
    pages.find((page) => page.path === '/solutions/common'),
    pages.find(
      (page) => page.path === '/solutions/industries/higher-education',
    ),
    pages.find((page) => page.path === '/solutions/industries/k12'),
  ].filter((page): page is SitePage => Boolean(page));
  const pathname = Astro.url.pathname.replace(/\/$/, '') || '/';
  ```

- [x] **Step 2: 替换菜单标记**

  菜单容器必须使用以下选择器和属性：

  ```astro
  <div class="mega-menu" id="solutions-mega-menu" data-solutions-mega-menu>
    <div class="mega-option-list" role="listbox" aria-label="解决方案分类">
      {
        solutionEntries.map((entry, index) => (
          <a
            href={entry.path}
            data-solution-option={entry.path}
            aria-current={pathname === entry.path ? 'page' : undefined}
            data-preview-title={entry.title}
            data-preview-copy={entry.intro}
            data-preview-image={entry.hero}
          >
            <>
              <span>0{index + 1}</span>
              <b>{index === 0 ? '具身智能与 AI' : entry.title}</b>
              <i aria-hidden="true">→</i>
            </>
          </a>
        ))
      }
    </div>
    <aside class="mega-preview-panel" aria-live="polite">
      <img data-solution-preview-image alt="" />
      <p data-solution-preview-kicker>解决方案</p>
      <h2 data-solution-preview-title>{solutionEntries[0]?.title}</h2>
      <p data-solution-preview-copy>{solutionEntries[0]?.intro}</p>
      <span>查看方案 →</span>
    </aside>
  </div>
  ```

- [x] **Step 3: 实现鼠标、焦点、点击与 Escape 状态机**

  在 `site-motion.ts` 添加 `initSolutionsMenu()`：

  ```ts
  function initSolutionsMenu(): () => void {
    const menu = document.querySelector<HTMLElement>('[data-solutions-menu]');
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-solutions-trigger]',
    );
    const previewTitle = document.querySelector<HTMLElement>(
      '[data-solution-preview-title]',
    );
    const previewCopy = document.querySelector<HTMLElement>(
      '[data-solution-preview-copy]',
    );
    const previewImage = document.querySelector<HTMLImageElement>(
      '[data-solution-preview-image]',
    );
    if (!menu || !trigger || !previewTitle || !previewCopy || !previewImage)
      return () => undefined;

    const setOpen = (open: boolean) => {
      menu.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    };
    const setPreview = (link: HTMLAnchorElement) => {
      previewTitle.textContent = link.dataset.previewTitle ?? '';
      previewCopy.textContent = link.dataset.previewCopy ?? '';
      previewImage.src = link.dataset.previewImage ?? '';
      menu
        .querySelectorAll('[data-solution-option]')
        .forEach((item) =>
          item.toggleAttribute('data-preview-active', item === link),
        );
    };
    const options = Array.from(
      menu.querySelectorAll<HTMLAnchorElement>('[data-solution-option]'),
    );
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.focus();
      }
    };
    trigger.addEventListener('mouseenter', () => setOpen(true));
    trigger.addEventListener('focus', () => setOpen(true));
    trigger.addEventListener('click', () =>
      setOpen(trigger.getAttribute('aria-expanded') !== 'true'),
    );
    menu.addEventListener('mouseleave', () => setOpen(false));
    options.forEach((option) => {
      option.addEventListener('mouseenter', () => setPreview(option));
      option.addEventListener('focus', () => setPreview(option));
    });
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }
  ```

- [x] **Step 4: 编写 Mega Menu 视觉状态样式**

  在 `site-shell.css` 中将 `.mega-menu` 改为两列布局，并添加以下状态：

  ```css
  .mega-option-list {
    display: grid;
    align-content: start;
    gap: 0.25rem;
  }
  [data-solution-option] {
    display: grid;
    grid-template-columns: 2.5rem 1fr auto;
    gap: 0.75rem;
    align-items: center;
  }
  [data-solution-option][aria-current='page'],
  [data-solution-option][data-preview-active] {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 2px 0 0 var(--cyan);
  }
  .mega-preview-panel {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.06);
  }
  .mega-preview-panel img {
    width: 100%;
    aspect-ratio: 16 / 7;
    object-fit: cover;
  }
  ```

- [x] **Step 5: 运行菜单与移动端测试**

  Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "solutions menu|mobile navigation"`

  Expected: PASS。

- [ ] **Step 6: 提交菜单重构**

  ```bash
  git add src/components/site/SiteHeader.astro src/styles/site-shell.css src/scripts/site-motion.ts tests/browser/site-smoke.spec.ts
  git commit -m "feat(navigation): add solution menu previews"
  ```

### Task 5: 提前具身智能业务并添加合作伙伴轮播

> 实施更新（2026-07-14）：八家合作伙伴的官网 Logo 已存入 `public/partners/`，每个来源记录在 `public/partners/SOURCES.md`；不再使用 `null` 文字回退。

**Files:**

- Create: `src/data/partners.ts`
- Create: `src/components/home/PartnerMarquee.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/components/home/EmbodiedSection.astro`
- Modify: `src/styles/home.css`
- Modify: `src/scripts/site-motion.ts`

- [x] **Step 1: 创建合作伙伴结构化数据**

  创建 `src/data/partners.ts`：

  ```ts
  export interface Partner {
    name: string;
    href: string;
    logo: string | null;
    logoAlt: string;
  }

  export const partners: Partner[] = [
    {
      name: '宇树科技',
      href: 'https://www.unitree.com/',
      logo: null,
      logoAlt: '宇树科技 Logo',
    },
    {
      name: 'Booster',
      href: 'https://www.booster.tech/cn/',
      logo: null,
      logoAlt: 'Booster Logo',
    },
    {
      name: '智元机器人',
      href: 'https://www.agibot.com.cn/',
      logo: null,
      logoAlt: '智元机器人 Logo',
    },
    {
      name: '银河通用',
      href: 'https://www.galbot.com/',
      logo: null,
      logoAlt: '银河通用 Logo',
    },
    {
      name: '众擎机器人',
      href: 'https://www.engineai.com.cn/',
      logo: null,
      logoAlt: '众擎机器人 Logo',
    },
    {
      name: '云深处科技',
      href: 'https://www.deeprobotics.cn/',
      logo: null,
      logoAlt: '云深处科技 Logo',
    },
    {
      name: '乐聚机器人',
      href: 'https://www.lejurobot.com/zh',
      logo: null,
      logoAlt: '乐聚机器人 Logo',
    },
    {
      name: '优必选',
      href: 'https://www.ubtrobot.com/cn/',
      logo: null,
      logoAlt: '优必选 Logo',
    },
  ];
  ```

- [x] **Step 2: 创建可访问的合作伙伴轨道**

  ```astro
  ---
  import { partners } from '../../data/partners';
  ---

  <section
    class="partner-marquee section-pad"
    data-partner-marquee
    aria-label="合作伙伴"
  >
    <div class="section-heading" data-reveal>
      <p class="eyebrow">PARTNERS</p><h2>与具身智能伙伴，共同进入真实场景</h2>
    </div>
    <div class="partner-viewport">
      <div class="partner-track" data-partner-track>
        {
          partners.map((partner) => (
            <a
              href={partner.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`访问${partner.name}官网`}
            >
              {partner.logo ? (
                <img src={partner.logo} alt={partner.logoAlt} />
              ) : (
                <span>{partner.name}</span>
              )}
            </a>
          ))
        }
      </div>
    </div>
  </section>
  ```

- [x] **Step 3: 调整首页顺序并补充具身智能锚点**

  在 `index.astro` 中使用：

  ```astro
  <HomeHero /><EmbodiedSection /><PartnerMarquee /><SolutionSplit
  /><FactorySection /><EducationSection /><TechnologySection /><CaseSection
  /><ProjectCta />
  ```

  在 `EmbodiedSection.astro` 的 section 加入 `id="embodied-ai"` 与 `data-embodied-section`，保留既有图像替代文本和内容。

- [x] **Step 4: 添加轨道样式与 GSAP 运动**

  在 `home.css` 添加 `overflow: hidden` 的 viewport、固定宽度 Logo 单元和悬停上浮状态。在 `site-motion.ts` 中创建轨道 tween：

  ```ts
  const track = document.querySelector<HTMLElement>('[data-partner-track]');
  if (track && !reduceMotion) {
    const tween = gsap.to(track, {
      xPercent: -50,
      duration: 32,
      ease: 'none',
      repeat: -1,
    });
    const pause = () => tween.pause();
    const play = () => tween.play();
    track.parentElement?.addEventListener('mouseenter', pause);
    track.parentElement?.addEventListener('mouseleave', play);
  }
  ```

  渲染第二份 `partners` 列表并设为 `aria-hidden="true"`，使 xPercent `-50` 对应完整的一次无缝循环。

- [x] **Step 5: 运行合作伙伴测试与首页回归**

  Run: `npx playwright test tests/browser/site-smoke.spec.ts -g "CTA reports|captures the four"`

  Expected: PASS，四个视口无横向滚动，合作伙伴链接数量为八。

- [ ] **Step 6: 提交首页业务与生态展示**

  ```bash
  git add src/data/partners.ts src/components/home/PartnerMarquee.astro src/pages/index.astro src/components/home/EmbodiedSection.astro src/styles/home.css src/scripts/site-motion.ts
  git commit -m "feat(home): prioritize embodied AI partners"
  ```

### Task 6: 收敛入口、验证减少动态效果并完成质量检查

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `tests/browser/site-smoke.spec.ts`
- Modify: `src/scripts/reveal.ts`

- [x] **Step 1: 用 GSAP 初始化替换首页旧 reveal 初始化**

  从 `index.astro` 删除旧的 `initReveal` 脚本，并在 `BaseLayout.astro` 的 body 尾部添加：

  ```astro
  <script>
    import { initSiteMotion } from '../scripts/site-motion';
    initSiteMotion();
    document.addEventListener('astro:page-load', initSiteMotion);
  </script>
  ```

  删除 `src/scripts/reveal.ts`，并从所有入口移除其 import；仓库中不能再出现 `initReveal`。

- [x] **Step 2: 完成减少动态效果测试**

  在既有 `reduced-motion mode` 测试中追加：

  ```ts
  await expect(page.locator('[data-route-transition]')).toHaveAttribute(
    'data-state',
    'idle',
  );
  await expect(page.locator('[data-partner-track]')).toHaveCSS(
    'transform',
    'none',
  );
  ```

- [x] **Step 3: 运行定向测试**

  Run: `npm run test:e2e:run`

  Expected: PASS。

- [x] **Step 4: 运行完整验证**

  Run: `npm run verify`

  Expected: format、Astro check、Vitest、build、rendered-site test 和 Playwright 全部 PASS。

- [ ] **Step 5: 提交收敛与验证结果**

  ```bash
  git add src/layouts/BaseLayout.astro src/pages/index.astro src/scripts/reveal.ts src/scripts/site-motion.ts tests/browser/site-smoke.spec.ts
  git commit -m "test(motion): verify accessible navigation flows"
  ```

## 自检

- 规格中的 CTA、ClientRouter、当前页状态、桌面与移动菜单、具身智能前置、合作伙伴轮播、减少动态效果和测试均映射到 Task 1-6。
- 计划中没有未决占位内容或未定义的函数名；`initSiteMotion`、`initRouteFeedback` 和 `initSolutionsMenu` 的职责与调用位置一致。
- 待获取的官方 Logo 使用明确的 `null` 回退文本，不会以临时抓图代替授权素材。
