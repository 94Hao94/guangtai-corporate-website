/**
 * A Storyblok media field after the CMS response has been narrowed to the
 * properties this site renders.
 */
export interface StoryblokAsset {
  filename: string;
  alt: string;
}

/**
 * The fixed content fields used by the existing Astro inner-page templates.
 * Additional Storyblok blocks are added separately and never bypass this
 * contract.
 */
export interface StoryblokPageContent {
  component: 'site_page';
  template: 'overview' | 'detail' | 'brand';
  title: string;
  english: string;
  category: string;
  visual_family: 'platform' | 'common' | 'higher' | 'k12' | 'brand';
  parent_path?: string;
  intro: string;
  positioning: string;
  hero: StoryblokAsset;
  images: [StoryblokAsset, StoryblokAsset];
  capabilities: string[];
  scenarios: string[];
  delivery: string[];
  seo_title: string;
  seo_description: string;
  og_image: StoryblokAsset;
}

/**
 * The minimum Storyblok Delivery API story shape required to render an inner
 * page. The Delivery API can include more metadata, which this mapper ignores.
 */
export interface StoryblokPageStory {
  full_slug: string;
  content: StoryblokPageContent;
}
