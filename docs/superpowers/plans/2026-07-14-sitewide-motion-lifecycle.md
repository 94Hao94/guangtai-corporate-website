# 全站动效生命周期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让所有页面在 Astro ClientRouter 无刷新切换后稳定重建进入、滚动、轮播与 CTA 动效，并恢复完整、易用的解决方案菜单。

**Architecture:** `BaseLayout` 注册一次路由页面加载监听，`site-motion.ts` 负责当前页面 GSAP context 的创建与释放。页面只声明 `data-reveal` 锚点；Header 负责菜单状态与内容分组，CSS 负责玻璃质感与轻量状态过渡。

**Tech Stack:** Astro ClientRouter、TypeScript、GSAP Core、ScrollTrigger、Playwright。

---

### Task 1: 写入回访动效的失败浏览器测试

**Files:**

- Modify: `tests/browser/site-smoke.spec.ts`

- [x] 新增测试，访问首页后切至 AI 应用工厂再返回首页，断言 `[data-partner-track]` 的 transform 在等待后非初始值；再切至一个内页并滚动，断言其 `[data-reveal]` 透明度为 1。
- [x] 运行 `npx playwright test tests/browser/site-smoke.spec.ts --grep "sitewide motion"`，确认旧实现失败，因为动效只在首页首次模块执行时初始化。

### Task 2: 全局化动效初始化

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/scripts/site-motion.ts`
- Modify: 内页通用组件中需要进入动画的锚点

- [x] 在 `BaseLayout` 注册一次 `astro:page-load` 监听并调用 `initSiteMotion`；删除首页独占调用。
- [x] 让 `initSiteMotion` 先执行上次 cleanup，再为当前 `[data-reveal]` 建立 ScrollTrigger，为当前合作伙伴轨道创建可暂停且可释放的循环 tween；减少动态效果下立即显示内容并不创建循环。
- [x] 对内页 Hero 和通用章节添加 `data-reveal`，使规则覆盖首页以外的页面。
- [x] 运行 Task 1 测试，确认通过。

### Task 3: 恢复四组 24 项菜单并修复指针容错

**Files:**

- Modify: `src/components/site/SiteHeader.astro`
- Modify: `src/styles/site-shell.css`
- Modify: `tests/browser/site-smoke.spec.ts`

- [x] 先将菜单链接数量断言设为 24，并新增“触发器离开后 220ms 内进入面板仍保持展开”的失败测试。
- [x] 按既有 `pages` 路径分出 1/8/7/8 四组，保留每个已有 URL；为桌面端渲染四个分组面板，移动端显示同一内容的可点击列表。
- [x] 使用可取消的关闭计时器与点击锁定状态管理 trigger/panel 的 pointer enter/leave、Escape 与点击外部；不得用固定延迟阻塞键盘操作。
- [x] 使用半透明深蓝渐变、`backdrop-filter`、细边线与阴影替换纯不透明背景。
- [x] 运行菜单定向测试，确认通过。

### Task 4: 统一按钮反馈并完成验收

**Files:**

- Modify: `src/styles/base.css`
- Modify: `src/styles/site-shell.css`
- Modify: `tests/browser/site-smoke.spec.ts`
- Modify: `说明文档.md`

- [x] 为 `.button`、`[data-route-cta]`、`.header-contact`、`.inner-hero-button` 和首页圆形 CTA 添加一致的 transform/opacity hover、focus-visible 与 active 反馈；减少动态效果保持静态可用。
- [x] 运行 `npm run format:check`、`npm run check`、`npm test`、`npm run build` 与 `npm run test:e2e:run`。
- [x] 在 `说明文档.md` 记录根因、修复和实际验证结果。
