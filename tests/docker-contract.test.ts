import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Docker and Nginx delivery contract', () => {
  it('uses a Node builder and non-root Nginx runtime', async () => {
    const dockerfile = await readFile('Dockerfile', 'utf8');
    expect(dockerfile).toContain('FROM node:24-alpine AS');
    expect(dockerfile).toMatch(/ARG SITE_URL/);
    expect(dockerfile).toContain('npm ci');
    expect(dockerfile).toContain('npm run build');
    expect(dockerfile).toContain('nginxinc/nginx-unprivileged');
    expect(dockerfile).toContain('COPY --from=builder');
    expect(dockerfile).toContain('EXPOSE 8080');
    expect(dockerfile).toContain('HEALTHCHECK');
  });

  it('serves health, directory routes, 404, compression, and cache policy', async () => {
    const nginx = await readFile('docker/nginx.conf', 'utf8');
    expect(nginx).toContain('listen 8080');
    expect(nginx).toContain('location = /healthz');
    expect(nginx).toContain('try_files $uri $uri/ =404');
    expect(nginx).toContain('error_page 404 /404.html');
    expect(nginx).toContain('immutable');
    expect(nginx).toContain('gzip on');
    expect(nginx).toContain('Content-Security-Policy');
  });

  it('runs Compose with a read-only and capability-free container', async () => {
    const compose = await readFile('docker-compose.yml', 'utf8');
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('cap_drop:');
    expect(compose).toContain('- ALL');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).toContain('SITE_URL');
  });

  it('excludes source-only and reference directories from Docker context', async () => {
    const ignore = await readFile('.dockerignore', 'utf8');
    for (const path of ['node_modules', 'dist', '.git', '.worktrees', '网站']) {
      expect(ignore).toContain(path);
    }
  });
});
