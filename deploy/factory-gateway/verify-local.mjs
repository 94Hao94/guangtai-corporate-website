import { readFile } from 'node:fs/promises';
import process from 'node:process';

/**
 * Verifies the gateway flow without recording passwords or Cookie values.
 * @param {{origin: string, password: string, fetchImpl?: typeof fetch, log?: (entry: object) => void}} options Verification inputs and injectable HTTP client.
 * @returns {Promise<Array<{method: string, path: string, status: number}>>} Redacted status ledger.
 * @throws {Error} When any expected transition is not observed.
 */
export async function verifyGatewayFlow({
  origin,
  password,
  fetchImpl = fetch,
  log = () => {},
}) {
  if (!/^https?:\/\/[^/]+$/.test(origin))
    throw new Error('origin must be an HTTP origin.');
  if (typeof password !== 'string' || password.length < 1)
    throw new Error('password is required.');

  const ledger = [];
  let cookie = '';
  async function call(method, path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (cookie) headers.set('cookie', cookie);
    const response = await fetchImpl(`${origin}${path}`, {
      redirect: 'manual',
      ...options,
      method,
      headers,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';', 1)[0];
    const entry = { method, path, status: response.status };
    ledger.push(entry);
    log(entry);
    return response;
  }

  expectStatus(
    await call('GET', '/ai-factory/'),
    302,
    'unauthenticated factory',
  );
  expectStatus(await call('GET', '/factory-access'), 200, 'login page');
  expectStatus(
    await call('POST', '/factory-access/login', {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin,
      },
      body: new URLSearchParams({ password: 'wrong-test-password' }),
    }),
    401,
    'wrong password',
  );
  expectStatus(
    await call('POST', '/factory-access/login', {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        origin,
      },
      body: new URLSearchParams({ password }),
    }),
    303,
    'correct password',
  );
  expectStatus(await call('GET', '/ai-factory/'), 200, 'authenticated factory');
  expectStatus(await call('GET', '/styles.css'), 200, 'protected asset');
  expectStatus(await call('GET', '/api/status'), 200, 'protected API');
  expectStatus(await call('POST', '/factory-access/logout'), 303, 'logout');
  expectStatus(await call('GET', '/ai-factory/'), 302, 'post-logout factory');
  return ledger;
}

/**
 * Checks one expected HTTP status and produces a stable failure.
 * @param {Response} response HTTP response.
 * @param {number} expected Expected status.
 * @param {string} step Human-readable transition name.
 * @returns {void} No return value.
 * @throws {Error} When the response does not match.
 */
function expectStatus(response, expected, step) {
  if (response.status !== expected) {
    throw new Error(
      `${step}: expected ${expected}, received ${response.status}`,
    );
  }
}

/**
 * Runs the verifier with a password supplied only through standard input.
 * @returns {Promise<void>} Resolves after verification succeeds.
 * @throws {Error} When stdin or a request transition is invalid.
 */
async function main() {
  const origin = process.env.VERIFY_ORIGIN || 'http://127.0.0.1:8088';
  const password = (await readFile(0, 'utf8')).replace(/\r?\n$/, '');
  const ledger = await verifyGatewayFlow({
    origin,
    password,
    log: (entry) => process.stdout.write(`${JSON.stringify(entry)}\n`),
  });
  process.stdout.write(`verified_transitions=${ledger.length}\n`);
}

if (process.argv[1] && process.argv[1].endsWith('/verify-local.mjs')) {
  await main();
}
