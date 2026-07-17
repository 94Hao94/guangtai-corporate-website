import { z } from 'astro/zod';

const assetPathSchema = z
  .string()
  .refine(
    (value) =>
      value.startsWith('/assets/') ||
      value.startsWith('https://a.storyblok.com/') ||
      /^https?:\/\//.test(value),
    'Asset paths must use /assets/, the Storyblok CDN, or an HTTP(S) CMS URL',
  );

export const pageSchema = z.object({
  id: z.string().min(1),
  path: z.string().startsWith('/'),
  template: z.enum(['overview', 'detail', 'brand']),
  title: z.string().min(1),
  english: z.string().min(1),
  category: z.string().min(1),
  visualFamily: z.enum(['platform', 'common', 'higher', 'k12', 'brand']),
  heroPosition: z.string().optional(),
  heroFit: z.enum(['cover', 'contain']).optional(),
  parentPath: z.string().startsWith('/').optional(),
  intro: z.string().min(1),
  positioning: z.string().min(1),
  hero: assetPathSchema,
  images: z.tuple([assetPathSchema, assetPathSchema]),
  capabilities: z.array(z.string().min(1)).min(1),
  scenarios: z.array(z.string().min(1)).min(1),
  delivery: z.array(z.string().min(1)).min(1),
  draft: z.boolean().default(false),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  ogImage: assetPathSchema,
});

export type SitePage = z.infer<typeof pageSchema>;
