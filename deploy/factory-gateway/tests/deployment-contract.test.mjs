import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const fixtureRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function fixture(relativePath) {
  return readFile(path.join(fixtureRoot, relativePath), 'utf8');
}

test('compose and application patch expose no public factory ports', async () => {
  const compose = await fixture('compose.gateway.yml');
  const patch = await fixture('app-compose.loopback.patch');

  assert.match(compose, /127\.0\.0\.1:\$\{FACTORY_GATEWAY_PORT:-5180\}:5180/);
  assert.match(patch, /\+\s+- '127\.0\.0\.1:\$\{HOST_PORT:-5173\}:5173'/);
  assert.doesNotMatch(compose, /- '\$\{FACTORY_GATEWAY_PORT/);
  assert.match(compose, /HOST: 0\.0\.0\.0/);
});

test('gateway container is non-root, health checked, and read only', async () => {
  const dockerfile = await fixture('Dockerfile');
  const compose = await fixture('compose.gateway.yml');

  assert.match(dockerfile, /^FROM node:22-alpine/m);
  assert.match(dockerfile, /^USER node/m);
  assert.match(dockerfile, /^HEALTHCHECK /m);
  assert.doesNotMatch(dockerfile, /npm (ci|install)/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(compose, /no-new-privileges:true/);
});

test('nginx protects every deployed factory surface without a website catch-all', async () => {
  const nginx = await fixture('nginx/factory-access.conf');
  for (const route of [
    '/ai-factory/',
    '/api/',
    '/runtime.html',
    '/mobile.html',
    '/styles.css',
    '/brand-guangtai-white.png',
  ]) {
    assert.ok(nginx.includes(route), route);
  }
  assert.match(nginx, /auth_request \/_factory_auth_check;/);
  assert.match(nginx, /location = \/_factory_auth_check/);
  assert.doesNotMatch(nginx, /location \/ \{/);
  assert.doesNotMatch(nginx, /X-Auth-Proxy-Secret/i);
});

test('environment example declares names without secret values', async () => {
  const environment = await fixture('env.example');
  assert.match(environment, /^FACTORY_ACCESS_PASSWORD_HASH=$/m);
  assert.match(environment, /^FACTORY_SESSION_SECRET=$/m);
  assert.doesNotMatch(environment, /tjgtkj@123/);
});
