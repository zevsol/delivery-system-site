# Website deployment notes

This repository is the standalone static website for Delivery System. Keep it independent from the product runtime repository and the personal GitHub Pages repository.

## GitHub Pages

- Publish branch: main
- Folder: /(root)
- Custom domain: ds.zevsol.com, recorded in CNAME

## DNS

Configure ds as a Cloudflare CNAME pointing to zevsol.github.io and use DNS only. Do not proxy this record.

These are deployment notes only. They do not claim that HTTPS is enabled or verified, and they do not change GitHub Pages or Cloudflare settings.

## Build and preview

Run python tools/build_site.py to generate the bilingual HTML and sitemap. From the repository root, run python -m http.server 4321 and open http://localhost:4321/.

---

# 网站部署说明

本仓库只承载 Delivery System 的静态网站。它与产品运行时代码仓库、个人 GitHub Pages 仓库保持独立。

## GitHub Pages

- 发布分支：main
- 目录：/(root)
- 自定义域名：ds.zevsol.com，记录在 CNAME

## DNS

在 Cloudflare 中配置 ds CNAME 指向 zevsol.github.io，并使用 DNS only，不要启用代理。

以上是部署说明，不代表 HTTPS 已启用或经过验证；本任务没有更改 GitHub Pages 或 Cloudflare 配置。

## 构建与预览

运行 python tools/build_site.py 生成双语 HTML 和 sitemap。在仓库根目录运行 python -m http.server 4321，然后打开 http://localhost:4321/。
