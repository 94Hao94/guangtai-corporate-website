import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createAccessHandler, startAccessServer } from '../lib/access-http.mjs';
import {
  createPasswordRecord,
  createSessionCodec,
} from '../lib/access-session.mjs';
import { readGatewayConfig } from '../server.mjs';

const FIXTURE_PASSWORD = 'integration-only-password';
const PUBLIC_ORIGIN = 'https://www.tjgtkj.cn';

function createFixture() {
  const logs = [];
  const sessionCodec = createSessionCodec({
    secret: Buffer.alloc(32, 4),
    now: () => 1_800_000_000_000,
    randomId: () => '0123456789abcdef0123456789abcdef',
  });
  const handler = createAccessHandler({
    passwordRecord: createPasswordRecord(FIXTURE_PASSWORD, {
      salt: Buffer.alloc(16, 6),
    }),
    sessionCodec,
    publicOrigin: PUBLIC_ORIGIN,
    publicOrigins: [PUBLIC_ORIGIN, 'https://tjgtkj.cn', 'https://127.0.0.1'],
    logger: (entry) => logs.push(entry),
  });
  return { handler, logs, password: FIXTURE_PASSWORD };
}

async function startFixture() {
  const fixture = createFixture();
  const server = await startAccessServer({
    host: '127.0.0.1',
    port: 0,
    handler: fixture.handler,
  });
  const address = server.address();
  return {
    ...fixture,
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function stopFixture(fixture) {
  fixture.server.close();
  await once(fixture.server, 'close');
}

async function request(fixture, path, options = {}) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    redirect: 'manual',
    ...options,
  });
  return {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
}

function formBody(fields) {
  return new URLSearchParams(fields).toString();
}

async function postForm(fixture, path, fields, headers = {}) {
  return request(fixture, path, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      origin: PUBLIC_ORIGIN,
      ...headers,
    },
    body: formBody(fields),
  });
}

/**
 * Sends a URL-encoded request through Node's raw HTTP client so Host and
 * Fetch Metadata headers reach the gateway unchanged.
 * @param {{baseUrl: string}} fixture Running gateway fixture.
 * @param {string} path Gateway path.
 * @param {Record<string, string>} fields URL-encoded form fields.
 * @param {Record<string, string>} headers Exact request headers.
 * @returns {Promise<{status: number, body: string, headers: Headers}>} Captured response.
 * @throws {Error} When the underlying HTTP request fails.
 */
async function postRawForm(fixture, path, fields, headers = {}) {
  const target = new URL(path, fixture.baseUrl);
  const body = formBody(fields);
  return new Promise((resolve, reject) => {
    const requestStream = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'content-length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: new Headers(response.headers),
          }),
        );
      },
    );
    requestStream.on('error', reject);
    requestStream.end(body);
  });
}

test('health is minimal and the login form never echoes submitted passwords', async () => {
  const fixture = await startFixture();
  try {
    const health = await request(fixture, '/healthz');
    assert.equal(health.status, 200);
    assert.equal(health.body, 'ok\n');
    assert.equal(health.headers.get('cache-control'), 'no-store');

    const page = await request(fixture, '/login');
    assert.equal(page.status, 200);
    assert.match(
      page.body,
      /<input[^>]+type="password"[^>]+autocomplete="current-password"/,
    );
    assert.match(page.headers.get('cache-control'), /no-store/);

    const denied = await postForm(fixture, '/login', {
      password: 'visible-test-secret',
    });
    assert.equal(denied.status, 401);
    assert.equal(denied.body.includes('visible-test-secret'), false);
    assert.equal(
      fixture.logs.join('\n').includes('visible-test-secret'),
      false,
    );
  } finally {
    await stopFixture(fixture);
  }
});

test('correct login creates a strict session accepted by check and cleared by logout', async () => {
  const fixture = await startFixture();
  try {
    const login = await postForm(fixture, '/login', {
      password: fixture.password,
    });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('location'), '/ai-factory/');
    const cookie = login.headers.get('set-cookie');
    assert.match(cookie, /^gt_factory_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);

    assert.equal(
      (await request(fixture, '/check', { headers: { cookie } })).status,
      204,
    );
    const logout = await postForm(fixture, '/logout', {}, { cookie });
    assert.equal(logout.status, 303);
    assert.equal(logout.headers.get('location'), '/factory-access');
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  } finally {
    await stopFixture(fixture);
  }
});

test('factory-access paths and invalid methods are handled consistently', async () => {
  const fixture = await startFixture();
  try {
    const page = await request(fixture, '/factory-access');
    assert.equal(page.status, 200);
    assert.match(page.body, /访问密码/);

    const wrongMethod = await request(fixture, '/check', { method: 'POST' });
    assert.equal(wrongMethod.status, 405);
    assert.match(wrongMethod.headers.get('allow'), /GET/);

    const unknown = await request(fixture, '/not-a-route');
    assert.equal(unknown.status, 404);
    assert.equal(unknown.body.includes('Error'), false);
  } finally {
    await stopFixture(fixture);
  }
});

