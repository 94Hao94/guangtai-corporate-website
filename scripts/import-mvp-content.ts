import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

interface MvpPage {
  path: string;
  template: 'overview' | 'detail' | 'brand';
  title: string;
  english: string;
  category: string;
  visualFamily: 'platform' | 'common' | 'higher' | 'k12' | 'brand';
  heroPosition?: string;
  heroFit?: 'cover' | 'contain';
  parentPath?: string;
  intro: string;
  positioning: string;
  hero: string;
  images: [string, string];
  capabilities: string[];
  scenarios: string[];
  delivery: string[];
}

const sourceArgument = process.argv[2];
if (!sourceArgument) {
  throw new Error(
    'Usage: npm run import:mvp-content -- <path-to-mvp-pages.ts>',
  );
}

const sourcePath = resolve(sourceArgument);
const sourceModule = (await import(pathToFileURL(sourcePath).href)) as {
  sitePages?: MvpPage[];
};
if (!Array.isArray(sourceModule.sitePages)) {
  throw new Error(`No sitePages array exported by ${sourcePath}`);
}

const outputDirectory = resolve('src/content/pages');
await mkdir(outputDirectory, { recursive: true });
for (const file of await readdir(outputDirectory)) {
  if (file.endsWith('.json')) await unlink(resolve(outputDirectory, file));
}

const pages = [...sourceModule.sitePages].sort((a, b) =>
  a.path.localeCompare(b.path),
);
for (const page of pages) {
  const id = page.path.slice(1).replaceAll('/', '--');
  const output = {
    ...page,
    id,
    draft: false,
    seoTitle: `${page.title} | 天津光泰科技集团`,
    seoDescription: page.intro,
    ogImage: page.hero,
  };
  await writeFile(
    resolve(outputDirectory, `${id}.json`),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
  );
}

console.log(
  `Imported ${pages.length} pages from ${basename(sourcePath)} into ${outputDirectory}`,
);
