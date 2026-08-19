import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createAccessHandler, startAccessServer } from './lib/access-http.mjs';
import { createSessionCodec } from './lib/access-session.mjs';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 5180;
const DEFAULT_ORIGIN = 'https://www.tjgtkj.cn';

/**
 * Reads and validates gateway environment configuration without exposing values.
 * @param {NodeJS.ProcessEnv} env Process environment.
 * @returns {{host: string, port: number, publicOrigin: string, passwordRecord: string, sessionSecret: Buffer}} Validated configuration.
 * @throws {Error} When a required value is missing or invalid.
 */
export function readGatewayConfig(env = process.env) {
  const passwordRecord = requireEnvironmentValue(
    env,
    'FACTORY_ACCESS_PASSWORD_HASH',
  );
  const encodedSecret = requireEnvironmentValue(env, 'FACTORY_SESSION_SECRET');
  const publicOrigin = env.FACTORY_PUBLIC_ORIGIN || DEFAULT_ORIGIN;
  const host = env.HOST || DEFAULT_HOST;
  const port = Number(env.PORT || DEFAULT_PORT);

  if (!['127.0.0.1', '0.0.0.0', '::1', 'localhost'].includes(host)) {
    throw new Error(
      'HOST must be a supported container or loopback interface.',
    );
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  if (!/^https:\/\/[^/]+$/.test(publicOrigin)) {
    throw new Error('FACTORY_PUBLIC_ORIGIN must be an HTTPS origin.');
  }

  const sessionSecret = decodeSessionSecret(encodedSecret);
  return { host, port, publicOrigin, passwordRecord, sessionSecret };
}

/**
 * Starts the password gateway from validated process environment values.
 * @param {NodeJS.ProcessEnv} env Process environment.
 * @returns {Promise<import('node:http').Server>} Listening HTTP server.
 * @throws {Error} When configuration validation or listener startup fails.
 */
export async function startFromEnvironment(env = process.env) {
  const config = readGatewayConfig(env);
  const sessionCodec = createSessionCodec({ secret: config.sessionSecret });
  const handler = createAccessHandler({
    passwordRecord: config.passwordRecord,
    sessionCodec,
    publicOrigin: config.publicOrigin,
    logger: logEvent,
  });
  const server = await startAccessServer({
    host: config.host,
    port: config.port,
    handler,
  });
  logEvent({ event: 'gateway_started', host: config.host, port: config.port });
  return server;
}

/**
 * Emits a structured gateway event without request secrets.
 * @param {Record<string, unknown>} entry Bounded event fields.
 * @returns {void} No return value.
 */
function logEvent(entry) {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'INFO', module: 'factory-access', ...entry })}\n`,
  );
}

/**
 * Requires a non-empty environment value and reports only its key.
 * @param {NodeJS.ProcessEnv} env Process environment.
 * @param {string} key Required key.
 * @returns {string} Environment value.
 * @throws {Error} When the key is empty or missing.
 */
function requireEnvironmentValue(env, key) {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

/**
 * Decodes a canonical 32-byte base64url session secret.
 * @param {string} value Encoded secret.
 * @returns {Buffer} Raw secret bytes.
 * @throws {Error} When the value is not canonical or not exactly 32 bytes.
 */
function decodeSessionSecret(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('FACTORY_SESSION_SECRET must be canonical base64url.');
  }
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== 32 || decoded.toString('base64url') !== value) {
    throw new Error('FACTORY_SESSION_SECRET must decode to exactly 32 bytes.');
  }
  return decoded;
}

const isEntrypoint = process.argv[1]
  ? fileURLToPath(import.meta.url) === resolve(process.argv[1])
  : false;

if (isEntrypoint) {
  await startFromEnvironment();
}
