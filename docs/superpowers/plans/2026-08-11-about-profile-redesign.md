# 关于光泰公司简介页重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“关于光泰”从左右能力切换器改为全宽、可读的企业简介叙事页。

**Architecture:** 新增仅服务 `/about` 的 `AboutProfile.astro`，继续消费现有 `SitePage` 数据；`PageTemplate.astro` 只在关于页选择该组件，其他路由保持现有 `CapabilityNavigator`。样式集中在 `inner-page.css`，测试锁定静态结构和响应式布局。

**Tech Stack:** Astro 7、TypeScript、CSS、Vitest、Playwright。

## Global Constraints

- 不新增第三方依赖。
- 不新增未经确认的公司数据。
- 保留全站 Hero、页内导航、动效生命周期和移动端 230px 内页 Hero。
- 不修改其他页面的能力切换器。

---

### Task 1: 建立新的关于页结构合同

**Files:**

- Modify: `tests/rendered-site.test.ts`
- Modify: `tests/browser/site-smoke.spec.ts`

- [x] 将静态测试从 Tab/折叠器合同改为 `data-about-profile`、四项事实和四张能力卡。
- [x] 将桌面交互测试改为静态阅读层级与无 Tab 合同。
- [x] 将移动端折叠器测试改为两列事实概览、单列能力卡和无横向溢出合同。
- [x] 运行相关测试并确认旧结构合同失败。

### Task 2: 实现专属简介组件

**Files:**

- Create: `src/components/pages/AboutProfile.astro`
- Modify: `src/components/pages/PageTemplate.astro`

- [x] 使用现有 `SitePage` 内容渲染短标题、两段简介、四项概览和四张能力卡。
- [x] 在 `/about` 使用新组件，其他非联系页面继续使用 `CapabilityNavigator`。
- [x] 保留 `overview` 与 `capabilities` 锚点，保证页内导航继续工作。

### Task 3: 完成响应式视觉设计

**Files:**

- Modify: `src/styles/inner-page.css`

- [x] 添加全宽简介、事实概览和能力卡样式。
- [x] 桌面使用四列事实与双列卡片，390px 使用双列事实与单列卡片。
- [x] 控制标题和正文阅读宽度、字号、行高与对比度。

### Task 4: 验证并记录

**Files:**

- Modify: `说明文档.md`

- [x] 运行 Prettier、Astro check、单元测试、构建、静态渲染和 Playwright。
- [x] 在 1440×900 与 390×844 预览截图中复核层级、溢出和移动布局。
- [x] 将最终结构、验证证据和已知风险写入说明文档。
