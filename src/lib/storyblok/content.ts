import { useStoryblokApi } from '@storyblok/astro';
import type { SitePage } from '../page-schema';
import {
  listStories,
  type StoryblokContentVersion,
  type StoryblokDeliveryClient,
} from './client';
import { mapAndValidateStoryPage } from './mapper';
import type { StoryblokPageStory } from './types';

/**
 * Returns the SDK client through the narrow interface used by the content
 * repository, which keeps CMS tests independent from SDK implementation types.
 *
 * @returns A Storyblok Delivery API client limited to story-list requests.
 * @throws Propagates SDK initialization failures, including missing tokens.
 */
function getDeliveryClient(): StoryblokDeliveryClient {
  return useStoryblokApi() as unknown as StoryblokDeliveryClient;
}

/**
 * Reads and validates every site page from Storyblok's pages folder.
 *
 * @param version - Published data for production or draft data for preview.
 * @returns Validated SitePage records ready for the existing content tree.
 * @throws Error when Storyblok cannot be queried or any story breaks the page
 * schema or image accessibility contract.
 */
export async function getSitePages(
  version: StoryblokContentVersion,
): Promise<SitePage[]> {
  const stories = await listStories<StoryblokPageStory>(
    getDeliveryClient(),
    version,
    { starts_with: 'pages/' },
  );

  return stories.map(mapAndValidateStoryPage);
}

/**
 * Finds one validated site page by its public path.
 *
 * @param path - A leading-slash public path such as /about.
 * @param version - Published data for production or draft data for preview.
 * @returns The matching page, or undefined when Storyblok has no such story.
 * @throws Propagates Storyblok delivery and schema validation errors.
 */
export async function getSitePage(
  path: string,
  version: StoryblokContentVersion,
): Promise<SitePage | undefined> {
  return (await getSitePages(version)).find((page) => page.path === path);
}
