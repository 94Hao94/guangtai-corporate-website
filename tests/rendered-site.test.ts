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
  it('renders home and all 29 MVP routes with page metadata', async () => {
    const contentPages = await pages();
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    expect(contentPages).toHaveLength(29);
    expect(await readFile(resolve('dist/index.html'), 'utf8')).toContain(
      '光泰AI应用工厂',
    );

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
