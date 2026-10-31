# 大白话个人详批 Implementation Plan

**Goal:** 按用户参考文案的口述节奏写个性化长报告，先给判断、再举生活例子；保留自动生成、命盘、评分及依据。

**Architecture:** 共用文风提示词约束两路 AI 和补全；对生成正文做术语/模板检查并定向改写；v4 缓存使旧文案重新生成。页面先展示年度总论，再看个人特点、阶段、五领域和年月展开，支持自然分段。

**Tech Stack:** React、TypeScript、Cloudflare Worker、现有千问 JSON 接口。

- [x] 新建 `lib/guanxing/ai-voice.ts`，导出共用文风、`voiceFields(value)` 与 `applyVoicePatches(value, patch, fields)`。只检查正文键，排盘依据和引用 ID 保留。检测“这一信号可对应”、星曜堆砌和英文夹杂；只允许修改命中的字段。
- [x] 修改 `ai-server.ts`、`ai-detail.ts`、`ai-language.ts`：主判断 → 具体表现 → 哪些情况适用 → 可做什么。正文不出现术语，叙述有长有短，使用 `\n\n` 分段。丰富逐月与年度内容，并维持医学、收益、事实边界。
- [x] 在 `scripts/regression/guanxing-ai.test.ts` 验证定向修订、证据保留、无关字段不变、拒绝无效补丁；运行 `npm run test:ai` 与 `npm run typecheck`。
- [x] `ai-types.ts`、`ai-client.ts` 和缓存测试升级 v4，验证 v3 报告不能继续冒充新版。
- [x] 修改 `GuanxingAI.tsx`、`GuanxingDetailedReading.tsx` 与 CSS，整体结论前置、口语化标题、分段正文，导出保持一致。
- [x] 通过本机页面提交虚构资料，实查真实 AI 文案、12个月、十年、分数和缓存。检查手机排版并保存截图。
- [ ] Sites helper 构建和同步源码，发布原站点；同步 GitHub 并确认 CI，返回新网站和真实文案节选。
