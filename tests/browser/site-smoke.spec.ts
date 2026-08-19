import { expect, test, type Page } from '@playwright/test';

const expectedSolutionLinks = 24;
const approvedViewports = [
  { name: 'mobile-320x700', width: 320, height: 700 },
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
] as const;
const responsiveRoutes = [
  { name: 'home', path: '/' },
  {
    name: 'detail',
    path: '/solutions/common/embodied-intelligence/',
  },
  { name: 'contact', path: '/contact/' },
] as const;

function collectRuntimeErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function assertPageIntegrity(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);

  const images = page.locator('img');
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    const isMovingPartnerLogo = await image.evaluate((element) =>
      Boolean(element.closest('[data-partner-track]')),
    );
    const isResponsiveHidden = await image.evaluate(
      (element) =>
        element instanceof HTMLElement && element.offsetParent === null,
    );
    if (isResponsiveHidden) continue;
    if (!isMovingPartnerLogo) await image.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          image.evaluate((element) => {
            const imageElement = element as HTMLImageElement;
            return imageElement.complete && imageElement.naturalWidth > 0;
          }),
        { message: `image ${await image.getAttribute('src')} should load` },
      )
      .toBe(true);
  }
  const shellDoesNotOverlap = await page.evaluate(() => {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    if (!header || !main) return false;
    const mainDocumentTop = main.getBoundingClientRect().top + window.scrollY;
    return header.getBoundingClientRect().height <= mainDocumentTop + 1;
  });
  expect(shellDoesNotOverlap).toBe(true);
}

test('desktop navigation is keyboard operable and closes with Escape', async ({
  page,
}) => {
  test.slow();
  const errors = collectRuntimeErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 4,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 4,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: '天津光泰科技集团首页' }),
  ).toBeFocused();

  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.focus();
  await page.keyboard.press('Enter');
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#solutions-mega-menu')).toBeVisible();
  await expect(page.locator('#solutions-mega-menu a')).toHaveCount(
    expectedSolutionLinks,
  );

  await page.keyboard.press('Escape');
  await expect(solutions).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#solutions-mega-menu')).toBeHidden();
  await expect(solutions).toBeFocused();
  await assertPageIntegrity(page);
  expect(errors).toEqual([]);
});

test('solutions menu previews a focused option and marks the active route', async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/solutions/common/embodied-intelligence/');

  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.hover();
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');

  const menu = page.locator('[data-solutions-mega-menu]');
  const embodied = menu.locator(
    '[data-solution-option="/solutions/common/embodied-intelligence"]',
  );
  await expect(embodied).toHaveAttribute('aria-current', 'page');

  const higherEducation = menu.locator(
    '[data-solution-option="/solutions/industries/higher-education"]',
  );
  await higherEducation.hover();
  await expect(menu.locator('[data-solution-preview-title]')).toHaveText(
    '高校场景解决方案',
  );
  expect(errors).toEqual([]);
});

test('solutions menu remains interactive after a client-side page swap', async ({
  page,
}) => {
  await page.goto('/');

  const primaryNavigation = page.locator('[data-primary-nav]');
  await primaryNavigation.getByRole('link', { name: 'AI应用工厂' }).click();
  await expect(page).toHaveURL(/\/guangtai-ai-factory\/?$/);

  const solutions = page.getByRole('button', { name: '解决方案' });
  await page.mouse.move(0, 600);
  await expect(solutions).toHaveAttribute('aria-expanded', 'false');
  await solutions.click();
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#solutions-mega-menu')).toBeVisible();
});

test('solutions menu closes when another header destination is clicked', async ({
  page,
}) => {
  await page.goto('/');
  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.click();
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');

  await page
    .locator('[data-primary-nav]')
    .getByRole('link', { name: 'AI应用工厂' })
    .click();
  await expect(page).toHaveURL(/\/guangtai-ai-factory\/?$/);
  await expect(solutions).toHaveAttribute('aria-expanded', 'false');
});

test('solutions menu tolerates a diagonal pointer path into its panel', async ({
  page,
}) => {
  await page.goto('/');
  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.hover();
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');

  const panelBox = await page
    .locator('[data-solutions-mega-menu]')
    .boundingBox();
  if (!panelBox) throw new Error('solutions panel should have a bounding box');
  await page.mouse.move(0, 600);
  await page.mouse.move(panelBox.x + 24, panelBox.y + 24);
  await page.waitForTimeout(260);
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');
});

test('solutions menu synchronizes its current option after a client-side page swap', async ({
  page,
}) => {
  await page.goto('/');

  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.hover();
  const embodied = page.locator(
    '[data-solution-option="/solutions/common/embodied-intelligence"]',
  );
  await embodied.click();
  await expect(page).toHaveURL(
    /\/solutions\/common\/embodied-intelligence\/?$/,
  );

  await expect(embodied).toHaveAttribute('aria-current', 'page');
});

