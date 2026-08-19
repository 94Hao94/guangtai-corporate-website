import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyGatewayFlow } from '../verify-local.mjs';

test('verification driver records the protected flow without Cookie or password values', async () => {
  let authenticated = false;
  const ledger = [];
  const fakeFetch = async (url, options = {}) => {
    const path = new URL(url).pathname;
    if (path === '/factory-access/login' && options.method === 'POST') {
      const body = String(options.body);
      if (body.includes('wrong-test-password')) {
        return new Response('invalid_password\n', { status: 401 });
      }
      authenticated = true;
      return new Response(null, {
        status: 303,
        headers: {
          location: '/ai-factory/',
          'set-cookie': 'fixture-session=redacted',
        },
      });
    }
    if (path === '/factory-access/logout') {
      authenticated = false;
      return new Response(null, {
        status: 303,
        headers: { location: '/factory-access' },
      });
    }
    if (path === '/factory-access')
      return new Response('<form>', { status: 200 });
    if (path === '/ai-factory/' && !authenticated) {
      return new Response(null, {
        status: 302,
        headers: { location: '/factory-access' },
      });
    }
    if (path === '/ai-factory/' && authenticated)
      return new Response('<html>', { status: 200 });
    if (path === '/styles.css' && authenticated)
      return new Response('body{}', { status: 200 });
    if (path === '/api/status' && authenticated)
      return Response.json({ ok: true });
    return new Response('not found', { status: 404 });
  };

  const result = await verifyGatewayFlow({
    origin: 'http://fixture.local',
    password: 'secret-test-value',
    fetchImpl: fakeFetch,
    log: (entry) => ledger.push(entry),
  });

  assert.equal(result.length, 9);
  assert.deepEqual(
    result.map(({ method, path, status }) => `${method} ${path} ${status}`),
    [
      'GET /ai-factory/ 302',
      'GET /factory-access 200',
      'POST /factory-access/login 401',
      'POST /factory-access/login 303',
      'GET /ai-factory/ 200',
      'GET /styles.css 200',
      'GET /api/status 200',
      'POST /factory-access/logout 303',
      'GET /ai-factory/ 302',
    ],
  );
  assert.deepEqual(ledger, result);
  assert.equal(JSON.stringify(result).includes('secret-test-value'), false);
  assert.equal(JSON.stringify(result).includes('fixture-session'), false);
});
