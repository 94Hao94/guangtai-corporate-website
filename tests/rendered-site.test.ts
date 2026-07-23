import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SitePage } from '../src/lib/page-schema';

async function pages(): Promise<SitePage[]> {
  const directory = resolve('src/content/pages');
  return Promise.all(
    (await readdir(directory))
      .filter((file) => file.endsWith('.json'))
      .map(async (file) =>
        JSON.parse(await readFile(resolve(directory, file), 'utf8')),
      ),
  );
}

function routeFile(path: string): string {
  return resolve('dist', path.slice(1), 'index.html');
}

describe('rendered corporate site', () => {
  it('loads the current Spline scene without distorting its pointer coordinates', async () => {
    const homeStyles = await readFile(resolve('src/styles/home.css'), 'utf8');
    const heroTemplate = await readFile(
      resolve('src/components/home/HomeHero.astro'),
      'utf8',
    );

    expect(homeStyles).toContain('left: 31vw;');
    expect(homeStyles).toContain('right: -11vw;');
    expect(homeStyles).toContain('transform: none;');
    expect(homeStyles).toMatch(/\.hero-copy\s*\{[\s\S]*?pointer-events: none;/);
    expect(homeStyles).toMatch(
      /\.hero-copy a\s*\{[\s\S]*?pointer-events: auto;/,
    );
    expect(heroTemplate).toContain('scene.splinecode?v=robot-v2');
    expect(heroTemplate).toContain('canAutoMountSplineHero');
    expect(heroTemplate).toMatch(/viewer\.addEventListener\(\s*'load'/);
    expect(heroTemplate).not.toMatch(
      /replaceChildren\(viewer\);\s*host\.closest\('\.home-hero'\)\?\.classList\.add\('is-spline-mounted'\)/,
    );
  });

  it('renders home and all 29 MVP routes with page metadata', async () => {
    const contentPages = await pages();
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    expect(contentPages).toHaveLength(29);
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    expect(homepage).toContain('<h1>光启未来 智领时代</h1>');
    expect(homepage).toContain(
      '以AI应用工厂为平台底座，融合软件开发、系统集成、空间智能与具身设备。',
    );
    expect(homepage).toContain(
      'data-spline-scene="https://prod.spline.design/JCd7StIa9lqPaRfw/scene.splinecode?v=robot-v2"',
    );
    expect(homepage).toContain('aria-label="可交互的机器人 3D 模型"');
    expect(homepage).toContain('天津光泰科技集团有限公司');
    expect(homepage).toContain('href="/about">了解更多');
    expect(homepage).not.toContain('光泰AI应用工厂<br');

    for (const page of contentPages) {
      const html = await readFile(routeFile(page.path), 'utf8');
      expect(html).toContain(`<h1>${page.title}</h1>`);
      expect(html).toContain(`<title>${page.seoTitle}</title>`);
      expect(html).toContain(`content="${page.seoDescription}"`);
      titles.add(page.seoTitle);
      descriptions.add(page.seoDescription);
    }

    expect(titles.size).toBe(29);
    expect(descriptions.size).toBe(29);
  });

  it('uses the supplied official logo variants in shared site chrome', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const header = homepage.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? '';
    const footer = homepage.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
    const favicon = homepage.match(/<link\b[^>]*\brel="icon"[^>]*>/)?.[0] ?? '';

    expect(favicon).toContain('href="/brand/guangtai-logo-gray-square.png"');
    expect(header).toContain('src="/brand/guangtai-logo-color.png"');
    expect(footer).toContain('src="/brand/guangtai-logo-white-square.png"');
    expect(homepage).not.toContain('class="brand-mark"');
  });

  it('orders AI, embodied partners, and systems integration on the homepage', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const aiFactory = homepage.indexOf('GUANGTAI AI FACTORY');
    const embodied = homepage.indexOf('EMBODIED INTELLIGENCE');
    const partners = homepage.indexOf('与具身智能伙伴，共同进入真实场景');
    const integration = homepage.indexOf('SYSTEM INTEGRATION &amp; INDUSTRIES');

    expect(aiFactory).toBeGreaterThan(-1);
    expect(embodied).toBeGreaterThan(aiFactory);
    expect(partners).toBeGreaterThan(embodied);
    expect(integration).toBeGreaterThan(partners);
    expect(homepage).toContain('系统集成与工程交付');
    expect(homepage).toContain('href="/solutions/common"');
    expect(homepage).toContain('href="/solutions/industries"');
  });

  it('renders chapter signposts for the homepage business narrative', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(homepage).toContain('01 / AI 应用工厂');
    expect(homepage).toContain('02.1 / 具身生态伙伴');
    expect(homepage).toContain('03.1 / 教育行业场景');
    expect(homepage).toContain('03.2 / 工程与技术');
    expect(homepage).toContain('04 / 项目实践');
  });

  it('renders visual breadcrumbs only for nested pages while preserving breadcrumb JSON-LD', async () => {
    const casesHtml = await readFile(routeFile('/cases'), 'utf8');
    const nestedHtml = await readFile(
      routeFile('/solutions/industries/higher-education/ai'),
      'utf8',
    );

    expect(casesHtml).not.toContain('aria-label="面包屑导航"');
    expect(casesHtml).toContain('"@type":"BreadcrumbList"');
    expect(nestedHtml).toContain('aria-label="面包屑导航"');
    expect(nestedHtml).toContain('href="/solutions/industries"');
    expect(nestedHtml).toContain(
      'href="/solutions/industries/higher-education"',
    );
  });

  it('renders an accessible capability navigator on the about page', async () => {
    const aboutHtml = await readFile(routeFile('/about'), 'utf8');

    expect(aboutHtml).toMatch(
      /<section[^>]+id="overview"[^>]+data-capability-navigator/,
    );
    expect(aboutHtml).not.toMatch(
      /<section[^>]+id="capabilities"[^>]+data-capability-navigator/,
    );
    expect(aboutHtml).toContain('role="tablist"');
    expect(aboutHtml).toContain('role="tab"');
    expect(aboutHtml).toContain('role="tabpanel"');
  });

  it('keeps the AI factory experience control visibly unavailable', async () => {
    const factoryHtml = await readFile(
      routeFile('/guangtai-ai-factory'),
      'utf8',
    );
    const experienceButton =
      factoryHtml.match(/<button\b[^>]*>\s*前去体验\s*<\/button>/)?.[0] ?? '';

    expect(experienceButton).not.toBe('');
    expect(experienceButton).toMatch(/\sdisabled(?:\s|=|>)/);
    expect(experienceButton).toContain('aria-disabled="true"');
    expect(experienceButton).not.toContain('href=');
  });

  it('renders the contact project form without an unconfigured project CTA', async () => {
    const contactHtml = await readFile(routeFile('/contact'), 'utf8');

    expect(contactHtml).toContain('data-project-contact-form');
    expect(contactHtml).toContain('联系渠道尚未配置');
    expect(contactHtml).not.toContain('START A PROJECT');
  });

  it('uses the shared project contact CTA on the homepage', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(homepage).toContain('PROJECT CONTACT');
    expect(homepage).toContain('从一个真实项目需求开始');
    expect(homepage).toContain('提交项目需求');
    expect(homepage).not.toContain('START A PROJECT');
    expect(homepage).not.toContain('项目咨询');
  });

  it('keeps AI and embodied intelligence in the first solution menu group', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const primaryNavigationStart = homepage.indexOf('data-primary-nav');
    const solutionsMenuStart = homepage.indexOf(
      'data-solutions-mega-menu',
      primaryNavigationStart,
    );
    const groupStart = homepage.indexOf('AI 与具身智能', solutionsMenuStart);
    const nextGroupStart = homepage.indexOf('通用解决方案', groupStart);
    const firstGroup = homepage.slice(groupStart, nextGroupStart);
    const solutionRoutes = [...firstGroup.matchAll(/href="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const factoryLink = homepage.indexOf(
      'href="/guangtai-ai-factory"',
      primaryNavigationStart,
    );

    expect(groupStart).toBeGreaterThan(solutionsMenuStart);
    expect(nextGroupStart).toBeGreaterThan(groupStart);
    expect(solutionRoutes).toEqual([
      '/solutions/common/ai',
      '/solutions/common/embodied-intelligence',
    ]);
    expect(firstGroup).not.toContain('href="/guangtai-ai-factory"');
    expect(factoryLink).toBeGreaterThan(primaryNavigationStart);
    expect(factoryLink).toBeLessThan(solutionsMenuStart);
  });

  it('renders all internal page links to known routes', async () => {
    const contentPages = await pages();
    const routes = new Set(['/', ...contentPages.map((page) => page.path)]);
    const files = [
      resolve('dist/index.html'),
      ...contentPages.map((page) => routeFile(page.path)),
    ];

    for (const file of files) {
      const html = await readFile(file, 'utf8');
      const hrefs = [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      for (const href of hrefs) {
        if (!href.startsWith('/') || href.startsWith('/_astro/')) continue;
        const path = href.split('#')[0] || '/';
        expect(routes.has(path), `Unknown link ${href} in ${file}`).toBe(true);
      }
    }
  });

  it('keeps production output free of React, Next, and Vinext runtimes', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    expect(homepage).not.toMatch(/react|next\/|vinext/i);
    expect(await readFile(resolve('dist/404.html'), 'utf8')).toContain(
      'PAGE NOT FOUND',
    );
  });
});