test('homepage exposes a labeled eight-partner marquee', async ({ page }) => {
  await page.goto('/');
  const partners = page.locator('[data-partner-marquee]');
  await expect(partners).toHaveAttribute('aria-label', '合作伙伴');
  await expect(partners.getByRole('link')).toHaveCount(8);
  await expect(partners.getByRole('img')).toHaveCount(8);
  await expect(partners.getByRole('img').first()).toHaveAttribute(
    'alt',
    '宇树科技 Logo',
  );
});

test('low-capability desktop visitors keep the static Hero instead of mounting Spline', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 4,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 4,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await expect(page.locator('[data-spline-hero]')).toHaveAttribute(
    'data-spline-mode',
    'static',
  );
  await expect(page.locator('[data-spline-hero] spline-viewer')).toHaveCount(0);
  await expect(page.locator('.home-hero .hero-image--desktop')).toBeVisible();
});

test('capable desktop marks the Hero mounted when Spline completes on the first visit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const viewer = page.locator('[data-spline-hero] spline-viewer');
  await expect(viewer).toHaveCount(1, { timeout: 15_000 });
  await viewer.dispatchEvent('load-complete');

  await expect(page.locator('.home-hero')).toHaveClass(/is-spline-mounted/);
});

test('capable desktop requests the Spline scene eagerly on the first visit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const viewer = page.locator('[data-spline-hero] spline-viewer');
  await expect(viewer).toHaveCount(1, { timeout: 15_000 });
  await expect(viewer).toHaveAttribute('loading', 'eager');
});

test('Spline completion hides only the static robot while preserving its background', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 8,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const viewer = page.locator('[data-spline-hero] spline-viewer');
  await expect(viewer).toHaveCount(1, { timeout: 15_000 });
  await viewer.dispatchEvent('load-complete');

  await expect(page.locator('.hero-image--fallback')).toHaveCSS('opacity', '0');
  await expect(page.locator('.hero-image--background')).toHaveCSS(
    'opacity',
    '1',
  );
});

test('homepage centers the brand message within the Hero visual field', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const brandCenter = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero')?.getBoundingClientRect();
    const heading = document
      .querySelector('.home-hero h1')
      ?.getBoundingClientRect();
    const action = document
      .querySelector('.hero-actions')
      ?.getBoundingClientRect();
    if (!hero || !heading || !action) return null;
    return (heading.top + action.bottom) / 2 - hero.top;
  });
  const heroHeight = await page
    .locator('.home-hero')
    .evaluate((element) => element.getBoundingClientRect().height);

  expect(brandCenter).not.toBeNull();
  expect((brandCenter ?? 0) / heroHeight).toBeGreaterThan(0.42);
  expect((brandCenter ?? 0) / heroHeight).toBeLessThan(0.6);
});

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

test('homepage chapter signposts keep business sections identifiable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const chapters = page.locator('[data-home-chapter]');
  await expect(chapters).toHaveCount(7);
  await expect(chapters.nth(0)).toContainText('01 / AI 应用工厂');
  await expect(chapters.nth(1)).toContainText('02 / 具身智能');
  await expect(chapters.nth(2)).toContainText('02.1 / 具身生态伙伴');
  await expect(chapters.nth(3)).toContainText('03 / 系统集成与行业场景');
  await expect(chapters.nth(6)).toContainText('04 / 项目实践');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('homepage reveal animations initialize after returning through the client router', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      value: 4,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      value: 4,
    });
  });
  await page.goto('/');

  /** Returns to the homepage through the client router after visiting the AI factory page. */
  const returnToHomepage = async (): Promise<void> => {
    await page
      .locator('[data-primary-nav]')
      .getByRole('link', { name: 'AI应用工厂' })
      .click();
    await expect(page).toHaveURL(/\/guangtai-ai-factory\/?$/);
    await page.getByRole('link', { name: '天津光泰科技集团首页' }).click();
    await expect(page).toHaveURL(/\/$/);
  };

  await returnToHomepage();
  await returnToHomepage();

  const reveal = page.locator('[data-embodied-section] [data-reveal]').first();
  await reveal.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      reveal.evaluate((element) => Number(getComputedStyle(element).opacity)),
    )
    .toBeGreaterThan(0.99);
  await expect(page.locator('#ai-canvas').first()).toHaveJSProperty(
    'width',
    1440,
  );
});

