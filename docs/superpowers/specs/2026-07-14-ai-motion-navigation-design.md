# AI 首页、导航与合作伙伴动效设计

## 背景

当前首页已具备 AI 应用工厂、具身智能、教育、技术能力、案例和项目咨询等业务区块；但页面 CTA 都是立即跳转的普通链接，点击后缺少明确的导航反馈。站点头部的“解决方案”菜单仅以三列文本呈现，当前方案、悬停方案和即将跳转的方案没有不同状态。

本次设计将具身智能与 AI 提升为首页核心业务，并以合作伙伴展示强化生态背书；同时通过受控的 GSAP 动效改善 CTA、导航和菜单反馈。

## 目标

- 将“具身智能与 AI”置于首页 Hero 后方的首要业务位置。
- 在首页展示宇树、Booster、智元、银河通用、众擎、云深处、乐聚和优必选八家合作伙伴。
- 为 CTA 和内部导航增加即时点击反馈与短页面转场，消除“点击后无变化”的感受。
- 将解决方案菜单改为具有当前页状态、悬停预览、点击意图反馈和移动端折叠交互的 Mega Menu。
- 所有重要动效支持键盘操作、触屏操作与 `prefers-reduced-motion` 降级。

## 非目标

- 不引入全站平滑滚动、长时间视差、WebGL 或无意义的循环特效。
- 不改变既有解决方案的 URL、内容模型或 SEO 路由结构。
- 不将未核验来源的图片或 Logo 写入项目；合作伙伴 Logo 仅使用已确认可公开展示的官方素材。

## 技术决策

### GSAP 与 Astro 路由

- 新增 `gsap`，使用 GSAP Core 和 ScrollTrigger 实现滚动进入、按钮反馈、菜单预览和轮播控制。
- 使用 Astro ClientRouter 承接同源页面导航；GSAP 只控制导航前后的视觉状态，不能阻断原生链接、外链、新窗口和页面内锚点。
- 导航动效不超过 280ms；CTA 的按压与箭头反馈在点击后 120ms 内发生。

### 动效性能与可访问性

- 只动画 `opacity`、`transform` 和必要的遮罩位置；不反复动画布局尺寸。
- 禁止同时运行现有 `initReveal()` 与 GSAP 对同一 `[data-reveal]` 元素的进入动画。
- `prefers-reduced-motion: reduce` 下保留选中态与内容可见性，取消位移、无缝轮播和页面帷幕。
- 菜单支持鼠标悬停、键盘焦点、Enter/Space、Escape 和点击外部关闭；移动端只使用点击式折叠。

## 交互设计

### CTA 与页面转场

1. 用户悬停 CTA：箭头右移，按钮光泽或边线轻微响应。
2. 用户按下 CTA：按钮短促缩放，标签保持稳定。
3. 若链接为同源页面且非锚点：深蓝色帷幕在 220-280ms 内覆盖并揭示新页面。
4. 新页面完成替换后，头部对应链接添加 `aria-current="page"` 和视觉高亮。
5. 若用户启用减少动态效果：立即导航，仅显示当前项选中态。

### 解决方案 Mega Menu

桌面端以“左侧分类列表 + 右侧动态预览”替代当前均分三列：

- 分类顺序为“具身智能与 AI”“通用解决方案”“高校场景”“中小学场景”。
- “具身智能与 AI”指向既有 `/solutions/common/embodied-intelligence`，并作为菜单首项。
- 鼠标进入触发器或菜单、键盘聚焦触发器时展开；鼠标离开菜单区域或按 Escape 时关闭。
- 悬停、焦点和当前页面分别具有明确的底色、边线和箭头位移；当前页不因菜单关闭而丢失。
- 预览面板读取现有 `SitePage` 的 `title`、`intro` 和 `hero`，以短距离横移与淡入切换，避免瞬间替换。
- 用户点击项后固定其“正在跳转”状态，再交由 ClientRouter 转场。

移动端保留现有导航抽屉，Mega Menu 改为可展开的分类列表；不依赖 hover，不显示大尺寸预览图。

### 首页业务与合作伙伴

- 首页组件顺序调整为 `HomeHero → EmbodiedSection → PartnerMarquee → SolutionSplit → FactorySection → EducationSection → TechnologySection → CaseSection → ProjectCta`。
- `EmbodiedSection` 的标题、图片和能力条目以 ScrollTrigger 错峰上滑进入；现有基础能力模块仍保留，但不占据首个内容区。
- `PartnerMarquee` 使用两份相同的品牌列表形成无缝水平轨道。桌面端悬停轨道暂停，单项 Logo 上浮并恢复完整对比度；移动端以较慢速度自动播放。
- 合作伙伴的品牌名称、链接、Logo 路径和替代文本统一存入结构化数据，缺少官方素材时以文字占位而非临时抓图。

## 文件范围

| 文件 | 变更 |
| --- | --- |
| `package.json` | 添加 `gsap` 依赖。 |
| `src/layouts/BaseLayout.astro` | 接入 Astro ClientRouter 与全局路由转场组件。 |
| `src/components/site/RouteTransition.astro`（新增） | 页面帷幕和导航状态容器。 |
| `src/scripts/site-motion.ts`（新增） | 统一初始化 GSAP、ScrollTrigger、菜单动效和清理逻辑。 |
| `src/components/site/SiteHeader.astro` | 当前页状态、菜单数据、预览区与键盘/触屏行为。 |
| `src/styles/site-shell.css` | 头部、Mega Menu、选中和导航意图状态。 |
| `src/pages/index.astro` | 调整首页区块顺序并接入合作伙伴区。 |
| `src/components/home/EmbodiedSection.astro` | 为首要业务区补充动效锚点与语义标签。 |
| `src/components/home/PartnerMarquee.astro`（新增） | 可访问的合作伙伴展示轨道。 |
| `src/data/partners.ts`（新增） | 八家合作伙伴的展示数据与资产占位。 |
| `src/styles/home.css` 与 `src/styles/base.css` | 首页、按钮、轮播和减少动态效果样式。 |
| `tests/browser/site-smoke.spec.ts` | 追加 CTA、菜单、当前项和移动端场景断言。 |

## 测试与验收

- 点击首页与内页 CTA 时，测试能观察到导航意图状态，并成功到达目标 URL。
- 桌面端悬停/聚焦“解决方案”可展开菜单；Escape 和点击外部可以关闭。
- 菜单至少呈现四类入口，且当前路径有唯一的 `aria-current="page"`。
- 解决方案项悬停或焦点变化时，预览标题、简介和图片同步更新。
- 移动视口下菜单仅通过点击展开，页面不会产生横向滚动或焦点丢失。
- 减少动态效果偏好下，所有内容立即可见、无循环轮播和页面帷幕。
- `npm run verify` 通过。

## 风险与待确认事项

- 合作伙伴展示需要业务方确认八家厂商均可公开标注为“合作伙伴”，并提供或批准相应的官方 Logo 素材。
- Astro ClientRouter 与现有页面脚本需在实际浏览器中验证生命周期与清理逻辑，避免页面切换后重复绑定事件。
- 如果移动端的页面转场或菜单预览影响首屏性能，将保留选中态但关闭对应动画。
