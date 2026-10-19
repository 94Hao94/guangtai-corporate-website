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
    expect(heroTemplate).toMatch(
      /viewer\.addEventListener\(\s*'load-complete'/,
    );
    expect(heroTemplate).toContain("viewer.setAttribute('loading', 'eager')");
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
      '成立于2013年，总部位于天津，面向教育、政府、医疗、金融及企事业单位提供数智化建设与服务。',
    );
    expect(homepage).toContain(
      'data-spline-scene="https://prod.spline.design/JCd7StIa9lqPaRfw/scene.splinecode?v=robot-v2"',
    );
    expect(homepage).toContain('aria-label="可交互的机器人 3D 模型"');
    expect(homepage).toContain('天津光泰科技集团有限公司');
    expect(homepage).toContain('href="/about">了解更多');
    expect(homepage).toContain('hero-image hero-image--desktop');
    expect(homepage).toContain('hero-image--fallback');
    expect(homepage).toContain('hero-image hero-image--background');
    expect(homepage).toContain('hero-image hero-image--mobile');
    const capabilityIndex =
      homepage.match(/<nav[^>]+data-capability-index[\s\S]*?<\/nav>/)?.[0] ??
      '';
    expect(capabilityIndex).toContain('href="/guangtai-ai-factory"');
    expect(capabilityIndex).toContain(
      'href="/solutions/common/embodied-intelligence"',
    );
    expect(capabilityIndex).toContain('href="/solutions/common"');
    expect(capabilityIndex).toContain('href="/solutions/industries"');
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
    expect(header).toContain('src="/brand/lumitai-logo.png"');
    expect(footer).toContain('src="/brand/guangtai-logo-white-square.png"');
    expect(homepage).not.toContain('class="brand-mark"');
  });

  it('renders the required regulatory filing links in the shared footer', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const footer = homepage.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] ?? '';
    const icpIndex = footer.indexOf('津ICP备2026009921号');
    const publicSecurityIndex = footer.indexOf('津公网安备12011102001938号');

    expect(footer).toContain('class="footer-legal"');
    expect(footer).toContain('天津光泰光电科技（集团）有限公司 版权所有');
    expect(footer).not.toContain('官网内容以正式发布为准');
    expect(publicSecurityIndex).toBeGreaterThan(icpIndex);
    expect(footer).toContain(
      'href="https://beian.mps.gov.cn/#/query/webSearch?code=12011102001938"',
    );
    expect(footer).toContain(
      'class="footer-filing-link footer-filing-link--public-security"',
    );
    expect(footer).toContain('src="/filing/public-security.png"');
    expect(footer).toContain('href="https://beian.miit.gov.cn/"');
  });

  it('orders AI, embodied partners, and systems integration on the homepage', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const aiFactory = homepage.indexOf('让 AI 成为可运行的行业智能体');
    const embodied = homepage.indexOf('让AI走进真实空间');
    const partners = homepage.indexOf('与具身智能伙伴，共同进入真实场景');
    const integration = homepage.indexOf('走向每一个真实场景');

    expect(aiFactory).toBeGreaterThan(-1);
    expect(embodied).toBeGreaterThan(aiFactory);
    expect(partners).toBeGreaterThan(embodied);
    expect(integration).toBeGreaterThan(partners);
    expect(homepage).toContain('系统集成与工程交付');
    expect(homepage).toContain('href="/solutions/common"');
    expect(homepage).toContain('href="/solutions/industries"');
  });

  it('serves one responsive homepage instead of a separate mobile content tree', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(homepage).not.toMatch(
      /data-mobile-(capabilities|scenario|projects|partners)|id="mobile-delivery"/,
    );
    expect(homepage).toContain('高校场景解决方案');
    expect(homepage).toContain('中小学场景解决方案');
    expect(homepage).toContain('href="/solutions/industries/higher-education"');
    expect(homepage).toContain('href="/solutions/industries/k12"');
    expect(homepage).toContain(
      'href="/solutions/industries/higher-education/ai#highlight"',
    );
    expect(homepage).toContain('工程能力');
    expect(homepage).toContain('典型项目');
    expect(homepage).toContain('校园AI智能体');
  });

  it('renders chapter signposts for the homepage business narrative', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(homepage).toContain('01 / AI 应用工厂');
    expect(homepage).toContain('02 / 具身智能');
    expect(homepage).toContain('03 / 系统集成与行业场景');
    expect(homepage).toContain('04 / 工程与项目实践');
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

  it('renders the complete company profile before evidence and innovation', async () => {
    const aboutHtml = await readFile(routeFile('/about'), 'utf8');
    const overview =
      aboutHtml.match(/<section[^>]+id="overview"[\s\S]+?<\/section>/)?.[0] ??
      '';

    expect(overview).toContain('data-about-profile');
    expect(overview).toContain('扎实交付，是智能创新的底座');
    expect(overview.match(/data-about-paragraph/g)).toHaveLength(4);
    expect(overview).toContain('拥有127项软著专利');
    expect(overview).toContain('集团自2023年起布局AI行业应用');
    expect(overview).toContain('自2024年起，集团布局具身智能');
    expect(overview).toContain('让智能真正进入业务现场');
    expect(aboutHtml).toContain('id="evidence"');
    expect(aboutHtml).toContain('id="innovation"');
    expect(aboutHtml.match(/data-about-fact/g)).toHaveLength(4);
    expect(aboutHtml.match(/data-about-credential/g)).toHaveLength(6);
    expect(aboutHtml.match(/data-about-innovation/g)).toHaveLength(2);
    expect(aboutHtml).not.toContain('data-capability-navigator');
    expect(aboutHtml).not.toContain('data-about-capability');
    expect(aboutHtml).not.toContain('role="tablist"');
    expect(aboutHtml).not.toContain('data-mobile-capability-accordion');
    expect(aboutHtml).not.toContain('完整性说明');
    expect(aboutHtml).not.toContain('与 Word 文档一致');
    expect(aboutHtml).toContain('href="#overview">公司简介');
    expect(aboutHtml).toContain('href="#evidence">企业实力');
    expect(aboutHtml).toContain('href="#innovation">创新布局');
  });

  it('renders the AI factory experience link as the protected entry', async () => {
    const factoryHtml = await readFile(
      routeFile('/guangtai-ai-factory'),
      'utf8',
    );
    const experienceLink =
      factoryHtml.match(/<a\b[^>]*>\s*前去体验\s*<\/a>/)?.[0] ?? '';

    expect(experienceLink).not.toBe('');
    expect(experienceLink).toContain('href="/ai-factory/"');
    expect(experienceLink).not.toContain('aria-disabled');
    expect(experienceLink).not.toMatch(/\sdisabled(?:\s|=|>)/);
    expect(factoryHtml).toContain('输入访问密码并通过安全验证后进入应用工厂。');
  });

  it('renders the contact project form without an unconfigured project CTA', async () => {
    const contactHtml = await readFile(routeFile('/contact'), 'utf8');
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(contactHtml).toContain('data-project-contact-form');
    expect(contactHtml).toContain('data-field-error');
    expect(contactHtml).toContain('novalidate');
    expect(contactHtml).toContain('联系渠道尚未配置');
    expect(contactHtml).not.toContain('START A PROJECT');
    expect(homepage.match(/class="footer-group"/g)).toHaveLength(3);
    expect(homepage).toContain('data-footer-contact');
    expect(homepage).not.toContain('法律声明');
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
      '/solutions/industries/higher-education/ai',
      '/solutions/common/embodied-intelligence',
    ]);
    expect(firstGroup).not.toContain('href="/guangtai-ai-factory"');
    expect(factoryLink).toBeGreaterThan(primaryNavigationStart);
    expect(factoryLink).toBeLessThan(solutionsMenuStart);
  });

  it('presents AI empowerment and LLM delivery as two homepage factory offerings', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const offeringsStart = homepage.indexOf('class="factory-offerings"');
    const offerings = homepage.slice(
      offeringsStart,
      homepage.indexOf('</section>', offeringsStart),
    );

    expect(offeringsStart).toBeGreaterThan(-1);
    expect(offerings).toContain('AI 赋能');
    expect(offerings).toContain('提示词工程');
    expect(offerings).toContain('智能体搭建');
    expect(offerings).toContain('工作流重塑');
    expect(offerings).toContain('大模型应用落地开发');
    expect(offerings).toContain('href="/solutions/common/ai#highlight"');
    expect(offerings).toContain('href="/guangtai-ai-factory#highlight"');
  });

  it('renders the LLM delivery highlight on the AI factory page', async () => {
    const html = await readFile(routeFile('/guangtai-ai-factory'), 'utf8');
    const highlightStart = html.indexOf('id="highlight"');
    const highlight = html.slice(
      highlightStart,
      html.indexOf('</section>', highlightStart),
    );

    expect(html).toContain('href="#highlight"');
    expect(highlightStart).toBeGreaterThan(html.indexOf('id="overview"'));
    expect(highlight).toContain('大模型应用落地开发');
    for (const title of [
      '行业知识库',
      '场景智能体',
      '业务系统集成',
      '部署与持续优化',
    ]) {
      expect(highlight).toContain(title);
    }
    expect(highlight.match(/<li[^>]*>/g)).toHaveLength(5);
    expect(highlight).toContain('经得起使用和评估');
  });

  it('presents AI empowerment methods on the agents and workflows page', async () => {
    const html = await readFile(routeFile('/solutions/common/ai'), 'utf8');
    const highlightStart = html.indexOf('id="highlight"');
    const highlight = html.slice(
      highlightStart,
      html.indexOf('</section>', highlightStart),
    );

    expect(html).toContain('href="#highlight"');
    expect(highlightStart).toBeGreaterThan(html.indexOf('id="overview"'));
    expect(highlight).toContain('AI 赋能：从会用工具到解决实际问题');
    for (const title of ['提示词工程', '智能体搭建', '工作流重塑']) {
      expect(highlight).toContain(title);
    }
    expect(highlight).toContain('让 AI 从演示走向日常应用。');
    expect(highlight).not.toContain('企业 AI 培训');
  });

  it('frames higher-education industry integration as exploratory student AI literacy', async () => {
    const html = await readFile(
      routeFile('/solutions/industries/higher-education/ai'),
      'utf8',
    );
    const highlightStart = html.indexOf('id="highlight"');
    const highlight = html.slice(
      highlightStart,
      html.indexOf('</section>', highlightStart),
    );

    expect(highlight).toContain('产教融合，增强学生的 AI 素养');
    expect(highlight).toContain('正在探索');
    expect(highlight).toContain('企业导师');
    for (const title of ['专题讲座', '实操工作坊', '项目实训']) {
      expect(highlight).toContain(title);
    }
    expect(highlight.match(/<li[^>]*>/g)).toHaveLength(4);
    expect(highlight).not.toMatch(/已与|签约|合作院校|名学生|就业率/);
  });

  it('replaces templated capability copy with written details on every navigator page', async () => {
    const navigatorPages = (await pages()).filter(
      (page) => page.path !== '/about' && page.path !== '/contact',
    );

    expect(navigatorPages).toHaveLength(27);
    for (const page of navigatorPages) {
      const html = await readFile(routeFile(page.path), 'utf8');

      expect(page.capabilityDetails, page.path).toHaveLength(
        page.capabilities.length,
      );
      expect(html).not.toContain('将能力组织为可验证、可交付、可持续运营');
      for (const detail of page.capabilityDetails ?? []) {
        expect(html).toContain(detail);
      }
    }
  });

  it('links the homepage higher-education card to industry integration', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');
    const solutionsStart = homepage.indexOf('id="solutions"');
    const education = homepage.slice(
      solutionsStart,
      homepage.indexOf('</section>', solutionsStart),
    );

    expect(education).toContain('增强学生的 AI 素养');
    expect(education).toContain(
      'href="/solutions/industries/higher-education/ai#highlight"',
    );
    expect(education).toContain('了解高校 AI 赋能与产教融合');
  });

  it('renders four mobile solution family controls and a project contact action', async () => {
    const homepage = await readFile(resolve('dist/index.html'), 'utf8');

    expect(homepage.match(/data-solution-group-trigger="\d+"/g)).toHaveLength(
      4,
    );
    expect(homepage.match(/data-solution-group-panel="\d+"/g)).toHaveLength(4);
    expect(homepage).toContain('class="mobile-nav-contact"');
    expect(homepage).toContain('>提交项目需求<');
  });

  it('renders all internal page links to known routes', async () => {
    const contentPages = await pages();
    const routes = new Set([
      '/',
      '/ai-factory/',
      ...contentPages.map((page) => page.path),
    ]);
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
