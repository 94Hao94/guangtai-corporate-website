import { z } from 'astro/zod';

const companyProfileSchema = z.object({
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).length(4),
  facts: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        copy: z.string().min(1),
      }),
    )
    .length(4),
  credentials: z.array(z.string().min(1)).min(1),
  innovation: z
    .array(
      z.object({
        since: z.string().min(1),
        title: z.string().min(1),
        copy: z.string().min(1),
        tags: z.array(z.string().min(1)).min(1),
      }),
    )
    .length(2),
});

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
  hero: z.string().startsWith('/assets/'),
  images: z.tuple([
    z.string().startsWith('/assets/'),
    z.string().startsWith('/assets/'),
  ]),
  companyProfile: companyProfileSchema.optional(),
  capabilities: z.array(z.string().min(1)).min(1),
  scenarios: z.array(z.string().min(1)).min(1),
  delivery: z.array(z.string().min(1)).min(1),
  draft: z.boolean().default(false),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  ogImage: z.string().startsWith('/assets/'),
});

export type SitePage = z.infer<typeof pageSchema>;
