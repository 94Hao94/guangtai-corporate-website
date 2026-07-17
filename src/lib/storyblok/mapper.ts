import { pageSchema, type SitePage } from '../page-schema';
import type { StoryblokAsset, StoryblokPageStory } from './types';

/**
 * Rejects CMS assets that would produce inaccessible images in the public site.
 *
 * @param assets - Named Storyblok image fields that are rendered by a page.
 * @returns Nothing when every image has descriptive alternative text.
 * @throws Error when an image alt field is empty after trimming whitespace.
 */
function assertAlternativeText(
  assets: ReadonlyArray<{ path: string; asset: StoryblokAsset }>,
): void {
  for (const { path, asset } of assets) {
    if (!asset.alt.trim()) {
      throw new Error(`${path}.alt must not be empty`);
    }
  }
}

/**
 * Converts a Storyblok page story to the site's stable page-content contract.
 *
 * @param story - A validated subset of a Storyblok Delivery API page story.
 * @returns The normalized page data before runtime schema validation.
 * @throws Never directly; callers should use mapAndValidateStoryPage when
 * schema validation is required.
 */
export function mapStoryPage(story: StoryblokPageStory) {
  const content = story.content;

  return {
    id: story.full_slug,
    path: `/${story.full_slug.replace(/^pages\//, '').replace(/\/$/, '')}`,
    template: content.template,
    title: content.title,
    english: content.english,
    category: content.category,
    visualFamily: content.visual_family,
    parentPath: content.parent_path,
    intro: content.intro,
    positioning: content.positioning,
    hero: content.hero.filename,
    images: [content.images[0].filename, content.images[1].filename] as const,
    capabilities: content.capabilities,
    scenarios: content.scenarios,
    delivery: content.delivery,
    draft: false,
    seoTitle: content.seo_title,
    seoDescription: content.seo_description,
    ogImage: content.og_image.filename,
  };
}

/**
 * Converts and validates a Storyblok page story before it reaches Astro page
 * templates.
 *
 * @param story - A Storyblok page story received from the content repository.
 * @returns A SitePage accepted by the existing content tree and templates.
 * @throws ZodError when CMS content violates the page-content contract.
 */
export function mapAndValidateStoryPage(story: StoryblokPageStory): SitePage {
  assertAlternativeText([
    { path: 'hero', asset: story.content.hero },
    { path: 'images[0]', asset: story.content.images[0] },
    { path: 'images[1]', asset: story.content.images[1] },
    { path: 'og_image', asset: story.content.og_image },
  ]);

  return pageSchema.parse(mapStoryPage(story));
}
