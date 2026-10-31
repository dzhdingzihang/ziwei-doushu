# 观星：GitHub + Cloudflare 部署

正式网址：https://suanming.alixjd.com

源代码：https://github.com/dzhdingzihang/ziwei-doushu

运行路径：访客 → Cloudflare（页面与 `/api/ai-reading`）→ 阿里云千问。没有 GPT Site、ChatGPT 登录或 OpenAI API 依赖。命盘在浏览器中计算，千问密钥只保存在 Worker Secret。

## 构建和发布

Node.js 22.13+，建议 Node 22。锁定依赖：`npm ci`。

```sh
npm run typecheck
npm test
npm run test:ai
npm run test:scores
npm run build
# 本地运行生产构建
npm run start
# 发布构建产物，先通过 wrangler login 登录自己的 Cloudflare
npm run deploy:built
```

Worker 名称为 `ding-ziwei`。`wrangler.jsonc` 是源配置，Cloudflare Vite 插件生成 `dist/server/wrangler.json` 及静态资源配置。部署必须使用生成的配置。密钥用 `npx wrangler secret put DASHSCOPE_API_KEY` 设置，切勿进入 Git、构建变量、NEXT_PUBLIC_* 或日志。

## GitHub 自动部署

已连接 `dzhdingzihang/ziwei-doushu` 的 `main` 分支到 `ding-ziwei` Worker，非生产分支预览关闭；构建环境固定 Node 22。以下是当前配置及重建连接的方法。

Cloudflare Worker → Settings → Builds → Connect → 选择本仓库、main 分支。

- 根目录：`/`
- 安装命令：`npm ci`
- 构建命令：`npm run build`
- 部署命令：`npm run deploy:built`
- 非生产分支：关闭自动部署，或单独配置版本预览；不要部署到生产 Worker。
- 构建环境变量：`NODE_VERSION=22`、`NEXT_PUBLIC_SITE_URL=https://suanming.alixjd.com`。
- 运行时 Secret：`DASHSCOPE_API_KEY`。不得作为公开构建变量。

GitHub CI 负责类型、排盘、AI、评分与构建检查。使用 Cloudflare 原生 GitHub 集成可避免在 GitHub 再保存一份 Cloudflare Token。

## 网络与隐私

网页、脚本、字体和 API 由同一域名提供。访客无需直连千问或 GPT Site。优先使用自己的域名，不能承诺所有国家、运营商或单位网络均可访问；应在目标用户网络实测。

每个来源 IP 每分钟最多 24 次 AI 章节请求（同一年度 6 章，两年共 12 章）。超限 429，提示一分钟后继续，已完成内容保留。Cloudflare Rate Limiting 是各边缘位置的近似限流，不是全局计费上限；在阿里云设置余额和预算告警。

旧域名与新域名的浏览器本地存储互不相通；旧报告先导出 Markdown，换域名后可以重新录入资料。本站没有服务端出生资料数据库，无需迁移数据库。
