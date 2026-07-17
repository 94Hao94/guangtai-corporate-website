import { describe, expect, it } from 'vitest';
import { resolveStoryblokEnvironment } from '../src/lib/storyblok/environment';

describe('Storyblok environment configuration', () => {
  it('uses the published token for production builds', () => {
    expect(
      resolveStoryblokEnvironment('production', {
        STORYBLOK_DRAFT_TOKEN: 'draft-token',
        STORYBLOK_PUBLISHED_TOKEN: 'published-token',
      }),
    ).toEqual({
      accessToken: 'published-token',
      preview: false,
    });
  });

  it('uses the draft token for preview builds', () => {
    expect(
      resolveStoryblokEnvironment('preview', {
        STORYBLOK_DRAFT_TOKEN: 'draft-token',
        STORYBLOK_PUBLISHED_TOKEN: 'published-token',
      }),
    ).toEqual({
      accessToken: 'draft-token',
      preview: true,
    });
  });

  it('fails before a production build when its token is missing', () => {
    expect(() =>
      resolveStoryblokEnvironment('production', {
        STORYBLOK_DRAFT_TOKEN: 'draft-token',
      }),
    ).toThrow('STORYBLOK_PUBLISHED_TOKEN is required for a production build');
  });
});
