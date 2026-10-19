# AI Factory Password Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the company website to the existing production AI application factory through a server-side password gate that protects every factory page, asset, runtime, and API request.

**Architecture:** Keep the deployed application factory business image unchanged. Add a dependency-free Node authentication gateway as an independent deployment overlay, use Nginx `auth_request` to protect the same-origin `/ai-factory/` route and the factory's exact root assets, and bind both upstream services to loopback addresses. Enable the existing website CTA only after gateway and routing contracts are covered by tests.

**Tech Stack:** Astro 7, TypeScript 6, Node.js 22 ESM and standard library, Node test runner, Docker Compose, Nginx `http_auth_request_module`, Vitest 4, Playwright 1.61

## Global Constraints

- Production website `current` was read-only verified as `/www/wwwroot/www.tjgtkj.cn/releases/033e158` before implementation.
- The production application factory remains on its deployed baseline; this change does not introduce PostgreSQL, MinIO, tenant migration, or a business-version upgrade.
- The public entry path is exactly `https://www.tjgtkj.cn/ai-factory/`.
- The password is never committed, embedded in frontend JavaScript, included in a command argument, written to logs, or copied into verification reports.
- Production stores only a versioned salted scrypt record and an independent 256-bit session secret.
- The session Cookie is named `gt_factory_session` and uses `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and an eight-hour lifetime.
- Factory upstream ports bind only to `127.0.0.1:5173` and `127.0.0.1:5180` after activation.
- Nginx protects `/ai-factory/`, `/api/`, `runtime.html`, `mobile.html`, `styles.css`, the factory brand image, and the exact deployed JavaScript module names; it does not claim unrelated website routes.
- Every production write step remains separately confirmed. Local implementation, tests, packages, diffs, verification records, and rollback readiness come first.
- Existing untracked workspace files are preserved and excluded from commits.

## File Map

| File                                                        | Responsibility                                                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `deploy/factory-gateway/lib/access-session.mjs`             | Parse and verify scrypt records; sign, verify, and expire session tokens.                      |
| `deploy/factory-gateway/lib/access-http.mjs`                | Render the password form, validate requests, rate-limit failures, and expose the HTTP handler. |
| `deploy/factory-gateway/server.mjs`                         | Validate environment variables and start the loopback HTTP server.                             |
| `deploy/factory-gateway/scripts/hash-password.mjs`          | Read a password from standard input and emit only its salted scrypt record.                    |
| `deploy/factory-gateway/tests/access-session.test.mjs`      | Cryptographic record and session-token unit contracts.                                         |
| `deploy/factory-gateway/tests/access-http.test.mjs`         | Login, Cookie, redirect, limit, health, and redaction integration contracts.                   |
| `deploy/factory-gateway/tests/deployment-contract.test.mjs` | Docker, Compose, Nginx, port, and protected-route static contracts.                            |
| `deploy/factory-gateway/Dockerfile`                         | Minimal non-root Node runtime for the password gateway.                                        |
| `deploy/factory-gateway/compose.gateway.yml`                | Loopback-only gateway service with read-only filesystem and health check.                      |
| `deploy/factory-gateway/app-compose.loopback.patch`         | Exact patch that changes the existing application factory host binding to loopback.            |
| `deploy/factory-gateway/env.example`                        | Variable names, validation rules, and secret-generation commands without values.               |
| `deploy/factory-gateway/nginx/factory-access.conf`          | Same-origin login, auth subrequest, factory proxy, assets, APIs, and error behavior.           |
| `deploy/factory-gateway/verify-local.mjs`                   | Reproducible HTTP verification against an isolated gateway and stub factory.                   |
| `src/components/pages/FactoryExperienceCta.astro`           | Enabled same-origin factory entry link and truthful availability copy.                         |
| `src/styles/inner-page.css`                                 | Link styling, focus state, hover state, and mobile sizing for the CTA.                         |
| `tests/rendered-site.test.ts`                               | Static HTML contract for the enabled link.                                                     |
| `tests/browser/site-smoke.spec.ts`                          | Browser accessibility and navigation contract for the CTA.                                     |
| `说明文档.md`                                               | Current implementation, verification, deployment, and rollback status.                         |

---

### Task 1: Password records and signed sessions

**Files:**

- Create: `deploy/factory-gateway/lib/access-session.mjs`
- Create: `deploy/factory-gateway/scripts/hash-password.mjs`
- Create: `deploy/factory-gateway/tests/access-session.test.mjs`

**Interfaces:**

- Produces: `createPasswordRecord(password, options?) -> string`
- Produces: `verifyPassword(password, record) -> boolean`
- Produces: `createSessionCodec({ secret, cookieName, ttlSeconds, now? }) -> { issue(), verify(), clearCookie() }`
- Consumes: Node `crypto` primitives only; no package dependency.

- [ ] **Step 1: Write failing password-record tests**

```js
test('scrypt records verify the exact password without retaining plaintext', () => {
  const record = createPasswordRecord('correct horse battery staple', {
    salt: Buffer.alloc(16, 7),
  });
  assert.match(record, /^scrypt\$v1\$16384\$8\$1\$/);
  assert.equal(record.includes('correct horse battery staple'), false);
  assert.equal(verifyPassword('correct horse battery staple', record), true);
  assert.equal(verifyPassword('wrong password', record), false);
});

