import { describe, expect, it } from 'vitest';
import { mapAndValidateStoryPage } from '../src/lib/storyblok/mapper';

describe('Storyblok page mapper', () => {
  it('maps a published page story into the existing SitePage contract', () => {
    const page = mapAndValidateStoryPage({
      full_slug: 'pages/solutions/smart-campus',
      content: {
        component: 'site_page',
        template: 'detail',
        title: '智慧园区',
        english: 'SMART CAMPUS',
        category: '解决方案',
        visual_family: 'common',
        intro: '连接真实空间与数字服务。',
        positioning: '统一管理园区系统与智能设备。',
        hero: {
          filename: 'https://a.storyblok.com/f/1/hero.jpg',
          alt: '园区夜景',
        },
        images: [
          {
            filename: 'https://a.storyblok.com/f/1/control-room.jpg',
            alt: '控制中心',
          },
          {
            filename: 'https://a.storyblok.com/f/1/service-terminal.jpg',
            alt: '服务终端',
          },
        ],
        capabilities: ['统一接入'],
        scenarios: ['园区管理'],
        delivery: ['实施交付'],
        seo_title: '智慧园区｜光泰',
        seo_description: '连接真实空间与数字服务。',
        og_image: {
          filename: 'https://a.storyblok.com/f/1/social.jpg',
          alt: '园区夜景',
        },
      },
    });

    expect(page).toMatchObject({
      id: 'pages/solutions/smart-campus',
      path: '/solutions/smart-campus',
      template: 'detail',
      title: '智慧园区',
      hero: 'https://a.storyblok.com/f/1/hero.jpg',
    });
  });

  it('rejects a Storyblok page whose hero image lacks alternative text', () => {
    expect(() =>
      mapAndValidateStoryPage({
        full_slug: 'pages/solutions/smart-campus',
        content: {
          component: 'site_page',
          template: 'detail',
          title: '智慧园区',
          english: 'SMART CAMPUS',
          category: '解决方案',
          visual_family: 'common',
          intro: '连接真实空间与数字服务。',
          positioning: '统一管理园区系统与智能设备。',
          hero: {
            filename: 'https://a.storyblok.com/f/1/hero.jpg',
            alt: ' ',
          },
          images: [
            {
              filename: 'https://a.storyblok.com/f/1/control-room.jpg',
              alt: '控制中心',
            },
            {
              filename: 'https://a.storyblok.com/f/1/service-terminal.jpg',
              alt: '服务终端',
            },
          ],
          capabilities: ['统一接入'],
          scenarios: ['园区管理'],
          delivery: ['实施交付'],
          seo_title: '智慧园区｜光泰',
          seo_description: '连接真实空间与数字服务。',
          og_image: {
            filename: 'https://a.storyblok.com/f/1/social.jpg',
            alt: '园区夜景',
          },
        },
      }),
    ).toThrow('hero.alt must not be empty');
  });
});
