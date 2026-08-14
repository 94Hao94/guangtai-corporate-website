import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../src/data/asset-manifest.json';
import { homeAssetPaths } from '../src/data/home';
import { resolveImage } from '../src/lib/images';

async function pageAssetPaths(): Promise<string[]> {
  const directory = resolve('src/content/pages');
  const assets = new Set<string>();
  const collect = (value: unknown): void => {
    if (typeof value === 'string' && value.startsWith('/assets/')) {
      assets.add(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(collect);
    }
  };
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.json')) continue;
    collect(JSON.parse(await readFile(resolve(directory, file), 'utf8')));
  }
  return [...assets];
}

describe('MVP asset migration', () => {
  it('keeps the Baidu site verification file at the public root', async () => {
    const verification = await readFile(
      resolve('public/baidu_verify_codeva-NEJM3vvrz6.html'),
      'utf8',
    );

    expect(verification).toBe('8cf64d84f5f06c47aece9dfac0214064');
  });

  it('keeps the production sitemap discoverable to search crawlers', async () => {
    const robots = await readFile(resolve('public/robots.txt'), 'utf8');

    expect(robots).toBe(
      [
        'User-agent: *',
        'Allow: /',
        '',
        'Sitemap: https://www.tjgtkj.cn/sitemap-index.xml',
        '',
      ].join('\n'),
    );
  });

  it('resolves every content and homepage image through Astro', async () => {
    const paths = new Set([...homeAssetPaths, ...(await pageAssetPaths())]);
    for (const path of paths) {
      expect(resolveImage(path)).toBeTruthy();
    }
    expect(manifest.map((entry) => entry.path).sort()).toEqual(
      [...paths].sort(),
    );
  });

  it('excludes the corrupted common engineering composition', async () => {
    expect(
      manifest.some((entry) => entry.path.includes('home-common-engineering')),
    ).toBe(false);
  });

  it('keeps an asset source record for the external visual family', async () => {
    const sourceFile = resolve('src/assets/mvp/visual-v2/SOURCES.md');
    expect((await stat(sourceFile)).isFile()).toBe(true);
    expect(await readFile(sourceFile, 'utf8')).toContain('Unsplash');
  });
});