test('malformed or unsupported records fail closed', () => {
  for (const record of ['', 'scrypt$v2$1$1$1$a$b', 'not-a-record']) {
    assert.equal(verifyPassword('anything', record), false);
  }
});
```

- [ ] **Step 2: Run the record tests and confirm the missing module failure**

Run: `node --test deploy/factory-gateway/tests/access-session.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `access-session.mjs`.

- [ ] **Step 3: Implement versioned scrypt records**

```js
export function createPasswordRecord(
  password,
  { salt = randomBytes(16) } = {},
) {
  const normalized = normalizePassword(password);
  const derived = scryptSync(normalized, salt, 32, SCRYPT_OPTIONS);
  return ['scrypt', 'v1', '16384', '8', '1', b64(salt), b64(derived)].join('$');
}

export function verifyPassword(password, record) {
  const parsed = parsePasswordRecord(record);
  if (!parsed) return false;
  const actual = scryptSync(
    normalizePassword(password),
    parsed.salt,
    32,
    SCRYPT_OPTIONS,
  );
  return (
    actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash)
  );
}
```

The implementation rejects empty passwords, passwords over 256 UTF-8 bytes, non-canonical base64url fields, wrong parameter values, and records whose decoded salt/hash lengths are not 16/32 bytes.

- [ ] **Step 4: Add failing signed-session tests**

```js
test('issued sessions are signed, expire after eight hours, and set strict Cookie attributes', () => {
  let now = 1_800_000_000_000;
  const codec = createSessionCodec({
    secret: Buffer.alloc(32, 9),
    cookieName: 'gt_factory_session',
    ttlSeconds: 28_800,
    now: () => now,
  });
  const issued = codec.issue();
  assert.match(
    issued.setCookie,
    /HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=28800/,
  );
  assert.equal(codec.verify(issued.token).ok, true);
  assert.equal(codec.verify(`${issued.token}x`).ok, false);
  now += 28_801_000;
  assert.equal(codec.verify(issued.token).ok, false);
});
```

- [ ] **Step 5: Implement the session codec**

Encode `{ v: 1, iat, exp, jti }` as canonical JSON with base64url, sign the encoded payload with HMAC-SHA256, compare signatures with `timingSafeEqual`, require a 32-byte secret, and reject future-issued, expired, malformed, or wrong-version tokens. `clearCookie()` emits the same Cookie attributes with `Max-Age=0`.

- [ ] **Step 6: Implement the stdin-only hash command**

```js
const password = (await readFile(0, 'utf8')).replace(/\r?\n$/, '');
process.stdout.write(`${createPasswordRecord(password)}\n`);
```

The command exits non-zero on empty or oversized input and never prints the input value.

- [ ] **Step 7: Run and format the crypto unit**

Run:

```bash
node --test deploy/factory-gateway/tests/access-session.test.mjs
npx prettier --check deploy/factory-gateway/lib/access-session.mjs deploy/factory-gateway/scripts/hash-password.mjs deploy/factory-gateway/tests/access-session.test.mjs
```

Expected: all tests pass and Prettier reports all files matched.

- [ ] **Step 8: Commit the crypto unit**

```bash
git add deploy/factory-gateway/lib/access-session.mjs deploy/factory-gateway/scripts/hash-password.mjs deploy/factory-gateway/tests/access-session.test.mjs
git commit -m "feat(factory): add password sessions"
```

### Task 2: HTTP password gateway and rate limiting

**Files:**

- Create: `deploy/factory-gateway/lib/access-http.mjs`
- Create: `deploy/factory-gateway/server.mjs`
- Create: `deploy/factory-gateway/tests/access-http.test.mjs`

