import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_PARAMETERS = Object.freeze({ N: 16_384, r: 8, p: 1 });
const SCRYPT_OPTIONS = Object.freeze({
  ...SCRYPT_PARAMETERS,
  maxmem: 64 * 1024 * 1024,
});
const PASSWORD_RECORD_PARTS = 7;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;
const SESSION_SECRET_BYTES = 32;
const SESSION_SIGNATURE_BYTES = 32;
const DEFAULT_COOKIE_NAME = 'gt_factory_session';
const DEFAULT_TTL_SECONDS = 28_800;
const MAX_CLOCK_SKEW_SECONDS = 60;

/**
 * Creates a versioned salted scrypt password record.
 * @param {string} password Plain password received through a protected input path.
 * @param {{salt?: Buffer}} options Optional deterministic salt for tests.
 * @returns {string} Versioned scrypt record safe to store as a server secret.
 * @throws {TypeError|RangeError} When the password or salt violates the contract.
 */
export function createPasswordRecord(
  password,
  { salt = randomBytes(16) } = {},
) {
  const normalizedPassword = normalizePassword(password);
  if (!Buffer.isBuffer(salt) || salt.length !== PASSWORD_SALT_BYTES) {
    throw new RangeError('Password salt must be exactly 16 bytes.');
  }
  const derived = scryptSync(
    normalizedPassword,
    salt,
    PASSWORD_HASH_BYTES,
    SCRYPT_OPTIONS,
  );
  return [
    'scrypt',
    'v1',
    String(SCRYPT_PARAMETERS.N),
    String(SCRYPT_PARAMETERS.r),
    String(SCRYPT_PARAMETERS.p),
    encodeBase64Url(salt),
    encodeBase64Url(derived),
  ].join('$');
}

/**
 * Verifies a password against a canonical versioned scrypt record.
 * @param {string} password Candidate password.
 * @param {string} record Stored password record.
 * @returns {boolean} True only when the record is valid and the password matches.
 */
export function verifyPassword(password, record) {
  try {
    const normalizedPassword = normalizePassword(password);
    const parsed = parsePasswordRecord(record);
    if (!parsed) return false;
    const actual = scryptSync(
      normalizedPassword,
      parsed.salt,
      PASSWORD_HASH_BYTES,
      SCRYPT_OPTIONS,
    );
    return timingSafeEqual(actual, parsed.hash);
  } catch {
    return false;
  }
}

/**
 * Creates a stateless signed-session codec and Cookie serializer.
 * @param {{secret: Buffer, cookieName?: string, ttlSeconds?: number, now?: () => number, randomId?: () => string}} options Session configuration.
 * @returns {{issue: () => {token: string, setCookie: string}, verify: (token: string) => {ok: boolean, payload?: object}, clearCookie: () => string}} Session operations.
 * @throws {TypeError|RangeError} When the secret, Cookie name, or lifetime is invalid.
 */
