import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('local Strapi Compose stack', () => {
  it('keeps PostgreSQL private while persisting CMS data and uploads', async () => {
    const compose = await readFile(resolve('docker-compose.cms.yml'), 'utf8');

    expect(compose).toContain('postgres:16-alpine');
    expect(compose).toContain('127.0.0.1:1337:1337');
    expect(compose).not.toMatch(/5432:5432/);
    expect(compose).toContain('strapi-postgres-data');
    expect(compose).toContain('strapi-uploads');
    expect(compose).toContain('./src/assets/mvp:/opt/import-assets:ro');
    expect(compose).toContain('./src/content/pages:/opt/import-pages:ro');
  });

  it('installs the pinned CMS dependency graph in the runtime image', async () => {
    const dockerfile = await readFile(resolve('cms/Dockerfile'), 'utf8');

    expect(dockerfile).toContain('COPY package.json package-lock.json ./');
    expect(dockerfile).toContain('RUN npm ci --omit=dev');
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).toContain('CMD ["npm", "run", "start"]');
    expect(dockerfile).not.toContain('CMD ["npm", "run", "develop"]');
  });

  it('keeps local dependencies and secrets out of the build context', async () => {
    const dockerignore = await readFile(resolve('cms/.dockerignore'), 'utf8');

    expect(dockerignore).toContain('node_modules');
    expect(dockerignore).toContain('.env');
  });

  it('documents how to start and secure the local editor environment', async () => {
    const guide = await readFile(
      resolve('docs/cms/strapi-local-setup.md'),
      'utf8',
    );

    expect(guide).toContain('cp cms/.env.example cms/.env');
    expect(guide).toContain(
      'docker compose -f docker-compose.cms.yml up -d --build',
    );
    expect(guide).toContain('http://127.0.0.1:1337/admin');
    expect(guide).toContain('5432');
  });

  it('keeps Strapi CommonJS files outside the Astro type-check scope', async () => {
    const tsconfig = JSON.parse(
      await readFile(resolve('tsconfig.json'), 'utf8'),
    );

    expect(tsconfig.exclude).toContain('cms');
  });
});
