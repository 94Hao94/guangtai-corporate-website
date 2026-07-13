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
    await image.scrollIntoViewIfNeeded();
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
    await assertPageIntegrity(page);
    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${viewport.name}.png`),
    });
  }
});
