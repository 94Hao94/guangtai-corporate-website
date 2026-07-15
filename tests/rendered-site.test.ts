import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SitePage } from '../src/lib/page-schema';

async function pages(): Promise<SitePage[]> {
  const directory = resolve('src/content/pages');
  return Promise.all(
    (await readdir(directory))
      .filter((file) => file.endsWith('.json'))
      .map(async (file) =>
        JSON.parse(await readFile(resolve(directory, file), 'utf8')),
      ),
  );
}

function routeFile(path: string): string {
  return resolve('dist', path.slice(1), 'index.html');
}

describe('rendered corporate site', () => {
  it('loads the current Spline scene without distorting its pointer coordinates', async () => {
    const homeStyles = await readFile(resolve('src/styles/home.css'), 'utf8');
    const heroTemplate = await readFile(
      resolve('src/components/home/HomeHero.astro'),
      'utf8',
    );

    expect(homeStyles).toContain('left: 31vw;');
    expect(homeStyles).toContain('right: -11vw;');
    expect(homeStyles).toContain('transform: none;');
    expect(homeStyles).toMatch(/\.hero-copy\s*\{[\s\S]*?pointer-events: none;/);
    expect(homeStyles).toMatch(
      /\.hero-copy a\s*\{[\s\S]*?pointer-events: auto;/,
    );
    expect(heroTemplate).toContain('scene.splinecode?v=robot-v2');
  });

  it('renders home and all 29 MVP routes with page metadata', async () => {
    const contentPages = await pages();
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    expect(contentPages).toHaveLength(29);
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    expect(homepage).toContain('<h1>光启未来 智领时代</h1>');
    expect(homepage).toContain(
      '以AI应用工厂为平台底座，融合软件开发、系统集成、空间智能与具身设备。',
    );
    expect(homepage).toContain(
      'data-spline-scene="https://prod.spline.design/JCd7StIa9lqPaRfw/scene.splinecode?v=robot-v2"',
    );
    expect(homepage).toContain('aria-label="可交互的机器人 3D 模型"');
    expect(homepage).toContain('天津光泰科技集团有限公司');
    expect(homepage).toContain('href="/about">了解更多');
    expect(homepage).not.toContain('光泰AI应用工厂<br');

    for (const page of contentPages) {
      const html = await readFile(routeFile(page.path), 'utf8');
      expect(html).toContain(`<h1>${page.title}</h1>`);
      expect(html).toContain(`<title>${page.seoTitle}</title>`);
      expect(html).toContain(`content="${page.seoDescription}"`);
      titles.add(page.seoTitle);
      descriptions.add(page.seoDescription);
    }

    expect(titles.size).toBe(29);
    expect(descriptions.size).toBe(29);
  });

  it('renders all internal page links to known routes', async () => {
    const contentPages = await pages();
    const routes = new Set(['/', ...contentPages.map((page) => page.path)]);
    const files = [
      resolve('dist/index.html'),
      ...contentPages.map((page) => routeFile(page.path)),
    ];

    for (const file of files) {
      const html = await readFile(file, 'utf8');
      const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      for (const href of hrefs) {
        if (!href.startsWith('/') || href.startsWith('/_astro/')) continue;
        const path = href.split('#')[0] || '/';
        expect(routes.has(path), `Unknown link ${href} in ${file}`).toBe(true);
      }
    }
  });

  it('keeps production output free of React, Next, and Vinext runtimes', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    expect(homepage).not.toMatch(/react|next\/|vinext/i);
    expect(await readFile(resolve('dist/404.html'), 'utf8')).toContain(
      'PAGE NOT FOUND',
    );
  });
});
