import { pageSchema, type SitePage } from '../page-schema';
import type { StrapiMedia, StrapiPage } from './types';

/**
 * Validates a Strapi media record and returns its absolute URL for page data.
 *
 * @param media - The Strapi upload record referenced by a page field.
 * @param field - The human-readable field path used in validation errors.
 * @returns The media URL after confirming accessible alternative text exists.
 * @throws Error when the URL or alternative text is missing.
 */
export function toStrapiImageUrl(media: StrapiMedia, field: string): string {
  if (!media.url) {
    throw new Error(`${field}.url must not be empty`);
  }

  if (!media.alternativeText?.trim()) {
    throw new Error(`${field}.alternativeText must not be empty`);
  }

  return media.url;
}

/**
 * Converts a flat Strapi page response to the stable SitePage contract used by
 * Astro templates and the content-tree validator.
 *
 * @param page - A published Strapi page record with populated media fields.
 * @returns A schema-validated page record ready for Astro rendering.
 * @throws Error when a required media field lacks accessible alternative text.
 * @throws ZodError when Strapi data violates the site page contract.
 */
export function mapStrapiPage(page: StrapiPage): SitePage {
  return pageSchema.parse({
    id: page.documentId,
    path: `/${page.slug.replace(/^\//, '')}`,
    template: page.template,
    title: page.title,
    english: page.english,
    category: page.category,
    visualFamily: page.visualFamily,
    parentPath: page.parentPath ?? undefined,
    intro: page.intro,
    positioning: page.positioning,
    hero: toStrapiImageUrl(page.hero, 'hero'),
    images: [
      toStrapiImageUrl(page.images[0], 'images[0]'),
      toStrapiImageUrl(page.images[1], 'images[1]'),
    ],
    capabilities: page.capabilities,
    scenarios: page.scenarios,
    delivery: page.delivery,
    draft: false,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    ogImage: toStrapiImageUrl(page.ogImage, 'ogImage'),
  });
}
