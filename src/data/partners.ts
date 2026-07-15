export interface Partner {
  name: string;
  href: string;
  logo: string;
  logoAlt: string;
  logoSurface: 'dark' | 'light';
}

export const partners: Partner[] = [
  {
    name: '宇树科技',
    href: 'https://www.unitree.com/',
    logo: '/partners/unitree.svg',
    logoAlt: '宇树科技 Logo',
    logoSurface: 'dark',
  },
  {
    name: 'Booster',
    href: 'https://www.booster.tech/cn/',
    logo: '/partners/booster.png',
    logoAlt: 'Booster Logo',
    logoSurface: 'dark',
  },
  {
    name: '智元机器人',
    href: 'https://www.agibot.com.cn/',
    logo: '/partners/agibot.png',
    logoAlt: '智元机器人 Logo',
    logoSurface: 'dark',
  },
  {
    name: '银河通用',
    href: 'https://www.galbot.com/',
    logo: '/partners/galbot.png',
    logoAlt: '银河通用 Logo',
    logoSurface: 'dark',
  },
  {
    name: '众擎机器人',
    href: 'https://www.engineai.com.cn/',
    logo: '/partners/engineai.png',
    logoAlt: '众擎机器人 Logo',
    logoSurface: 'light',
  },
  {
    name: '云深处科技',
    href: 'https://www.deeprobotics.cn/',
    logo: '/partners/deeprobotics.png',
    logoAlt: '云深处科技 Logo',
    logoSurface: 'dark',
  },
  {
    name: '乐聚机器人',
    href: 'https://www.lejurobot.com/zh',
    logo: '/partners/leju.png',
    logoAlt: '乐聚机器人 Logo',
    logoSurface: 'dark',
  },
  {
    name: '优必选',
    href: 'https://www.ubtrobot.com/cn/',
    logo: '/partners/ubtech.svg',
    logoAlt: '优必选 Logo',
    logoSurface: 'dark',
  },
];
