import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/mvp/**/*.{jpg,jpeg,png,webp}',
  { eager: true },
);

export function resolveImage(path: string): ImageMetadata {
  const key = `../assets/mvp/${path.replace(/^\/assets\//, '')}`;
  const image = modules[key]?.default;
  if (!image) throw new Error(`Unknown image asset: ${path}`);
  return image;
}
