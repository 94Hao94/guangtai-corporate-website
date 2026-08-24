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

  it('keeps the complete company profile and evidence in the about source', async () => {
    const aboutPage = (await readPages()).find(
      (page) => page.path === '/about',
    );
    const profile = aboutPage?.companyProfile;

    expect(profile).toBeDefined();
    expect(profile?.paragraphs).toHaveLength(4);
    expect(profile?.paragraphs[0]).toContain('拥有127项软著专利');
    expect(profile?.paragraphs[1]).toContain('集团自2023年起布局AI行业应用');
    expect(profile?.paragraphs[2]).toContain('自2024年起，集团布局具身智能');
    expect(profile?.paragraphs[3]).toContain('让智能真正进入业务现场');
    expect(profile?.facts.map((fact) => fact.value)).toEqual([
      '2013',
      '京津冀',
      '127项',
      '全流程',
    ]);
    expect(profile?.credentials).toHaveLength(6);
    expect(profile?.innovation).toHaveLength(2);
  });
});
