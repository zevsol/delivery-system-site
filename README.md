# Delivery System — product website

A standalone, static product website for **Delivery System**, designed to live at `https://ds.zevsol.com` using GitHub Pages.

This repository contains **website files only**. It does not include the Delivery System runtime, modify `zevsol/delivery-system`, or grant GitHub API credentials.

## Pages

- `/` — product introduction and verified workflow
- `/demo/` — captured, real conceptual Preview (copyable GitHub Issue Markdown)
- `/docs/` — source-checkout quick start and links to canonical documentation
- `/architecture/` — pipeline overview and honest verification status

## Preview locally

No package installation or build is needed. From the website root:

```powershell
python -m http.server 4321
```

Open `http://localhost:4321/`. Run through a local HTTP server (not `file://`) so the Demo copy action can load `assets/sample-issue.md`.

## Deploy to GitHub Pages (standalone repository)

1. Create a **new public GitHub repository**, suggested name: `delivery-system-site` under `zevsol`. Do **not** push this into the `delivery-system` runtime repository or overwrite `zevsol.github.io`.
2. Push the files from this directory to the new repository's `main` branch.
3. Open repository **Settings → Pages**; choose **Deploy from a branch**, branch `main`, folder `/(root)`.
4. Verify the default project URL `https://zevsol.github.io/delivery-system-site/`. Relative internal routes and static asset URLs work from this project subpath.
5. When ready for the custom domain, first go to **Settings → Pages → Custom domain** and set `ds.zevsol.com`. Save. GitHub will create a `CNAME` file for branch publishing.
6. In Cloudflare DNS for `zevsol.com`, create a CNAME record `ds` pointing to `zevsol.github.io` (not the project path). Initially use **DNS only** for simpler GitHub Pages HTTPS issuance.
7. Wait for DNS/HTTPS checks, then enable **Enforce HTTPS** in GitHub Pages. Domain verification at GitHub is recommended before binding DNS.

GitHub's official instructions: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

**Important:** Neither the new repository, GitHub Pages settings, nor Cloudflare DNS was changed by creating these files. `ds.zevsol.com` is a proposed domain until setup completes.

## Boundaries / content source

- Main product: https://github.com/zevsol/delivery-system
- Canonical guide: https://github.com/zevsol/delivery-system/blob/main/docs/getting-started.md
- Canonical architecture: https://github.com/zevsol/delivery-system/blob/main/docs/architecture-and-lifecycle.md
- Demo is based on a user-supplied, real 2026-11-01 Codex + local MCP smoke test; the copyable Markdown is a display transformation of one actual work item. The demo **does not run MCP or AI live**.
- Status reflects a locally verified DS Lite prototype and the not-yet-integration-accepted DS Full write path. **The Skill change that produces copyable Issue Markdown and the new product README/Getting Started edits are still uncommitted in the local DS worktree; a new clone of the public `main` may not deliver that experience yet. Do not market the website as a released product until the source integration is complete.** Review status text before a future formal release.
- The on-site quick start is a concise overview and does not replace versioned source documentation.

## Design / operation

- Zero external JS/CSS dependencies, zero tracking scripts, no cookies or network APIs.
- Responsive desktop/mobile layout, skip link, semantic regions, keyboard focus, reduced-motion media query.
- Full-page source assets are HTML/CSS/JS; no Node build step required.
- Copy buttons require a secure context (`https://` or localhost), as usual for the Clipboard API.

## Suggested follow-up

After the product repository's own README/docs changes are finalized, align website copy with the canonical docs. Keep site content and source-code release claims synchronized rather than maintaining two competing technical specifications.
