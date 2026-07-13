# Astro 企业官网基础框架设计

## 目标

在空工作区中建立一个适合企业官网长期演进的 Astro 基础项目。项目采用静态优先、局部交互和内容与页面组件分离的原则，为后续品牌视觉、产品页面、案例、新闻、招聘、多语言和表单集成提供稳定底座。

本阶段交付可运行的技术框架和示例首页，不建设完整企业官网视觉稿，不接入生产 CMS、CRM 或正式分析平台。

## 已选方案

采用 Astro 官方最小 Starter 作为技术骨架，在其上建立自定义设计系统和组件结构。不会采用完整商业主题，也不会从空白配置手写构建工具。

选择理由：

- 保留 Astro 默认静态输出和低客户端 JavaScript 的优势。
- 避免商业主题的样式包袱、模板感和升级冲突。
- 用明确的组件边界支持后续自定义品牌设计。
- 先以本地内容集合运行，未来接入 Headless CMS 时不重写页面层。

## 技术栈

- Astro 最新稳定版
- TypeScript 严格模式
- npm 与 lockfile
- Tailwind CSS，配合 CSS Variables 表达品牌设计令牌
- Astro Content Collections 管理结构化内容
- Prettier 与 Astro 插件负责统一格式
- Vitest 负责纯逻辑单元测试
- Astro Check 负责模板和类型检查
- GitHub Actions 负责持续集成

项目默认保持部署平台中立。静态产物位于 `dist/`，可部署到 OSS、COS、S3、Cloudflare、Netlify、Vercel 或普通静态服务器。

## 项目结构

```text
src/
  assets/        由 Astro 构建管线处理的本地图片
  components/    可复用展示组件
  content/       本地结构化内容
  layouts/       页面骨架和公共 metadata
  pages/         文件路由
  styles/        全局样式与设计令牌
  utils/         无 UI 的纯函数
public/          favicon、robots.txt 等原样发布资源
tests/           纯逻辑和内容约束测试
docs/            设计与实施文档
```

每个文件保持单一职责。页面负责组合组件，组件不直接查询远程服务，数据获取和内容转换放在页面层或专门的数据模块中。

## 渲染和数据流

默认所有页面在构建期生成静态 HTML：

```text
本地内容或未来 CMS
  → 内容 Schema 校验
  → Astro 页面组合组件
  → 构建静态 HTML/CSS
  → CDN 分发
```

初始框架不启用 SSR Adapter。未来只有登录、实时搜索或个性化页面确实需要按请求渲染时，才对具体路由启用 SSR。

客户端 JavaScript 采用显式加入原则。普通 Astro 组件不进行 hydration；未来的菜单、轮播或搜索组件只有在需要交互时才通过 `client:*` 指令激活。

## 设计系统和基础组件

全局样式定义以下令牌：

- 品牌色、文本色、背景色和边框色
- 字号与标题层级
- 页面容器宽度
- 间距、圆角、阴影和过渡时间
- 焦点状态与减少动画偏好

首批组件只覆盖框架验证所需范围：

- `BaseLayout`：HTML 文档、基础 SEO、全局样式入口
- `Container`：统一内容宽度和水平留白
- `SiteHeader`：品牌和基础导航
- `SiteFooter`：版权和基础链接
- `Hero`：示例首页首屏

组件内容通过属性传入，不在组件内部硬编码公司业务数据。

## 内容模型

创建 `news` 内容集合演示企业新闻能力。Schema 至少包含：

- 标题
- 摘要
- 发布日期
- 是否为草稿

Schema 在构建时校验内容。无效内容必须使检查或构建失败，避免错误数据进入线上版本。初始示例内容使用虚构文本，不使用真实公司名称或未经确认的品牌信息。

## SEO、性能和无障碍基线

基础框架包含：

- 每页可配置标题和描述
- canonical URL 的可扩展接口
- `robots.txt`
- sitemap 集成
- 语义化 HTML
- 键盘可见的焦点状态
- `prefers-reduced-motion` 支持
- 图片尺寸和替代文字约束
- 默认零客户端 JavaScript 的静态首页

后续正式内容阶段再加入 Organization、Product、Article 等 JSON-LD 和正式 Open Graph 图片。

## 错误处理

- TypeScript 严格模式阻止不明确的数据类型进入组件。
- Content Collections Schema 在构建期报告缺失或格式错误字段。
- 纯函数通过 Vitest 覆盖正常输入和边界输入。
- CI 依次执行格式检查、Astro Check、测试和生产构建；任一步失败都阻止合并。
- 外部 CMS 和表单尚未接入，因此本阶段不引入运行时重试或降级逻辑。

## 验证标准

完成后必须满足：

1. `npm install` 可根据 lockfile 恢复依赖。
2. `npm run check` 无类型或 Astro 模板错误。
3. `npm test` 全部通过。
4. `npm run build` 成功生成 `dist/`。
5. 首页、导航、页脚和示例内容在移动端与桌面端具有可读布局。
6. 构建后的首页不包含非必要的客户端组件脚本。
7. CI 配置执行与本地相同的关键检查。

## 本阶段不包含

- 完整品牌视觉和真实公司文案
- WordPress 或其他 CMS 接入
- 联系表单、邮件、飞书或 CRM 集成
- 登录、会员和数据库
- 正式多语言内容
- 生产域名、备案和云平台部署

这些能力应在基础框架验证后按独立设计和实施计划逐项加入。
