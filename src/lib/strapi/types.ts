/**
 * The subset of a Strapi upload record required by the Astro rendering layer.
 */
export interface StrapiMedia {
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
}

/**
 * The flat Strapi v5 page response consumed by the site content mapper.
 */
export interface StrapiPage {
  documentId: string;
  slug: string;
  template: 'overview' | 'detail' | 'brand';
  title: string;
  english: string;
  category: string;
  visualFamily: 'platform' | 'common' | 'higher' | 'k12' | 'brand';
  parentPath?: string | null;
  intro: string;
  positioning: string;
  hero: StrapiMedia;
  images: [StrapiMedia, StrapiMedia];
  capabilities: string[];
  scenarios: string[];
  delivery: string[];
  seoTitle: string;
  seoDescription: string;
  ogImage: StrapiMedia;
}
