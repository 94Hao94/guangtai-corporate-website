import { describe, expect, it } from 'vitest';
import { exportPages } from '../cms/scripts/import-current-content.mjs';

describe('current site content export', () => {
  it('converts every legacy page into one deterministic Strapi payload', async () => {
    const pages = await exportPages();

    expect(pages).toHaveLength(29);
    expect(pages.map((page) => page.slug)).toContain('about');
    expect(pages[0]?.blocks).toEqual([]);
    expect(pages.find((page) => page.slug === 'about')).toMatchObject({
      title: '关于光泰',
      parentPath: null,
      seoTitle: '关于光泰 | 天津光泰科技集团',
      sourceMedia: {
        hero: '/assets/hero-guangtai-campus-ai-v1.png',
        ogImage: '/assets/hero-guangtai-campus-ai-v1.png',
      },
    });
  });
});
