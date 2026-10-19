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

const pageHighlightSchema = z.object({
  navLabel: z.string().min(1),
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        copy: z.string().min(1),
      }),
    )
    .min(3)
    .max(4),
  steps: z.array(z.string().min(1)).min(2).optional(),
  outcomes: z
    .object({
      title: z.string().min(1),
      items: z.array(z.string().min(1)).min(2),
    })
    .optional(),
  closing: z.string().min(1).optional(),
});

export const pageSchema = z
  .object({
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
    highlight: pageHighlightSchema.optional(),
    capabilities: z.array(z.string().min(1)).min(1),
    capabilityDetails: z.array(z.string().min(1)).optional(),
    scenarios: z.array(z.string().min(1)).min(1),
    delivery: z.array(z.string().min(1)).min(1),
    draft: z.boolean().default(false),
    seoTitle: z.string().min(1),
    seoDescription: z.string().min(1),
    ogImage: z.string().startsWith('/assets/'),
  })
  .refine(
    (page) =>
      !page.capabilityDetails ||
      page.capabilityDetails.length === page.capabilities.length,
    {
      message: 'capabilityDetails must match capabilities one to one',
      path: ['capabilityDetails'],
    },
  );

export type SitePage = z.infer<typeof pageSchema>;