**Interfaces:**

- Consumes: `verifyPassword()` and `createSessionCodec()` from Task 1.
- Produces: `createAccessHandler(config) -> (req, res) => Promise<void>`.
- Produces: `startAccessServer(config) -> Promise<http.Server>` for tests and the executable entry point.

- [ ] **Step 1: Write failing health, login-page, and wrong-password tests**

```js
test('health is minimal and the login form never echoes submitted passwords', async () => {
  const fixture = await startFixture();
  assert.deepEqual(await get(fixture, '/healthz'), {
    status: 200,
    body: 'ok\n',
  });
  const page = await get(fixture, '/login');
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
  assert.equal(fixture.logs.join('\n').includes('visible-test-secret'), false);
});
```

- [ ] **Step 2: Run the HTTP test and confirm the missing handler failure**

Run: `node --test deploy/factory-gateway/tests/access-http.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `access-http.mjs`.

- [ ] **Step 3: Implement bounded request parsing and the accessible login page**

The handler accepts only `application/x-www-form-urlencoded`, caps the body at 1024 bytes, enforces `Origin: https://www.tjgtkj.cn` when an Origin header is present, uses a single password field, and returns security headers:

```js
const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
};
```

- [ ] **Step 4: Add failing success, check, logout, and redirect tests**

```js
test('correct login creates a strict session accepted by check and cleared by logout', async () => {
  const fixture = await startFixture();
  const login = await postForm(fixture, '/login', {
    password: fixture.password,
  });
  assert.equal(login.status, 303);
  assert.equal(login.headers.get('location'), '/ai-factory/');
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /^gt_factory_session=/);
  assert.equal((await get(fixture, '/check', { cookie })).status, 204);
  const logout = await postForm(fixture, '/logout', {}, { cookie });
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});
```

- [ ] **Step 5: Implement login, check, and logout routes**

`POST /login` always redirects only to `/ai-factory/`. `GET /check` returns 204 for a valid Cookie and 401 otherwise. `POST /logout` clears the Cookie and redirects to `/factory-access`. Unknown routes return 404 text without stack traces.

- [ ] **Step 6: Add and implement failure limiting**

Tests issue six incorrect passwords from one loopback-simulated address. The first five return 401, the sixth returns 429 with `Retry-After`; a different address is unaffected. The implementation stores only `{ failures, blockedUntil, lastSeen }`, prunes entries older than 20 minutes, caps the map at 10,000 entries, and resets the address after a successful login.

- [ ] **Step 7: Add startup validation**

`server.mjs` requires `FACTORY_ACCESS_PASSWORD_HASH`, a base64url session secret decoding to exactly 32 bytes, `FACTORY_PUBLIC_ORIGIN=https://www.tjgtkj.cn`, `HOST=127.0.0.1`, and `PORT=5180`. Startup errors name only the missing variable, never its value.

- [ ] **Step 8: Run the gateway suite and syntax checks**

Run:

```bash
node --test deploy/factory-gateway/tests/access-session.test.mjs deploy/factory-gateway/tests/access-http.test.mjs
node --check deploy/factory-gateway/server.mjs
npx prettier --check deploy/factory-gateway
```

Expected: all tests pass, syntax succeeds, and formatting succeeds.

- [ ] **Step 9: Commit the HTTP unit**

```bash
git add deploy/factory-gateway/lib/access-http.mjs deploy/factory-gateway/server.mjs deploy/factory-gateway/tests/access-http.test.mjs
git commit -m "feat(factory): add access gateway"
```

### Task 3: Docker, Compose, and Nginx deployment contracts

**Files:**

- Create: `deploy/factory-gateway/Dockerfile`
- Create: `deploy/factory-gateway/compose.gateway.yml`
- Create: `deploy/factory-gateway/app-compose.loopback.patch`
- Create: `deploy/factory-gateway/env.example`
- Create: `deploy/factory-gateway/nginx/factory-access.conf`
- Create: `deploy/factory-gateway/tests/deployment-contract.test.mjs`

**Interfaces:**

- Consumes: gateway HTTP endpoints `/healthz`, `/login`, `/check`, and `/logout` from Task 2.
- Produces: loopback gateway `127.0.0.1:5180`, loopback factory `127.0.0.1:5173`, and an include file suitable for the existing `www.tjgtkj.cn` server block.

- [ ] **Step 1: Write failing deployment contract tests**

