import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createPasswordRecord,
  createSessionCodec,
  verifyPassword,
} from '../lib/access-session.mjs';

test('scrypt records verify the exact password without retaining plaintext', () => {
  const password = 'correct horse battery staple';
  const record = createPasswordRecord(password, { salt: Buffer.alloc(16, 7) });

  assert.match(record, /^scrypt\$v1\$16384\$8\$1\$/);
  assert.equal(record.includes(password), false);
  assert.equal(verifyPassword(password, record), true);
  assert.equal(verifyPassword('wrong password', record), false);
});

test('password records reject invalid password and record shapes', () => {
  assert.throws(() => createPasswordRecord(''), /between 1 and 256 bytes/);
  assert.throws(
    () => createPasswordRecord('x'.repeat(257)),
    /between 1 and 256 bytes/,
  );

  for (const record of [
    '',
    'scrypt$v2$16384$8$1$YWJj$ZGVm',
    'scrypt$v1$1$1$1$YWJj$ZGVm',
    'not-a-record',
  ]) {
    assert.equal(verifyPassword('anything', record), false);
  }
});

test('issued sessions are signed, expire, and use strict Cookie attributes', () => {
  let now = 1_800_000_000_000;
  const codec = createSessionCodec({
    secret: Buffer.alloc(32, 9),
    cookieName: 'gt_factory_session',
    ttlSeconds: 28_800,
    now: () => now,
    randomId: () => '0123456789abcdef0123456789abcdef',
  });

  const issued = codec.issue();
  assert.match(
    issued.setCookie,
    /^gt_factory_session=.+; Max-Age=28800; Path=\/; HttpOnly; Secure; SameSite=Strict$/,
  );
  assert.equal(codec.verify(issued.token).ok, true);
  assert.equal(codec.verify(`${issued.token}x`).ok, false);
  assert.match(
    codec.clearCookie(),
    /^gt_factory_session=; Max-Age=0; Path=\/; HttpOnly; Secure; SameSite=Strict$/,
  );

  now += 28_801_000;
  assert.equal(codec.verify(issued.token).ok, false);
});

test('sessions reject malformed, future, and wrong-version payloads', () => {
  let now = 1_800_000_000_000;
  const secret = Buffer.alloc(32, 3);
  const codec = createSessionCodec({
    secret,
    now: () => now,
    randomId: () => '0123456789abcdef0123456789abcdef',
  });

  for (const token of ['', '.', 'abc.def', `${codec.issue().token}.extra`]) {
    assert.equal(codec.verify(token).ok, false);
  }

  now -= 120_000;
  assert.equal(codec.verify(codec.issue().token).ok, true);
  now += 240_000;
  const futureCodec = createSessionCodec({
    secret,
    now: () => now + 120_000,
    randomId: () => 'fedcba9876543210fedcba9876543210',
  });
  const futureToken = futureCodec.issue().token;
  assert.equal(codec.verify(futureToken).ok, false);

  assert.throws(
    () => createSessionCodec({ secret: Buffer.alloc(31) }),
    /exactly 32 bytes/,
  );
});
