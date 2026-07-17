import { describe, expect, it, vi } from 'vitest';

const get = vi.fn().mockResolvedValue({
  data: {
    stories: [
      {
        full_slug: 'pages/about',
        content: {
          component: 'site_page',
          template: 'brand',
          title: '关于光泰',
          english: 'ABOUT GUANGTAI',
          category: '品牌',
          visual_family: 'brand',
          intro: '从技术能力走向长期服务。',
          positioning: '以工程能力服务真实场景。',
          hero: {
            filename: 'https://a.storyblok.com/f/1/about.jpg',
            alt: '光泰办公空间',
          },
          images: [
            {
              filename: 'https://a.storyblok.com/f/1/about-a.jpg',
              alt: '团队协作',
            },
            {
              filename: 'https://a.storyblok.com/f/1/about-b.jpg',
              alt: '项目交付',
            },
          ],
          capabilities: ['系统建设'],
          scenarios: ['行业服务'],
          delivery: ['项目实施'],
          seo_title: '关于光泰｜光泰',
          seo_description: '从技术能力走向长期服务。',
          og_image: {
            filename: 'https://a.storyblok.com/f/1/about-og.jpg',
            alt: '光泰办公空间',
          },
        },
      },
    ],
  },
});

vi.mock('@storyblok/astro', () => ({
  useStoryblokApi: () => ({ get }),
}));

import { getSitePage, getSitePages } from '../src/lib/storyblok/content';

describe('Storyblok site content repository', () => {
  it('maps published page stories into SitePage records', async () => {
    await expect(getSitePages('published')).resolves.toMatchObject([
      {
        path: '/about',
        template: 'brand',
        title: '关于光泰',
      },
    ]);
    expect(get).toHaveBeenCalledWith('cdn/stories', {
      page: 1,
      per_page: 100,
      starts_with: 'pages/',
      version: 'published',
    });
  });

  it('returns the requested public path from a Storyblok page collection', async () => {
    await expect(getSitePage('/about', 'draft')).resolves.toMatchObject({
      path: '/about',
      title: '关于光泰',
    });
  });
});