```js
test('compose and the application patch expose no public factory ports', async () => {
  const compose = await fixture('compose.gateway.yml');
  const patch = await fixture('app-compose.loopback.patch');
  assert.match(compose, /127\.0\.0\.1:\$\{FACTORY_GATEWAY_PORT:-5180\}:5180/);
  assert.match(patch, /\+\s+- '127\.0\.0\.1:\$\{HOST_PORT:-5173\}:5173'/);
  assert.doesNotMatch(compose, /- '\$\{FACTORY_GATEWAY_PORT/);
});

test('nginx protects every deployed factory surface without a generic website catch-all', async () => {
  const nginx = await fixture('nginx/factory-access.conf');
  for (const route of [
    '/ai-factory/',
    '/api/',
    '/runtime.html',
    '/mobile.html',
    '/styles.css',
  ]) {
    assert.ok(nginx.includes(route), route);
  }
  assert.match(nginx, /auth_request \/_factory_auth_check;/);
  assert.doesNotMatch(nginx, /location \/ \{/);
});
```

- [ ] **Step 2: Run the deployment test and confirm missing-file failures**

Run: `node --test deploy/factory-gateway/tests/deployment-contract.test.mjs`

Expected: FAIL with `ENOENT` for the deployment files.

- [ ] **Step 3: Create the non-root gateway image and hardened Compose service**

The Dockerfile uses `node:22-alpine`, copies only `server.mjs` and `lib/`, sets `USER node`, exposes 5180, and declares an HTTP health check. Compose sets read-only root, `/tmp` tmpfs, `cap_drop: ALL`, `no-new-privileges`, loopback port binding, and `unless-stopped` restart. Secret variables use required Compose expressions and do not receive defaults.

- [ ] **Step 4: Create the exact loopback patch**

```diff
@@
-      - '${HOST_PORT:-5173}:5173'
+      - '127.0.0.1:${HOST_PORT:-5173}:5173'
```

The deployment procedure applies it only after verifying the production Compose SHA and a successful `patch --dry-run`.

- [ ] **Step 5: Create the Nginx include**

The include defines:

- exact `/factory-access`, `/factory-access/login`, and `/factory-access/logout` gateway routes;
- internal `/_factory_auth_check` with no request body and Cookie forwarding;
- `/ai-factory` to `/ai-factory/` redirect;
- protected `/ai-factory/` proxy to `http://127.0.0.1:5173/`;
- protected `/api/`, `runtime.html`, `mobile.html`, `styles.css`, `brand-guangtai-white.png`, and a regex enumerating every currently deployed root JavaScript module;
- upstream timeouts compatible with existing long-running model requests;
- no secret-valued `proxy_set_header` directives and no generic root location.

- [ ] **Step 6: Document secret generation without values**

`env.example` contains:

```dotenv
FACTORY_ACCESS_PASSWORD_HASH=
FACTORY_SESSION_SECRET=
FACTORY_PUBLIC_ORIGIN=https://www.tjgtkj.cn
FACTORY_GATEWAY_PORT=5180
```

It documents interactive stdin hashing and `openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'` for the independent session secret.

- [ ] **Step 7: Run contract, Compose, Docker, and Nginx syntax checks**

Run:

```bash
node --test deploy/factory-gateway/tests/deployment-contract.test.mjs
FACTORY_ACCESS_PASSWORD_HASH="$(printf '%s' 'integration-only-password' | node deploy/factory-gateway/scripts/hash-password.mjs)" \
FACTORY_SESSION_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
FACTORY_PUBLIC_ORIGIN=https://www.tjgtkj.cn \
docker compose -f deploy/factory-gateway/compose.gateway.yml config
docker build -t guangtai-factory-access:test deploy/factory-gateway
```

For Nginx, create a disposable container config that includes `factory-access.conf` inside one test server block, then run `nginx -t` in `nginx:1.29-alpine`. Expected: every command exits 0.

- [ ] **Step 8: Commit deployment contracts**

```bash
git add deploy/factory-gateway/Dockerfile deploy/factory-gateway/compose.gateway.yml deploy/factory-gateway/app-compose.loopback.patch deploy/factory-gateway/env.example deploy/factory-gateway/nginx/factory-access.conf deploy/factory-gateway/tests/deployment-contract.test.mjs
git commit -m "chore(factory): add gateway deployment"
```

### Task 4: Enable the website experience link

**Files:**

- Modify: `src/components/pages/FactoryExperienceCta.astro:1-7`
- Modify: `src/styles/inner-page.css:421-456,984-990`
- Modify: `tests/rendered-site.test.ts:190-208`
- Modify: `tests/browser/site-smoke.spec.ts:712-728`

