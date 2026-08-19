import http from 'node:http';
import { once } from 'node:events';
import { verifyPassword } from './access-session.mjs';

const BODY_LIMIT_BYTES = 1024;
const RATE_LIMIT_MAX_FAILURES = 5;
const RATE_LIMIT_WINDOW_MS = 20 * 60 * 1000;
const RATE_LIMIT_BLOCK_MS = 60 * 1000;
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const DEFAULT_PUBLIC_ORIGIN = 'https://www.tjgtkj.cn';

const SECURITY_HEADERS = Object.freeze({
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
});

/**
 * Creates the password gateway HTTP handler.
 * @param {{passwordRecord: string, sessionCodec: object, publicOrigin?: string, logger?: (entry: object) => void, now?: () => number}} config Gateway dependencies and policy.
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void>} HTTP request handler.
 * @throws {TypeError|RangeError} When required gateway dependencies are invalid.
 */
export function createAccessHandler({
  passwordRecord,
  sessionCodec,
  publicOrigin = DEFAULT_PUBLIC_ORIGIN,
  logger = () => {},
  now = Date.now,
}) {
  if (typeof passwordRecord !== 'string' || passwordRecord.length < 1) {
    throw new TypeError('passwordRecord is required.');
  }
  if (!sessionCodec || typeof sessionCodec.verify !== 'function') {
    throw new TypeError('sessionCodec is required.');
  }
  if (
    typeof publicOrigin !== 'string' ||
    !/^https:\/\/[^/]+$/.test(publicOrigin)
  ) {
    throw new TypeError('publicOrigin must be an HTTPS origin.');
  }
  if (typeof logger !== 'function')
    throw new TypeError('logger must be a function.');
  if (typeof now !== 'function') throw new TypeError('now must be a function.');

  const failures = new Map();

  /**
   * Handles one password-gateway request and fails closed on malformed input.
   * @param {import('node:http').IncomingMessage} req Incoming HTTP request.
   * @param {import('node:http').ServerResponse} res Outgoing HTTP response.
   * @returns {Promise<void>} Resolves after the response is complete.
   */
  return async function accessHandler(req, res) {
    const requestUrl = new URL(req.url || '/', 'http://gateway.local');
    const path = requestUrl.pathname;
    const method = req.method || 'GET';
    const address = requestAddress(req);

    try {
      if (path === '/healthz') {
        if (method !== 'GET') return sendMethodNotAllowed(res, 'GET');
        return sendText(res, 200, 'ok\n');
      }

      if (path === '/check' || path === '/_factory_auth_check') {
        if (method !== 'GET') return sendMethodNotAllowed(res, 'GET');
        const result = sessionCodec.verify(readCookie(req.headers.cookie));
        return result.ok
          ? sendEmpty(res, 204)
          : sendText(res, 401, 'authentication_required\n');
      }

      if (path === '/login' || path === '/factory-access') {
        if (method === 'GET') return sendLoginPage(res);
        if (method === 'POST') return await handleLogin(req, res, address);
        return sendMethodNotAllowed(res, 'GET, POST');
      }

      if (path === '/factory-access/login') {
        if (method !== 'POST') return sendMethodNotAllowed(res, 'POST');
        return await handleLogin(req, res, address);
      }

      if (path === '/logout' || path === '/factory-access/logout') {
        if (method !== 'POST') return sendMethodNotAllowed(res, 'POST');
        return sendRedirect(res, 303, '/factory-access', {
          'set-cookie': sessionCodec.clearCookie(),
        });
      }

      return sendText(res, 404, 'not_found\n');
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        return sendText(res, Number(error.status), `${error.code}\n`);
      }
      logger({ event: 'gateway_error', path, method, code: errorCode(error) });
      return sendText(res, 500, 'gateway_error\n');
    }

    async function handleLogin(request, response, clientAddress) {
      if (!isAllowedOrigin(request.headers.origin, publicOrigin)) {
        return sendText(response, 403, 'origin_forbidden\n');
      }

      const state = takeRateLimitState(failures, clientAddress, now());
      if (state.blockedUntil > now()) {
        return sendRateLimited(response, state.blockedUntil, now());
      }

      const contentType = String(
        request.headers['content-type'] || '',
      ).toLowerCase();
      if (!contentType.startsWith('application/x-www-form-urlencoded')) {
        return sendText(response, 415, 'unsupported_media_type\n');
      }

      const body = await readBoundedBody(request);
      const form = new URLSearchParams(body);
      const password = form.get('password') || '';
      const valid = verifyPassword(password, passwordRecord);
      if (!valid) {
        recordFailure(failures, clientAddress, now());
        logger({
          event: 'login_denied',
          path: request.url?.split('?')[0] || '/login',
        });
        const updated = failures.get(clientAddress);
        if (updated?.blockedUntil > now()) {
          return sendRateLimited(response, updated.blockedUntil, now());
        }
        return sendText(response, 401, 'invalid_password\n');
      }

      failures.delete(clientAddress);
      logger({ event: 'login_success' });
      const issued = sessionCodec.issue();
      return sendRedirect(response, 303, '/ai-factory/', {
        'set-cookie': issued.setCookie,
      });
    }
  };
}