test('sitewide motion reinitializes after client-side navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .locator('[data-primary-nav]')
    .getByRole('link', { name: 'AI应用工厂' })
    .click();
  await expect(page).toHaveURL(/\/guangtai-ai-factory\/?$/);
  await page.getByRole('link', { name: '天津光泰科技集团首页' }).click();
  await expect(page).toHaveURL(/\/$/);

  const track = page.locator('[data-partner-track]');
  await expect(track).toHaveCSS('transform', /matrix/);

  await page
    .locator('[data-primary-nav]')
    .getByRole('link', { name: 'AI应用工厂' })
    .click();
  await expect(page).toHaveURL(/\/guangtai-ai-factory\/?$/);
  const reveal = page.locator('[data-page-motion] [data-reveal]').first();
  await reveal.scrollIntoViewIfNeeded();
  await expect(reveal).toHaveCSS('opacity', '1');
});

test('sitewide motion skips heavyweight homepage canvases on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.locator('#ai-canvas')).toHaveJSProperty('width', 300);
  await expect(page.locator('spline-viewer')).toHaveCount(0);
});

test('project CTA exposes a navigation intent state before navigation', async ({
  page,
}) => {
  await page.goto('/');
  const cta = page.locator('[data-route-cta]').first();
  await expect(cta).toBeVisible();
  await cta.click();
  await expect(page.locator('[data-route-transition]')).toHaveAttribute(
    'data-state',
    'leaving',
  );
});

test('mobile navigation restores focus and body scrolling after Escape', async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect
    .poll(() =>
      page
        .locator('.site-header')
        .evaluate((element) =>
          Math.round(element.getBoundingClientRect().height),
        ),
    )
    .toBe(58);

  const menu = page.locator('[data-menu-toggle]');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-primary-nav]')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/menu-open/);

  const solutions = page.getByRole('button', { name: '解决方案' });
  await solutions.click();
  await expect(page.locator('#solutions-mega-menu a')).toHaveCount(
    expectedSolutionLinks,
  );
  const familyButtons = page.locator('[data-solution-group-trigger]');
  await expect(familyButtons).toHaveCount(4);
  await expect(familyButtons.first()).toHaveAttribute('aria-expanded', 'true');
  await familyButtons.nth(2).click();
  await expect(familyButtons.nth(2)).toHaveAttribute('aria-expanded', 'true');
  await expect(familyButtons.first()).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-solution-group-panel]:visible')).toHaveCount(
    1,
  );
  await expect(page.locator('.mobile-nav-contact')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(solutions).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(menu).toBeFocused();
  await assertPageIntegrity(page);
  expect(errors).toEqual([]);
});

test('reduced-motion mode reveals content without animation dependency', async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const reveals = page.locator('[data-reveal]');
  await expect(reveals.first()).toHaveClass(/is-visible/);
  expect(
    await reveals.evaluateAll((elements) =>
      elements.every((element) => element.classList.contains('is-visible')),
    ),
  ).toBe(true);
  await expect(page.locator('canvas')).toHaveJSProperty('width', 1440);
  expect(errors).toEqual([]);
});

test('representative overview, detail, and brand pages render intact', async ({
  page,
}) => {
  const errors = collectRuntimeErrors(page);
  for (const path of [
    '/solutions/common/',
    '/solutions/industries/k12/teaching/',
    '/about/',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.inner-hero img')).toHaveAttribute(
      'loading',
      'eager',
    );
    await assertPageIntegrity(page);
  }
  expect(errors).toEqual([]);
});

test('visual breadcrumbs are reserved for nested pages and stay close to the Hero title', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/cases/');
  await expect(
    page.getByRole('navigation', { name: '面包屑导航' }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('navigation', { name: '面包屑导航' }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/solutions/industries/higher-education/ai/');
  const breadcrumbs = page.getByRole('navigation', { name: '面包屑导航' });
  await expect(breadcrumbs).toBeVisible();

  const gap = await breadcrumbs.evaluate((element) => {
    const eyebrow = document.querySelector('.inner-eyebrow');
    if (!eyebrow) return null;
    return (
      eyebrow.getBoundingClientRect().top -
      element.getBoundingClientRect().bottom
    );
  });
  expect(gap).not.toBeNull();
  expect(gap ?? 0).toBeGreaterThanOrEqual(20);
  expect(gap ?? 0).toBeLessThanOrEqual(32);
  await expect(breadcrumbs).not.toHaveCSS('position', 'sticky');
  await expect(breadcrumbs).not.toHaveCSS('position', 'fixed');
});

test('about page presents a readable full-width company profile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');

  const profile = page.locator('#overview[data-about-profile]');
  await expect(profile).toBeVisible();
  await expect(profile.getByRole('heading', { level: 2 })).toHaveText(
    '让技术能力真正进入业务现场',
  );
  await expect(profile.locator('[data-about-fact]')).toHaveCount(4);
  await expect(page.locator('[data-about-capability]')).toHaveCount(4);
  await expect(page.locator('[data-capability-navigator]')).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(0);

  const profileWidth = await profile.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  const storyWidth = await profile
    .locator('.about-profile__story')
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(storyWidth).toBeLessThan(profileWidth);
  expect(storyWidth).toBeGreaterThan(640);
});