**Interfaces:**

- Produces: accessible anchor `href="/ai-factory/"` named “前去体验”.
- Consumes: Nginx entry route `/ai-factory/` from Task 3.

- [ ] **Step 1: Replace the static-output test with a failing enabled-link contract**

```ts
const experienceLink =
  factoryHtml.match(/<a\b[^>]*>\s*前去体验\s*<\/a>/)?.[0] ?? '';
expect(experienceLink).toContain('href="/ai-factory/"');
expect(experienceLink).not.toContain('aria-disabled');
expect(factoryHtml).toContain('安全验证后进入应用工厂');
```

- [ ] **Step 2: Run the rendered-site test and confirm failure**

Run: `npm run build && npm run test:rendered`

Expected: FAIL because output still contains the disabled button.

- [ ] **Step 3: Update the browser test to require an accessible link**

```ts
test('AI factory experience link is enabled and targets the protected entry', async ({
  page,
}) => {
  await page.goto('/guangtai-ai-factory/');
  const experienceLink = page.getByRole('link', { name: '前去体验' });
  await expect(experienceLink).toBeVisible();
  await expect(experienceLink).toHaveAttribute('href', '/ai-factory/');
  await experienceLink.focus();
  await expect(experienceLink).toBeFocused();
  await Promise.all([
    page.waitForURL(/\/ai-factory\/$/),
    experienceLink.press('Enter'),
  ]);
});
```

The local static preview may return its branded 404 for `/ai-factory/`; this contract verifies the keyboard navigation target rather than the production gateway response.

- [ ] **Step 4: Implement the CTA and styling**

```astro
<span>输入访问密码并通过安全验证后进入应用工厂。</span>
<a href="/ai-factory/">前去体验</a>
```

Change the shared selector from `.factory-experience button` to `.factory-experience a`, add `display: inline-flex`, centering, `text-decoration: none`, a visible `:focus-visible` outline, and a transform/color hover state that respects reduced motion. Remove disabled-only styles and update the mobile selector to the anchor.

- [ ] **Step 5: Run targeted website tests**

Run:

```bash
npx prettier --check src/components/pages/FactoryExperienceCta.astro src/styles/inner-page.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
npm run check
npm run build
npm run test:rendered
npx playwright test tests/browser/site-smoke.spec.ts --grep "AI factory experience link"
```

Expected: formatting, Astro checks, build, rendered tests, and the browser test all pass.

- [ ] **Step 6: Commit the website entry**

```bash
git add src/components/pages/FactoryExperienceCta.astro src/styles/inner-page.css tests/rendered-site.test.ts tests/browser/site-smoke.spec.ts
git commit -m "feat(factory): enable protected entry"
```

### Task 5: Isolated integration verification and operator artifacts

**Files:**

- Create: `deploy/factory-gateway/verify-local.mjs`
- Modify: `deploy/factory-gateway/tests/deployment-contract.test.mjs`
- Modify: `说明文档.md`

**Interfaces:**

- Consumes: gateway image, Compose file, Nginx include, and website output from Tasks 1-4.
- Produces: deterministic baseline/modified commands and literal status assertions suitable for the final verification record.

- [ ] **Step 1: Write a failing verification-driver contract**

The test imports `verifyGatewayFlow({ origin, password, fetchImpl })` and requires the driver to record these transitions without storing the password: unauthenticated factory 302, login page 200, wrong password 401, correct password 303 plus Cookie, authenticated factory 200, protected asset 200, protected API 200, logout 303, and post-logout factory 302.

- [ ] **Step 2: Implement the verification driver**

`verify-local.mjs` accepts the password only through standard input, keeps it in memory, writes status/method/path/exit data without request bodies or Cookie values, exits non-zero on the first unexpected result, and exports the flow function for tests.

- [ ] **Step 3: Run a disposable end-to-end stack**

Start three isolated services on loopback-only test ports: a stub factory returning known page/asset/API bodies, the gateway image, and an Nginx container using the production include with adjusted upstream ports. Execute `verify-local.mjs`, confirm its log contains all expected status transitions, and confirm `ss` or `lsof` reports no wildcard test listener.

- [ ] **Step 4: Run the complete local verification set**

Run:

```bash
node --test deploy/factory-gateway/tests/*.test.mjs
npm run check
npm test
SITE_URL=https://www.tjgtkj.cn npm run build
npm run test:rendered
npm run test:e2e:run
docker build -t guangtai-factory-access:test deploy/factory-gateway
git diff --check
```

