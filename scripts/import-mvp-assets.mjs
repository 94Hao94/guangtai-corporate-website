import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const sourceArgument = process.argv[2];
if (!sourceArgument) {
  throw new Error('Usage: node scripts/import-mvp-assets.mjs <mvp-assets-dir>');
}

const sourceDirectory = resolve(sourceArgument);
const pagesDirectory = resolve('src/content/pages');
const outputDirectory = resolve('src/assets/mvp');
const sourcesPath = resolve(sourceDirectory, 'visual-v2/SOURCES.md');

const homepageAssets = [
  '/assets/hero-humanoid-ai-campus.png',
  '/assets/visual-v2/common-delivery.jpg',
  '/assets/visual-v2/higher-campus-students.jpg',
  '/assets/ai-factory.png',
  '/assets/embodied-intelligence.png',
  '/assets/higher-teaching.png',
  '/assets/k12-campus.png',
];

function collectAssets(value, assets) {
  if (typeof value === 'string' && value.startsWith('/assets/')) {
    assets.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectAssets(item, assets);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectAssets(item, assets);
  }
}

const assets = new Set(homepageAssets);
for (const file of await readdir(pagesDirectory)) {
  if (!file.endsWith('.json')) continue;
  collectAssets(
    JSON.parse(await readFile(resolve(pagesDirectory, file), 'utf8')),
    assets,
  );
}
assets.delete('/assets/visual-v2/home-common-engineering.png');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

let sources = '';
try {
  sources = await readFile(sourcesPath, 'utf8');
} catch {
  sources = '';
}

const manifest = [];
for (const assetPath of [...assets].sort()) {
  const relativePath = assetPath.replace('/assets/', '');
  const source = resolve(sourceDirectory, relativePath);
  const destination = resolve(outputDirectory, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  manifest.push({
    path: assetPath,
    provenance: sources.includes(`${relativePath.split('/').at(-1)}`)
      ? 'external-documented'
      : 'project-provided',
  });
}

await writeFile(
  resolve('src/data/asset-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
);
if (sources) {
  await mkdir(resolve(outputDirectory, 'visual-v2'), { recursive: true });
  await writeFile(
    resolve(outputDirectory, 'visual-v2/SOURCES.md'),
    sources,
    'utf8',
  );
}

console.log(
  `Imported ${manifest.length} audited assets into ${outputDirectory}`,
);