test('mobile about page uses two-column facts and single-column capability cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');

  await expect
    .poll(() =>
      page
        .locator('.inner-hero')
        .evaluate((element) =>
          Math.round(element.getBoundingClientRect().height),
        ),
    )
    .toBe(230);
  await expect
    .poll(() =>
      page
        .locator('.chapter-nav')
        .evaluate((element) =>
          Math.round(element.getBoundingClientRect().height),
        ),
    )
    .toBe(46);

  const profile = page.locator('#overview[data-about-profile]');
  await expect(profile).toBeVisible();
  expect(
    await profile.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(844);
  await expect(page.locator('[data-mobile-capability-accordion]')).toHaveCount(
    0,
  );

  const facts = profile.locator('.about-profile__facts');
  const factColumns = await facts.evaluate(
    (element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length,
  );
  expect(factColumns).toBe(2);

  const capabilities = page.locator('.about-capabilities__grid');
  await capabilities.scrollIntoViewIfNeeded();
  const capabilityColumns = await capabilities.evaluate(
    (element) =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length,
  );
  expect(capabilityColumns).toBe(1);
  await expect(page.locator('[data-about-capability]')).toHaveCount(4);
  await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');
});

test('AI factory experience link targets the protected entry', async ({
  page,
}) => {
  await page.goto('/guangtai-ai-factory/');

  const experienceSection = page.locator('.factory-experience');
  await experienceSection.scrollIntoViewIfNeeded();
  await expect(experienceSection).toBeVisible();
  const experienceLink = page.getByRole('link', { name: '前去体验' });
  await expect(experienceLink).toBeVisible();
  await expect(experienceLink).toHaveAttribute('href', '/ai-factory/');
  await experienceLink.focus();
  await expect(experienceLink).toBeFocused();
  await Promise.all([
    page.waitForURL(/\/ai-factory\/$/),
    experienceLink.press('Enter'),
  ]);
});

test('contact project form accepts labeled details and reports its unconfigured channel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contact/');

  const form = page.locator('[data-project-contact-form]');
  await expect(form).toBeVisible();
  expect(
    await form.evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(844);
  expect(
    await form
      .getByLabel('姓名')
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBeLessThan(844);

  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-field-error]').first()).toContainText(
    '请输入姓名',
  );
  await expect(form.getByLabel('姓名')).toHaveAttribute('aria-invalid', 'true');

  await form.getByLabel('姓名').fill('李明');
  await form.getByLabel('单位').fill('天津光泰科技集团');
  await form.getByLabel('联系方式').fill('13800000000');
  await form.getByLabel('项目类型').selectOption({ index: 1 });
  await form.getByLabel('计划时间').selectOption({ index: 1 });
  await form
    .getByLabel('需求描述')
    .fill('需要规划一个可验证的 AI 应用工厂项目。');

  await form.locator('button[type="submit"]').click();
  await expect(form.getByRole('status')).toContainText('联系渠道尚未配置');
  await expect(form).not.toContainText(/提交成功|已发送/);
});

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
  await expect(footer.locator('.footer-legal')).toContainText(
    '天津光泰光电科技（集团）有限公司 版权所有',
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(groups).toHaveCount(3);
  for (const group of await groups.all()) {
    await expect(group).toHaveAttribute('open', '');
  }
});

test('unknown routes return the branded 404 response', async ({ page }) => {
  const response = await page.goto('/definitely-missing/');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('404 / PAGE NOT FOUND')).toBeVisible();
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible();
});

test('captures approved responsive viewports across key routes', async ({
  page,
}, testInfo) => {
  const errors = collectRuntimeErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of responsiveRoutes) {
    for (const viewport of approvedViewports) {
      await page.setViewportSize(viewport);
      await page.goto(route.path);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (route.name === 'home' && viewport.name === 'mobile-320x700') {
        const partnerViewport = page.locator('.mobile-partner-viewport');
        const thirdPartner = page.locator('[data-mobile-partners] a').nth(2);
        expect(
          await thirdPartner.evaluate(
            (element, viewportRight) =>
              element.getBoundingClientRect().left < viewportRight,
            await partnerViewport.evaluate(
              (element) => element.getBoundingClientRect().right,
            ),
          ),
        ).toBe(true);
      }
      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${route.name}-${viewport.name}.png`),
      });
    }
  }
  expect(errors).toEqual([]);
});
