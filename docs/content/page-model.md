# 页面内容模型

每个内页在 `src/content/pages` 中对应一个 JSON 文件，并通过 `src/lib/page-schema.ts` 校验。

核心字段：

- `path`、`parentPath`：URL 与父级关系
- `template`：`overview`、`detail` 或 `brand`
- `visualFamily`：平台、通用、高校、中小学或品牌视觉家族
- `hero`、`images`：由 Astro 图片管线解析的资产键
- `intro`、`positioning`、`capabilities`、`scenarios`、`delivery`
- `seoTitle`、`seoDescription`、`ogImage`

修改路径或父级后必须运行 `npm run verify`。测试会阻止重复 URL、孤立父级、父级循环、缺失图片和断开的内部链接。
