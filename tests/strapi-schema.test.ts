import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

const blockComponents = [
  'shared.hero',
  'shared.feature-list',
  'shared.card-grid',
  'shared.image-copy',
  'shared.partner-marquee',
  'shared.cta',
];

async function readSchema(path: string) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

describe('Strapi content model', () => {
  it('defines a publishable site page with the approved block allowlist', async () => {
    const schema = await readSchema(
      'cms/src/api/site-page/content-types/site-page/schema.json',
    );

    expect(schema.options.draftAndPublish).toBe(true);
    expect(schema.attributes.slug).toMatchObject({
      required: true,
      unique: true,
    });
    expect(schema.attributes.blocks.components).toEqual(blockComponents);
    expect(schema.attributes.images).toMatchObject({
      type: 'media',
      multiple: true,
      required: true,
    });
    expect(schema.attributes.hero.description).toContain('替代文本');
    expect(schema.attributes.ogImage.description).toContain('替代文本');
  });

  it('defines the home and site settings single types with the same block allowlist', async () => {
    const [home, settings] = await Promise.all([
      readSchema('cms/src/api/home-page/content-types/home-page/schema.json'),
      readSchema(
        'cms/src/api/site-setting/content-types/site-setting/schema.json',
      ),
    ]);

    expect(home.kind).toBe('singleType');
    expect(home.attributes.blocks.components).toEqual(blockComponents);
    expect(settings.kind).toBe('singleType');
    expect(settings.attributes.companyName.required).toBe(true);
  });

  it('defines exactly the six fixed shared blocks without an HTML field', async () => {
    const schemas = await Promise.all(
      [
        'hero',
        'feature-list',
        'card-grid',
        'image-copy',
        'partner-marquee',
        'cta',
      ].map((name) => readSchema(`cms/src/components/shared/${name}.json`)),
    );

    expect(schemas.map((schema) => schema.info.displayName)).toHaveLength(6);
    expect(
      schemas.flatMap((schema) => Object.keys(schema.attributes)),
    ).not.toContain('html');
    expect(schemas[2].attributes.columns.enum).toEqual([
      'two',
      'three',
      'four',
    ]);
    expect(schemas[3].attributes.image).toMatchObject({
      required: true,
      multiple: false,
    });
    expect(schemas[5].attributes).toMatchObject({
      heading: { required: true },
      label: { required: true },
      link: { required: true },
    });
  });

  it('rejects blank slugs and self-referencing parent paths before persistence', () => {
    const lifecycle = require('../cms/src/api/site-page/content-types/site-page/lifecycles.js');

    expect(() =>
      lifecycle.beforeCreate({ params: { data: { slug: '   ' } } }),
    ).toThrow('slug must not be empty');
    expect(() =>
      lifecycle.beforeCreate({
        params: { data: { slug: 'about', parentPath: '/about' } },
      }),
    ).toThrow('parentPath cannot reference the page itself');
  });

  it('keeps public permissions empty and documents the read-only Astro token', async () => {
    const [bootstrap, guide] = await Promise.all([
      readFile(resolve('cms/src/index.js'), 'utf8'),
      readFile(resolve('docs/cms/strapi-local-setup.md'), 'utf8'),
    ]);

    expect(bootstrap).toContain('does not seed grants');
    expect(guide).toContain('STRAPI_API_TOKEN');
    expect(guide).toContain('公开角色');
  });

  it('registers content API routes while leaving their public role ungranted', async () => {
    const routes = await Promise.all(
      ['site-page', 'home-page', 'site-setting'].map((name) =>
        readFile(resolve(`cms/src/api/${name}/routes/${name}.js`), 'utf8'),
      ),
    );

    expect(routes.every((source) => source.includes('createCoreRouter'))).toBe(
      true,
    );
  });
});
