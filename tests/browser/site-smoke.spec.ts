import { expect, test, type Page } from '@playwright/test';

const expectedSolutionLinks = 24;

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
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const shellDoesNotOverlap = await page.evaluate(() => {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    if (!header || !main) return false;
    return (
      header.getBoundingClientRect().bottom <=
      main.getBoundingClientRect().top + 1
    );
  });
  expect(shellDoesNotOverlap).toBe(true);
}

test('desktop navigation is keyboard operable and closes with Escape', async ({
  page,
}) => {
  test.slow();
  const errors = collectRuntimeErrors(page);
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

  await page.mouse.move(0, 600);
  await page.waitForTimeout(120);
  await expect(solutions).toHaveAttribute('aria-expanded', 'true');

  const panelBox = await page
    .locator('[data-solutions-mega-menu]')
    .boundingBox();
  if (!panelBox) throw new Error('solutions panel should have a bounding box');
  await page.mouse.move(panelBox.x + 24, panelBox.y + 24);
  await page.waitForTimeout(160);
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

test('homepage reveal animations initialize after returning through the client router', async ({
  page,
}) => {
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

test('about capability navigator updates its panel on hover and focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');

  const navigator = page.locator('#overview[data-capability-navigator]');
  const tabs = navigator.getByRole('tab');
  const panels = navigator.locator('[data-capability-panel]');
  const visiblePanel = navigator.locator('[role="tabpanel"]:visible');
  await expect(tabs).toHaveCount(4);
  await expect(panels).toHaveCount(4);
  await expect(visiblePanel).toHaveCount(1);
  const tabAttributes = await tabs.evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.id,
      controls: element.getAttribute('aria-controls'),
      text: element.textContent?.trim() ?? '',
    })),
  );
  for (const [index, tab] of tabAttributes.entries()) {
    expect(tab.text).toContain(`0${index + 1}`);
    expect(tab.id).not.toBe('');
    expect(tab.controls).not.toBeNull();
    expect(tab.controls).not.toBe('');
  }
  expect(new Set(tabAttributes.map((tab) => tab.id)).size).toBe(4);
  expect(new Set(tabAttributes.map((tab) => tab.controls)).size).toBe(4);

  const hoveredTab = tabs.nth(1);
  const hoveredTabId = await hoveredTab.getAttribute('id');
  const hoveredTabControls = await hoveredTab.getAttribute('aria-controls');
  await hoveredTab.hover();
  await expect(hoveredTab).toHaveAttribute('aria-selected', 'true');
  await expect(visiblePanel).toHaveAttribute('id', hoveredTabControls ?? '');
  await expect(visiblePanel).toHaveAttribute(
    'aria-labelledby',
    hoveredTabId ?? '',
  );
  await expect(visiblePanel).toContainText('软件定制、AI编程与系统集成');
  await expect(
    navigator.locator('[role="tab"][aria-selected="true"]'),
  ).toHaveCount(1);

  const focusedTab = tabs.nth(2);
  const focusedTabId = await focusedTab.getAttribute('id');
  const focusedTabControls = await focusedTab.getAttribute('aria-controls');
  await focusedTab.focus();
  await expect(focusedTab).toHaveAttribute('aria-selected', 'true');
  await expect(visiblePanel).toHaveAttribute('id', focusedTabControls ?? '');
  await expect(visiblePanel).toHaveAttribute(
    'aria-labelledby',
    focusedTabId ?? '',
  );
  await expect(visiblePanel).toContainText('音视频、安全、基础设施与空间智能');
  await expect(
    navigator.locator('[role="tab"][aria-selected="true"]'),
  ).toHaveCount(1);
});

test('mobile capability navigator activates on click without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');

  const navigator = page.locator('#overview[data-capability-navigator]');
  await navigator.scrollIntoViewIfNeeded();
  await expect(navigator).toBeVisible();
  const selectedTab = navigator.getByRole('tab').nth(1);
  await selectedTab.click();
  await expect(selectedTab).toHaveAttribute('aria-selected', 'true');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('AI factory experience control is disabled and does not navigate', async ({
  page,
}) => {
  await page.goto('/guangtai-ai-factory/');

  const experienceSection = page.locator('.factory-experience');
  await experienceSection.scrollIntoViewIfNeeded();
  await expect(experienceSection).toBeVisible();
  const experienceButton = page.getByRole('button', { name: '前去体验' });
  await expect(experienceButton).toBeDisabled();
  await expect(experienceButton).toHaveAttribute('aria-disabled', 'true');
  await expect(experienceButton).not.toHaveAttribute('href');

  const initialUrl = page.url();
  await experienceButton.click({ force: true });
  await expect(page).toHaveURL(initialUrl);
});

test('contact project form accepts labeled details and reports its unconfigured channel', async ({
  page,
}) => {
  await page.goto('/contact/');

  const form = page.locator('[data-project-contact-form]');
  await form.scrollIntoViewIfNeeded();
  await expect(form).toBeVisible();
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

test('unknown routes return the branded 404 response', async ({ page }) => {
  const response = await page.goto('/definitely-missing/');
  expect(response?.status()).toBe(404);
  await expect(page.getByText('404 / PAGE NOT FOUND')).toBeVisible();
  await expect(page.getByRole('link', { name: '返回首页' })).toBeVisible();
});

test('captures the four approved responsive viewports', async ({
  page,
}, testInfo) => {
  for (const viewport of [
    { name: 'desktop-1440x900', width: 1440, height: 900 },
    { name: 'laptop-1280x800', width: 1280, height: 800 },
    { name: 'tablet-768x1024', width: 768, height: 1024 },
    { name: 'mobile-390x844', width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.home-hero')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${viewport.name}.png`),
    });
  }
});
