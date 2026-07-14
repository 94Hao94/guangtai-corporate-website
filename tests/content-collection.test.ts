import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validatePages } from '../src/lib/content-tree';
import { pageSchema, type SitePage } from '../src/lib/page-schema';

async function readPages(): Promise<SitePage[]> {
  const directory = resolve('src/content/pages');
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.json'))
    .sort();
  return Promise.all(
    files.map(async (file) =>
      pageSchema.parse(
        JSON.parse(await readFile(resolve(directory, file), 'utf8')),
      ),
    ),
  );
}

describe('pages content collection source', () => {
  it('contains 29 schema-valid pages', async () => {
    expect(await readPages()).toHaveLength(29);
  });

  it('keeps route and parent relationships valid', async () => {
    expect(validatePages(await readPages())).toEqual([]);
  });

  it('contains page-specific SEO and visual fields', async () => {
    for (const page of await readPages()) {
      expect(page.seoTitle).toContain(page.title);
      expect(page.seoDescription).toBe(page.intro);
      expect(page.ogImage).toMatch(/^\/assets\//);
    }
  });

  it('uses the approved AI campus visual for the cases hero and social image', async () => {
    const casesPage = (await readPages()).find(
      (page) => page.path === '/cases',
    );

    expect(casesPage).toMatchObject({
      hero: '/assets/hero-humanoid-ai-campus.png',
      ogImage: '/assets/hero-humanoid-ai-campus.png',
    });
  });
});
