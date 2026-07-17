import { describe, expect, it } from 'vitest';
import { mapStrapiPage } from '../src/lib/strapi/mapper';

describe('Strapi page mapper', () => {
  it('maps a published Strapi page to the existing SitePage contract', () => {
    expect(
      mapStrapiPage({
        documentId: 'page-about',
        slug: 'about',
        template: 'brand',
        title: '关于光泰',
        english: 'ABOUT GUANGTAI',
        category: '品牌',
        visualFamily: 'brand',
        intro: '从技术能力走向长期服务。',
        positioning: '以工程能力服务真实场景。',
        hero: {
          url: 'http://127.0.0.1:1337/uploads/about.jpg',
          alternativeText: '光泰办公空间',
          width: 1600,
          height: 900,
        },
        images: [
          {
            url: 'http://127.0.0.1:1337/uploads/about-a.jpg',
            alternativeText: '团队协作',
            width: 1200,
            height: 800,
          },
          {
            url: 'http://127.0.0.1:1337/uploads/about-b.jpg',
            alternativeText: '项目交付',
            width: 1200,
            height: 800,
          },
        ],
        capabilities: ['系统建设'],
        scenarios: ['行业服务'],
        delivery: ['项目实施'],
        seoTitle: '关于光泰｜光泰',
        seoDescription: '从技术能力走向长期服务。',
        ogImage: {
          url: 'http://127.0.0.1:1337/uploads/about-og.jpg',
          alternativeText: '光泰办公空间',
          width: 1200,
          height: 630,
        },
      }),
    ).toMatchObject({
      id: 'page-about',
      path: '/about',
      template: 'brand',
      title: '关于光泰',
    });
  });

  it('rejects a Strapi hero image without alternative text', () => {
    expect(() =>
      mapStrapiPage({
        documentId: 'page-about',
        slug: 'about',
        template: 'brand',
        title: '关于光泰',
        english: 'ABOUT GUANGTAI',
        category: '品牌',
        visualFamily: 'brand',
        intro: '从技术能力走向长期服务。',
        positioning: '以工程能力服务真实场景。',
        hero: {
          url: 'http://127.0.0.1:1337/uploads/about.jpg',
          alternativeText: null,
          width: 1600,
          height: 900,
        },
        images: [
          {
            url: 'http://127.0.0.1:1337/uploads/about-a.jpg',
            alternativeText: '团队协作',
            width: 1200,
            height: 800,
          },
          {
            url: 'http://127.0.0.1:1337/uploads/about-b.jpg',
            alternativeText: '项目交付',
            width: 1200,
            height: 800,
          },
        ],
        capabilities: ['系统建设'],
        scenarios: ['行业服务'],
        delivery: ['项目实施'],
        seoTitle: '关于光泰｜光泰',
        seoDescription: '从技术能力走向长期服务。',
        ogImage: {
          url: 'http://127.0.0.1:1337/uploads/about-og.jpg',
          alternativeText: '光泰办公空间',
          width: 1200,
          height: 630,
        },
      }),
    ).toThrow('hero.alternativeText must not be empty');
  });
});
