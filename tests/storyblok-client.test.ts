import { describe, expect, it, vi } from 'vitest';
import { listStories } from '../src/lib/storyblok/client';

describe('Storyblok Delivery API client', () => {
  it('requests published stories with the expected content folder', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        stories: [
          {
            full_slug: 'pages/about',
            content: { component: 'site_page' },
          },
        ],
      },
    });

    const stories = await listStories({ get }, 'published', {
      starts_with: 'pages/',
    });

    expect(stories).toHaveLength(1);
    expect(get).toHaveBeenCalledWith('cdn/stories', {
      page: 1,
      per_page: 100,
      starts_with: 'pages/',
      version: 'published',
    });
  });

  it('combines every Delivery API page before returning stories', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      full_slug: `pages/page-${index + 1}`,
      content: { component: 'site_page' },
    }));
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: { stories: firstPage } })
      .mockResolvedValueOnce({
        data: {
          stories: [
            {
              full_slug: 'pages/page-101',
              content: { component: 'site_page' },
            },
          ],
        },
      });

    const stories = await listStories({ get }, 'draft');

    expect(stories).toHaveLength(101);
    expect(get).toHaveBeenLastCalledWith('cdn/stories', {
      page: 2,
      per_page: 100,
      starts_with: undefined,
      version: 'draft',
    });
  });
});
