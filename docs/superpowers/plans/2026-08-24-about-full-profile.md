# 关于光泰完整公司简介页 Implementation Plan

**Goal:** 将《公司简介.docx》的四段全文完整放入“关于光泰”第一板块，并在保留生产 AI 工厂网关真实改造的前提下完成验证与服务器 A 发布。

**Architecture:** 当前发布分支先同步 `codex/ai-factory-password-gateway` 的六个实现提交和已部署但未提交的裸域/Chrome 来源热修复。关于页通过可选 `companyProfile` 内容模型提供四段正文、事实、资质和创新摘要，`AboutProfile.astro` 只负责静态渲染；共享交付、相关页面和联系组件保持不变。生产只发布新的官网静态 release，不重建现有网关或修改 Nginx。

**Tech Stack:** Astro 7、TypeScript 6、CSS、Vitest 4、Playwright 1.61、Node.js 22 标准库网关、Docker Compose、Nginx。

## 全局约束

- 保留用户所有未跟踪文件，不把 `.superpowers/`、`output/`、Word 和 Logo 原始素材纳入提交。
- 第一板块完整展示 Word 四段内容；正式页面不显示制作过程或验收元说明。
- 不新增未经确认的公司事实。
- 不改变 AI 工厂密码、会话密钥、数据卷、业务镜像和认证架构。
- 本地验证完成前不访问生产写接口；生产上传与流量切换分别确认。

## Task 1：同步 AI 工厂线上真实基线

**Files:**

- Merge: `3779e5b`、`7b1057d`、`b16d89d`、`0a234ca`、`08b8157`、`a0d4513`
- Modify: `deploy/factory-gateway/compose.gateway.yml`
- Modify: `deploy/factory-gateway/env.example`
- Modify: `deploy/factory-gateway/lib/access-http.mjs`
- Modify: `deploy/factory-gateway/server.mjs`
- Modify: `deploy/factory-gateway/tests/access-http.test.mjs`
- Modify: `说明文档.md`

- [ ] 顺序 cherry-pick 六个已验证提交。
- [ ] 同步 `FACTORY_PUBLIC_ORIGINS` 裸域支持。
- [ ] 同步严格 Fetch Metadata 条件下的 Chrome `Origin=null` 兼容逻辑。
- [ ] 补齐测试，确认外部来源及跨站 `null` 仍返回 403。
- [ ] 运行网关、部署合同和本地受保护流程测试。

## Task 2：建立关于页内容合同

**Files:**

- Modify: `src/lib/page-schema.ts`
- Modify: `src/content/pages/about.json`
- Modify: `tests/content-collection.test.ts`
- Modify: `tests/rendered-site.test.ts`

- [ ] 先更新测试，锁定四段正文都位于第一板块。
- [ ] 锁定 2013、京津冀、127 项、全流程四项事实及正式资质标签。
- [ ] 锁定页面不出现制作说明、旧能力卡、Tab 或移动折叠器。
- [ ] 增加可选 `companyProfile` Schema 并写入完整业务内容。

## Task 3：实现页面结构与响应式视觉

**Files:**

- Modify: `src/components/pages/AboutProfile.astro`
- Modify: `src/components/site/ChapterNav.astro`
- Modify: `src/styles/inner-page.css`
- Modify: `tests/browser/site-smoke.spec.ts`

- [ ] 将 `AboutProfile` 改为数据驱动的完整正文、企业实力和创新布局。
- [ ] 关于页页内导航改为公司简介、企业实力、创新布局、交付路径。
- [ ] 桌面使用受控长文宽度、四列事实和双列创新卡。
- [ ] 手机正文全部展开，事实两列、创新卡单列，无横向溢出。
- [ ] 移除旧能力卡专属样式与测试合同。

## Task 4：验证、视觉 QA 与项目记录

**Files:**

- Modify: `说明文档.md`
- Create: `output/about-full-profile-20260824/` 验证中间产物，不纳入提交

- [ ] 运行目标文件 Prettier。
- [ ] 运行 Astro check、单元测试、网关测试、构建、静态渲染与 Playwright。
- [ ] 在 1440×900、390×844、320×700、768×1024 复核正文、资质标签与布局。
- [ ] 确认正式页面不包含内部制作说明。
- [ ] 更新说明文档的开发计划、进度、问题与变更记录。
- [ ] 提交可追溯的本地发布候选。

## Task 5：服务器 A 发布准备

- [ ] 从已提交源码构建正式域名静态产物。
- [ ] 生成文件清单、SHA-256 清单、发布报告和回滚脚本。
- [ ] 只读核对生产 `current`、`releases/a0d4513`、容器健康、Nginx 路由及 5173/5180 回环绑定。
- [ ] 向用户报告只读核对结果并请求上传确认。

## Task 6：上传与激活

- [ ] 经确认后上传到独立 `releases/<commit>`，核验文件数量与 SHA，不切换流量。
- [ ] 向用户报告上传结果并请求切换确认。
- [ ] 经确认后原子切换 `current`，失败自动恢复 `releases/a0d4513`。
- [ ] 验证首页、关于页、联系页、AI 工厂介绍页、百度验证、404 和 Sitemap。
- [ ] 验证 `/ai-factory/` 未登录仍进入密码页、容器 healthy、5173/5180 不对公网监听。
- [ ] 执行回滚脚本只读就绪检查并记录最终 release。
