import { readdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const legacyPagesDirectory =
  process.env.LEGACY_PAGES_DIRECTORY ??
  resolve(import.meta.dirname, '../../src/content/pages');
const legacyAssetsDirectory =
  process.env.LEGACY_ASSETS_DIRECTORY ??
  resolve(import.meta.dirname, '../../src/assets/mvp');
const pageUid = 'api::site-page.site-page';

/**
 * Returns an appropriate image MIME type from a local asset path.
 * @param {string} sourcePath Local path to the uploaded image.
 * @returns {string} MIME type accepted by Strapi's upload service.
 */
function imageMimeType(sourcePath) {
  if (sourcePath.endsWith('.png')) return 'image/png';
  if (sourcePath.endsWith('.webp')) return 'image/webp';
  if (sourcePath.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

/**
 * Converts a legacy public asset URL into its read-only source file path.
 * @param {string} assetUrl Legacy `/assets/` URL.
 * @returns {string} Local source file path for the container-bound migration directory.
 * @throws {Error} When the URL is not a local legacy asset URL.
 */
function resolveLegacyAsset(assetUrl) {
  if (!assetUrl.startsWith('/assets/')) {
    throw new Error(`Cannot import non-local asset: ${assetUrl}`);
  }

  return resolve(legacyAssetsDirectory, assetUrl.slice('/assets/'.length));
}

/**
 * Uploads one local asset once and returns its Strapi media identifier.
 * @param {import('@strapi/strapi').Core.Strapi} strapi Loaded Strapi application.
 * @param {string} assetUrl Legacy public asset URL.
 * @param {string} alternativeText Accessible description assigned to the upload.
 * @param {Map<string, number>} uploadCache Per-run asset-to-ID cache.
 * @returns {Promise<number>} Strapi upload record ID.
 * @throws {Error} When the source file or upload result is missing.
 */
async function uploadLegacyAsset(
  strapi,
  assetUrl,
  alternativeText,
  uploadCache,
) {
  const cached = uploadCache.get(assetUrl);
  if (cached) return cached;

  const sourcePath = resolveLegacyAsset(assetUrl);
  const metadata = await stat(sourcePath);
  const uploadService = strapi.plugin('upload').service('upload');
  const [uploaded] = await uploadService.upload({
    data: { fileInfo: { alternativeText, caption: alternativeText } },
    files: {
      filepath: sourcePath,
      originalFilename: assetUrl.split('/').at(-1),
      mimetype: imageMimeType(sourcePath),
      size: metadata.size,
    },
  });

  if (!uploaded?.id) {
    throw new Error(`Strapi did not return an upload ID for ${assetUrl}`);
  }

  uploadCache.set(assetUrl, uploaded.id);
  return uploaded.id;
}

/**
 * Reads the existing JSON page corpus in a stable filename order.
 * @returns {Promise<Array<Record<string, unknown>>>} Legacy page records used as the CMS migration baseline.
 * @throws {Error} When a source file cannot be parsed as JSON.
 */
export async function readLegacyPages() {
  const fileNames = (await readdir(legacyPagesDirectory))
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    fileNames.map(async (fileName) => {
      const source = await readFile(
        resolve(legacyPagesDirectory, fileName),
        'utf8',
      );
      return JSON.parse(source);
    }),
  );
}

/**
 * Converts legacy page JSON into Strapi scalar payloads without mutating CMS data.
 * @returns {Promise<Array<Record<string, unknown>>>} Deterministic page payloads ready for media resolution and import.
 * @throws {Error} When a legacy path is not an absolute website route.
 */
export async function exportPages() {
  const pages = await readLegacyPages();

  return pages.map((page) => {
    if (typeof page.path !== 'string' || !page.path.startsWith('/')) {
      throw new Error('Legacy page path must start with /');
    }

    return {
      slug: page.path.slice(1),
      template: page.template,
      title: page.title,
      english: page.english,
      category: page.category,
      visualFamily: page.visualFamily,
      parentPath: page.parentPath ?? null,
      intro: page.intro,
      positioning: page.positioning,
      capabilities: page.capabilities,
      scenarios: page.scenarios,
      delivery: page.delivery,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      blocks: [],
      sourceMedia: {
        hero: page.hero,
        images: page.images,
        ogImage: page.ogImage,
      },
    };
  });
}

/**
 * Imports the exported page corpus through Strapi's internal document and upload services.
 * @param {{ replace: boolean }} options Import safety controls.
 * @returns {Promise<number>} Number of published pages created.
 * @throws {Error} When replacement was not explicitly authorized or a duplicate slug exists.
 */
export async function importCurrentContent({ replace }) {
  if (!replace) {
    throw new Error('Refusing to import without --replace');
  }

  const { compileStrapi, createStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const strapi = await createStrapi(appContext).load();
  const uploadCache = new Map();

  try {
    const pages = await exportPages();

    for (const page of pages) {
      const existing = await strapi.documents(pageUid).findMany({
        filters: { slug: page.slug },
      });

      if (existing.length > 0) {
        await strapi
          .documents(pageUid)
          .delete({ documentId: existing[0].documentId });
      }

      const hero = await uploadLegacyAsset(
        strapi,
        page.sourceMedia.hero,
        `${page.title} 主视觉`,
        uploadCache,
      );
      const images = await Promise.all(
        page.sourceMedia.images.map((assetUrl, index) =>
          uploadLegacyAsset(
            strapi,
            assetUrl,
            `${page.title} 内容图 ${index + 1}`,
            uploadCache,
          ),
        ),
      );
      const ogImage = await uploadLegacyAsset(
        strapi,
        page.sourceMedia.ogImage,
        `${page.title} 分享图`,
        uploadCache,
      );
      const { sourceMedia, ...data } = page;

      await strapi.documents(pageUid).create({
        data: { ...data, hero, images, ogImage },
        status: 'published',
      });
    }

    return pages.length;
  } finally {
    await strapi.destroy();
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const imported = await importCurrentContent({
    replace: process.argv.includes('--replace'),
  });
  console.log(`Imported ${imported} published site pages.`);
}
