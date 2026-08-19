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
    HOST: '127.0.0.1',
    PORT: '5180',
  });
  assert.equal(config.port, 5180);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.sessionSecret.length, 32);

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