export function createSessionCodec({
  secret,
  cookieName = DEFAULT_COOKIE_NAME,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  now = Date.now,
  randomId = () => encodeBase64Url(randomBytes(16)),
}) {
  if (!Buffer.isBuffer(secret) || secret.length !== SESSION_SECRET_BYTES) {
    throw new RangeError('Session secret must be exactly 32 bytes.');
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(cookieName)) {
    throw new TypeError('Cookie name contains unsupported characters.');
  }
  if (
    !Number.isSafeInteger(ttlSeconds) ||
    ttlSeconds < 60 ||
    ttlSeconds > 86_400
  ) {
    throw new RangeError(
      'Session lifetime must be between 60 and 86400 seconds.',
    );
  }

  /**
   * Issues a signed session and its strict Set-Cookie value.
   * @returns {{token: string, setCookie: string}} Signed token and Cookie header.
   */
  function issue() {
    const issuedAt = Math.floor(now() / 1000);
    const payload = {
      v: 1,
      iat: issuedAt,
      exp: issuedAt + ttlSeconds,
      jti: normalizeSessionId(randomId()),
    };
    const encodedPayload = encodeBase64Url(
      Buffer.from(JSON.stringify(payload), 'utf8'),
    );
    const signature = sign(encodedPayload, secret);
    const token = `${encodedPayload}.${encodeBase64Url(signature)}`;
    return {
      token,
      setCookie: serializeCookie(cookieName, token, ttlSeconds),
    };
  }

  /**
   * Validates a signed session token without throwing on attacker input.
   * @param {string} token Untrusted Cookie token.
   * @returns {{ok: boolean, payload?: object}} Validation result and canonical payload.
   */
  function verify(token) {
    try {
      if (typeof token !== 'string' || token.length > 2048)
        return { ok: false };
      const parts = token.split('.');
      if (parts.length !== 2) return { ok: false };
      const [encodedPayload, encodedSignature] = parts;
      const suppliedSignature = decodeBase64Url(encodedSignature);
      if (suppliedSignature.length !== SESSION_SIGNATURE_BYTES) {
        return { ok: false };
      }
      const expectedSignature = sign(encodedPayload, secret);
      if (!timingSafeEqual(suppliedSignature, expectedSignature)) {
        return { ok: false };
      }
      const payloadBuffer = decodeBase64Url(encodedPayload);
      const payload = JSON.parse(payloadBuffer.toString('utf8'));
      const currentTime = Math.floor(now() / 1000);
      if (!isValidSessionPayload(payload, currentTime, ttlSeconds)) {
        return { ok: false };
      }
      return { ok: true, payload };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Creates a Cookie header that removes the gateway session.
   * @returns {string} Strict expired Cookie header.
   */
  function clearCookie() {
    return serializeCookie(cookieName, '', 0);
  }

  return { issue, verify, clearCookie };
}

/**
 * Parses and validates a stored password record.
 * @param {string} record Stored record value.
 * @returns {{salt: Buffer, hash: Buffer}|null} Parsed record or null.
 */
function parsePasswordRecord(record) {
  if (typeof record !== 'string' || record.length > 512) return null;
  const parts = record.split('$');
  if (parts.length !== PASSWORD_RECORD_PARTS) return null;
  const [algorithm, version, n, r, p, saltValue, hashValue] = parts;
  if (
    algorithm !== 'scrypt' ||
    version !== 'v1' ||
    n !== String(SCRYPT_PARAMETERS.N) ||
    r !== String(SCRYPT_PARAMETERS.r) ||
    p !== String(SCRYPT_PARAMETERS.p)
  ) {
    return null;
  }
  const salt = decodeBase64Url(saltValue);
  const hash = decodeBase64Url(hashValue);
  if (
    salt.length !== PASSWORD_SALT_BYTES ||
    hash.length !== PASSWORD_HASH_BYTES
  ) {
    return null;
  }
  return { salt, hash };
}

/**
 * Normalizes a password while preserving exact Unicode code points.
 * @param {string} password Candidate password.
 * @returns {string} Accepted password.
 * @throws {TypeError|RangeError} When the value is not a bounded string.
 */
function normalizePassword(password) {
  if (typeof password !== 'string') {
    throw new TypeError('Password must be a string.');
  }
  const length = Buffer.byteLength(password, 'utf8');
  if (length < 1 || length > 256) {
    throw new RangeError('Password must be between 1 and 256 bytes.');
  }
  return password;
}

/**
 * Validates an issued random session identifier.
 * @param {string} value Candidate identifier.
 * @returns {string} Canonical identifier.
 * @throws {TypeError} When the identifier shape is unsafe.
 */
function normalizeSessionId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{16,96}$/.test(value)) {
    throw new TypeError('Session identifier is invalid.');
  }
  return value;
}

/**
 * Checks the signed payload schema and time bounds.
 * @param {unknown} payload Parsed JSON value.
 * @param {number} currentTime Current Unix timestamp in seconds.
 * @param {number} ttlSeconds Configured lifetime.
 * @returns {boolean} True when every signed field is canonical and current.
 */
function isValidSessionPayload(payload, currentTime, ttlSeconds) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    return false;
  const keys = Object.keys(payload).sort();
  if (keys.join(',') !== 'exp,iat,jti,v') return false;
  if (payload.v !== 1) return false;
  if (
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp)
  ) {
    return false;
  }
  if (payload.exp - payload.iat !== ttlSeconds) return false;
  if (payload.iat > currentTime + MAX_CLOCK_SKEW_SECONDS) return false;
  if (payload.exp <= currentTime) return false;
  return (
    typeof payload.jti === 'string' &&
    /^[A-Za-z0-9_-]{16,96}$/.test(payload.jti)
  );
}

/**
 * Signs an encoded payload with HMAC-SHA256.
 * @param {string} encodedPayload Canonical base64url payload.
 * @param {Buffer} secret Session signing secret.
 * @returns {Buffer} Raw signature bytes.
 */
function sign(encodedPayload, secret) {
  return createHmac('sha256', secret).update(encodedPayload, 'ascii').digest();
}

/**
 * Serializes the gateway Cookie with fixed security attributes.
 * @param {string} name Cookie name.
 * @param {string} value Cookie value.
 * @param {number} maxAge Lifetime in seconds.
 * @returns {string} Set-Cookie header value.
 */
function serializeCookie(name, value, maxAge) {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Encodes bytes as canonical unpadded base64url.
 * @param {Buffer} value Raw bytes.
 * @returns {string} Canonical encoded value.
 */
function encodeBase64Url(value) {
  return value.toString('base64url');
}

/**
 * Decodes canonical unpadded base64url.
 * @param {string} value Untrusted encoded value.
 * @returns {Buffer} Decoded bytes.
 * @throws {TypeError} When the value is not canonical base64url.
 */
function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new TypeError('Value is not canonical base64url.');
  }
  const decoded = Buffer.from(value, 'base64url');
  if (encodeBase64Url(decoded) !== value) {
    throw new TypeError('Value is not canonical base64url.');
  }
  return decoded;
}