/**
 * Starts a gateway server on a loopback address.
 * @param {{host?: string, port?: number, handler: Function}} config Listener configuration.
 * @returns {Promise<import('node:http').Server>} Listening HTTP server.
 * @throws {TypeError|RangeError} When handler, host, or port is invalid.
 */
export async function startAccessServer({
  host = '127.0.0.1',
  port = 5180,
  handler,
}) {
  if (typeof handler !== 'function')
    throw new TypeError('handler is required.');
  if (!['127.0.0.1', '0.0.0.0', '::1', 'localhost'].includes(host)) {
    throw new RangeError('Gateway host is unsupported.');
  }
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError('Gateway port is invalid.');
  }
  const server = http.createServer(handler);
  server.listen(port, host);
  await once(server, 'listening');
  return server;
}

/**
 * Sends a bounded login form with security headers.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @returns {void} No return value.
 */
function sendLoginPage(res) {
  const body = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>应用工厂访问验证</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0c2032;color:#f5f8fb;font:16px system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<main style="width:min(420px,calc(100% - 40px));padding:32px;border:1px solid #35556b;background:#122b40;box-sizing:border-box">
<p style="margin:0 0 12px;color:#61d8e7;font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em">GUANGTAI AI FACTORY</p>
<h1 style="margin:0 0 10px;font-size:28px;line-height:1.2">应用工厂访问验证</h1>
<p style="margin:0 0 24px;color:#b8cad7;line-height:1.6">输入访问密码后进入应用工厂。</p>
<form method="post" action="/factory-access/login" autocomplete="on">
<label for="password" style="display:block;margin-bottom:8px;color:#dce8ef">访问密码</label>
<input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus style="width:100%;min-height:46px;padding:0 12px;box-sizing:border-box;border:1px solid #52748a;background:#0c2032;color:#fff;font:inherit">
<button type="submit" style="margin-top:18px;min-height:46px;padding:0 18px;border:1px solid #61d8e7;background:#61d8e7;color:#0c2032;font:700 15px inherit;cursor:pointer">进入应用工厂</button>
</form></main></body></html>`;
  writeHeaders(res, 200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

/**
 * Reads a URL-encoded request body with a strict byte cap.
 * @param {import('node:http').IncomingMessage} req Incoming request stream.
 * @returns {Promise<string>} Bounded UTF-8 body.
 * @throws {Error} When the body exceeds the cap or is invalid UTF-8.
 */
async function readBoundedBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > BODY_LIMIT_BYTES) throw httpError(413, 'request_too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Returns the client address trusted from the local reverse proxy.
 * @param {import('node:http').IncomingMessage} req Incoming request.
 * @returns {string} Stable address key for rate limiting.
 */
function requestAddress(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || req.socket.remoteAddress || 'loopback';
}

/**
 * Checks an optional Origin header against the configured public origin.
 * @param {string|undefined} origin Candidate Origin.
 * @param {string} expected Expected HTTPS origin.
 * @returns {boolean} True when absent or exact.
 */
function isAllowedOrigin(origin, expected) {
  return !origin || origin === expected;
}

/**
 * Parses a single named Cookie without accepting duplicate names.
 * @param {string|undefined} header Cookie header.
 * @returns {string} Cookie value or empty string.
 */
function readCookie(header) {
  const matches = String(header || '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('gt_factory_session='));
  if (matches.length !== 1) return '';
  return matches[0].slice('gt_factory_session='.length);
}

/**
 * Gets or creates a bounded rate-limit record.
 * @param {Map<string, object>} map Rate-limit state map.
 * @param {string} address Client address key.
 * @param {number} timestamp Current milliseconds.
 * @returns {{failures: number, blockedUntil: number, lastSeen: number}} Current state.
 */
function takeRateLimitState(map, address, timestamp) {
  pruneRateLimits(map, timestamp);
  const current = map.get(address);
  if (current) {
    current.lastSeen = timestamp;
    return current;
  }
  const created = { failures: 0, blockedUntil: 0, lastSeen: timestamp };
  map.set(address, created);
  return created;
}

/**
 * Records a failed login and blocks after the fifth failure.
 * @param {Map<string, object>} map Rate-limit state map.
 * @param {string} address Client address key.
 * @param {number} timestamp Current milliseconds.
 * @returns {void} No return value.
 */
function recordFailure(map, address, timestamp) {
  const state = takeRateLimitState(map, address, timestamp);
  state.failures += 1;
  state.lastSeen = timestamp;
  if (state.failures > RATE_LIMIT_MAX_FAILURES) {
    state.blockedUntil = timestamp + RATE_LIMIT_BLOCK_MS;
  }
  if (map.size > RATE_LIMIT_MAX_ENTRIES) pruneRateLimits(map, timestamp, true);
}

/**
 * Removes stale entries and bounds memory use.
 * @param {Map<string, object>} map Rate-limit state map.
 * @param {number} timestamp Current milliseconds.
 * @param {boolean} forceBound Whether to evict oldest entries to the hard cap.
 * @returns {void} No return value.
 */
function pruneRateLimits(map, timestamp, forceBound = false) {
  for (const [address, state] of map) {
    if (timestamp - state.lastSeen > RATE_LIMIT_WINDOW_MS) map.delete(address);
  }
  if (!forceBound || map.size <= RATE_LIMIT_MAX_ENTRIES) return;
  const oldest = [...map.entries()]
    .sort(([, left], [, right]) => left.lastSeen - right.lastSeen)
    .slice(0, map.size - RATE_LIMIT_MAX_ENTRIES);
  for (const [address] of oldest) map.delete(address);
}

/**
 * Sends a response with shared security headers.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {number} status HTTP status.
 * @param {Record<string, string>} headers Additional headers.
 * @returns {void} No return value.
 */
function writeHeaders(res, status, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
}

/**
 * Sends a text response.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {number} status HTTP status.
 * @param {string} body Response body.
 * @param {Record<string, string>} headers Additional headers.
 * @returns {void} No return value.
 */
function sendText(res, status, body, headers = {}) {
  writeHeaders(res, status, {
    'content-type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

/**
 * Sends a no-body response.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {number} status HTTP status.
 * @returns {void} No return value.
 */
function sendEmpty(res, status) {
  writeHeaders(res, status);
  res.end();
}

/**
 * Sends a redirect with a fixed internal location.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {number} status HTTP redirect status.
 * @param {string} location Internal location.
 * @param {Record<string, string>} headers Additional headers.
 * @returns {void} No return value.
 */
function sendRedirect(res, status, location, headers = {}) {
  writeHeaders(res, status, { location, ...headers });
  res.end();
}

/**
 * Sends a method-not-allowed response.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {string} allowed Allowed method.
 * @returns {void} No return value.
 */
function sendMethodNotAllowed(res, allowed) {
  sendText(res, 405, 'method_not_allowed\n', { allow: allowed });
}

/**
 * Sends a rate-limit response with a bounded retry delay.
 * @param {import('node:http').ServerResponse} res Outgoing response.
 * @param {number} blockedUntil Block expiry in milliseconds.
 * @param {number} timestamp Current milliseconds.
 * @returns {void} No return value.
 */
function sendRateLimited(res, blockedUntil, timestamp) {
  const retryAfter = Math.max(1, Math.ceil((blockedUntil - timestamp) / 1000));
  sendText(res, 429, 'too_many_attempts\n', {
    'retry-after': String(retryAfter),
  });
}

/**
 * Creates a typed internal HTTP error.
 * @param {number} status HTTP status.
 * @param {string} code Stable internal code.
 * @returns {Error & {status: number, code: string}} Typed error.
 */
function httpError(status, code) {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  return error;
}

/**
 * Reduces an error to a non-sensitive log code.
 * @param {unknown} error Unknown error.
 * @returns {string} Stable error code.
 */
function errorCode(error) {
  return error && typeof error === 'object' && 'code' in error
    ? String(error.code)
    : 'internal_error';
}