test('login rejects external origins and fixed external return targets', async () => {
  const fixture = await startFixture();
  try {
    const externalOrigin = await postForm(
      fixture,
      '/login?returnTo=https%3A%2F%2Fevil.example',
      { password: fixture.password },
      { origin: 'https://evil.example' },
    );
    assert.equal(externalOrigin.status, 403);
    assert.equal(fixture.logs.at(-1).event, 'origin_denied');
    assert.equal(fixture.logs.at(-1).origin, 'https://evil.example');
    assert.equal(
      JSON.stringify(fixture.logs.at(-1)).includes('password'),
      false,
    );
    assert.equal(JSON.stringify(fixture.logs.at(-1)).includes('cookie'), false);

    const bareDomainOrigin = await postForm(
      fixture,
      '/login',
      { password: fixture.password },
      { origin: 'https://tjgtkj.cn' },
    );
    assert.equal(bareDomainOrigin.status, 303);

    const login = await postForm(
      fixture,
      '/login?returnTo=https://evil.example',
      {
        password: fixture.password,
      },
    );
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('location'), '/ai-factory/');
  } finally {
    await stopFixture(fixture);
  }
});

test('Chrome null origins require the deployed same-origin navigation metadata', async () => {
  const fixture = await startFixture();
  try {
    const accepted = await postRawForm(
      fixture,
      '/login',
      { password: fixture.password },
      {
        origin: 'null',
        host: 'www.tjgtkj.cn',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'sec-fetch-user': '?1',
      },
    );
    assert.equal(accepted.status, 303);

    for (const headers of [
      {
        origin: 'null',
        host: 'evil.example',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'sec-fetch-user': '?1',
      },
      {
        origin: 'null',
        host: 'www.tjgtkj.cn',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'document',
        'sec-fetch-user': '?1',
      },
      {
        origin: 'null',
        host: 'www.tjgtkj.cn',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
      },
    ]) {
      const rejected = await postRawForm(
        fixture,
        '/login',
        { password: fixture.password },
        headers,
      );
      assert.equal(rejected.status, 403);
    }
  } finally {
    await stopFixture(fixture);
  }
});

test('the sixth failed login from one address is rate limited', async () => {
  const fixture = await startFixture();
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await postForm(
        fixture,
        '/login',
        { password: `wrong-${attempt}` },
        { 'x-forwarded-for': '198.51.100.20' },
      );
      assert.equal(response.status, 401);
    }
    const limited = await postForm(
      fixture,
      '/login',
      { password: 'wrong-six' },
      { 'x-forwarded-for': '198.51.100.20' },
    );
    assert.equal(limited.status, 429);
    assert.match(limited.headers.get('retry-after'), /^\d+$/);

    const otherAddress = await postForm(
      fixture,
      '/login',
      { password: 'wrong-other' },
      { 'x-forwarded-for': '198.51.100.21' },
    );
    assert.equal(otherAddress.status, 401);
  } finally {
    await stopFixture(fixture);
  }
});

test('startAccessServer requires an explicit handler and loopback host', async () => {
  await assert.rejects(
    () => startAccessServer({ host: '0.0.0.0', port: 0 }),
    /handler is required/,
  );
  const server = http.createServer();
  server.close();
});

test('production startup validates required values without echoing secrets', () => {
  const secret = Buffer.alloc(32, 8).toString('base64url');
  const passwordRecord = createPasswordRecord(FIXTURE_PASSWORD, {
    salt: Buffer.alloc(16, 9),
  });
  const config = readGatewayConfig({
    FACTORY_ACCESS_PASSWORD_HASH: passwordRecord,
    FACTORY_SESSION_SECRET: secret,
    FACTORY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
    FACTORY_PUBLIC_ORIGINS: `${PUBLIC_ORIGIN},https://tjgtkj.cn`,
    HOST: '127.0.0.1',
    PORT: '5180',
  });
  assert.equal(config.port, 5180);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.sessionSecret.length, 32);
  assert.deepEqual(config.publicOrigins, [PUBLIC_ORIGIN, 'https://tjgtkj.cn']);

  const containerConfig = readGatewayConfig({
    FACTORY_ACCESS_PASSWORD_HASH: passwordRecord,
    FACTORY_SESSION_SECRET: secret,
    FACTORY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
    HOST: '0.0.0.0',
    PORT: '5180',
  });
  assert.equal(containerConfig.host, '0.0.0.0');

  assert.throws(
    () => readGatewayConfig({ FACTORY_SESSION_SECRET: secret }),
    (error) => {
      assert.match(error.message, /FACTORY_ACCESS_PASSWORD_HASH is required/);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
  assert.throws(
    () =>
      readGatewayConfig({
        FACTORY_ACCESS_PASSWORD_HASH: passwordRecord,
        FACTORY_SESSION_SECRET: 'short',
      }),
    /decode to exactly 32 bytes/,
  );
});