Expected: all commands exit 0. Any flaky browser test is investigated and rerun only after its cause is recorded.

- [ ] **Step 5: Update project documentation**

Record implemented files, security boundaries, exact local verification counts, the continued production state, release prerequisites, and rollback behavior. Keep the task status “待部署” until the production activation and public verification both succeed.

- [ ] **Step 6: Commit integration and documentation**

```bash
git add deploy/factory-gateway/verify-local.mjs deploy/factory-gateway/tests/deployment-contract.test.mjs 说明文档.md
git commit -m "test(factory): verify protected flow"
```

### Task 6: Package, review, and prepare production rollback

**Files:**

- Create under ignored output: `output/factory-gateway-20260817/modified-artifact.tar.gz`
- Create under ignored output: `output/factory-gateway-20260817/factory-gateway.patch`
- Create under ignored output: `output/factory-gateway-20260817/verification.txt`
- Create under ignored output: `output/factory-gateway-20260817/rollback.sh`
- Create under ignored output: `output/factory-gateway-20260817/baseline-sha256.txt`
- Create under ignored output: `output/factory-gateway-20260817/deployment-report.md`

**Interfaces:**

- Consumes: reviewed implementation commits and read-only production baselines.
- Produces: the four required deliverable roles plus hashes and a deployment report.

- [ ] **Step 1: Re-read production baselines without writing**

Record the SHA-256 of the current Nginx server config and application Compose, the `current` symlink target, container image/status, and listeners. Confirm those values still match the design baseline or stop and reconcile the drift.

- [ ] **Step 2: Build the modified artifact and patch**

Create a tar archive containing the gateway overlay, verified website `dist/`, Nginx include, and exact loopback patch. Generate a binary-safe Git patch from the implementation branch base through HEAD. Hash every file and the archive.

- [ ] **Step 3: Write the verification record with literal evidence**

Include exact baseline and modified commands, inputs described by type rather than secret value, literal outputs, exit statuses, test counts, image ID, file hashes, and listeners. Do not include password, password hash, session secret, Cookie, or existing `.env` values.

- [ ] **Step 4: Write a guarded rollback script**

The script requires the recorded backup directory, verifies backup hashes, restores the website symlink, Nginx config, and original application Compose, runs `nginx -t`, recreates the original application container without removing volumes, reloads Nginx, and prints post-rollback checks. Every destructive path is guarded by exact expected paths and hashes.

- [ ] **Step 5: Reopen and execute every artifact role**

Run `tar -tzf` and extract the modified artifact to a temporary directory, apply the patch to a clean worktree, parse the verification record assertions, and run `bash -n` plus a read-only readiness mode on `rollback.sh`. Expected: all four roles reopen successfully and every readiness command exits 0.

- [ ] **Step 6: Perform final diff and secret review**

Search tracked files and output reports for the password and for forbidden secret assignments, inspect the whole branch diff, verify only planned paths changed, and confirm no existing untracked files were added.

- [ ] **Step 7: Stop for production confirmation**

Report the implementation commits, test evidence, artifact paths, exact production files that will be backed up or changed, expected interruption window, and the rollback command. Wait for explicit confirmation before the first production write.

## Production Activation Checkpoints

These checkpoints execute only after Task 6 and separate user confirmation at each write boundary.

1. **Backup checkpoint:** create a timestamped remote backup directory; copy the current Nginx config and application Compose; record SHA-256; record the website `current` target; do not copy `.env` contents into logs.
2. **Upload checkpoint:** upload the verified gateway overlay and new website release without switching traffic; re-hash against the local manifest.
3. **Secret checkpoint:** generate the session secret on the server and store only the password's salted hash and required gateway variables with mode 600; print key names, not values.
4. **Container checkpoint:** build/start the gateway, apply the loopback Compose patch, recreate only the application container, and verify both upstreams from localhost before changing Nginx.
5. **Nginx checkpoint:** install the include, insert its include directive into the existing server block, run `nginx -t`, and hot reload.
6. **Website checkpoint:** atomically switch `current` to the new verified release.
7. **Public verification checkpoint:** verify unauthenticated denial, wrong-password denial, successful login, protected assets/APIs/runtimes, logout, port closure, website pages, HTTP redirect, Baidu verification file, 404, and container health.
8. **Completion checkpoint:** update both project documents, store the final report and rollback evidence, and save the important deployment decision to agentmemory without any secret material.
