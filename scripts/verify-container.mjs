const origin = process.env.CONTAINER_URL ?? 'http://127.0.0.1:8080';

async function request(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, origin), {
    headers: { 'accept-encoding': 'gzip' },
  });
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path}: expected ${expectedStatus}, got ${response.status}`,
    );
  }
  return response;
}

const health = await request('/healthz');
if ((await health.text()).trim() !== 'ok')
  throw new Error('Invalid health body');

for (const path of [
  '/',
  '/solutions/common/',
  '/solutions/industries/k12/teaching/',
  '/about/',
  '/sitemap-index.xml',
  '/robots.txt',
]) {
  const response = await request(path);
  if (!response.headers.get('x-content-type-options')) {
    throw new Error(`${path}: security headers missing`);
  }
}

const homepage = await request('/');
const html = await homepage.text();
const asset = html.match(/(?:src|href)="(\/_astro\/[^"]+)"/)?.[1];
if (!asset) throw new Error('No built Astro asset found on homepage');
const assetResponse = await request(asset);
if (!assetResponse.headers.get('cache-control')?.includes('immutable')) {
  throw new Error('Hashed asset is not immutable');
}

const missing = await request('/definitely-missing/', 404);
if (!(await missing.text()).includes('PAGE NOT FOUND')) {
  throw new Error('Branded 404 body missing');
}

console.log(`Container contract verified at ${origin}`);
