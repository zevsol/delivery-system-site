# Delivery System Site

The standalone static website for Delivery System is published at <https://ds.zevsol.com/>. The product source lives separately at <https://github.com/zevsol/delivery-system>.

## Site pages

- `/` introduces Delivery System and the preview-first workflow.
- `/demo/` presents a recorded MCP result and its copyable/downloadable Markdown draft.
- `/docs/` provides a concise source-checkout setup guide and links to canonical documentation.
- `/architecture/` explains the intended delivery pipeline and the current evidence boundaries.

## Local preview

From the repository root, run:

```powershell
python -m http.server 4321
```

Then open <http://localhost:4321/>. Use a local HTTP server so the Demo copy action can load its Markdown source.

## GitHub Pages and domain

- GitHub Pages source: `main` branch, `/(root)` directory.
- Custom domain: `ds.zevsol.com` (recorded in `CNAME`).
- Cloudflare DNS: `ds` CNAME → `zevsol.github.io`, set to **DNS only**.
- This site repository and subdomain are independent of the `zevsol.com` apex domain and the personal `zevsol.github.io` repository.
- This README does not claim that HTTPS has been enabled or verified.

## Product status and demo boundaries

- The Demo is a static display of actual historical MCP test results. It is not an online AI experience, does not make live AI calls, and does not create GitHub Issues.
- DS Lite is a prototype verified in one local Codex environment.
- DS Full's real GitHub Apply path has not completed integration acceptance.
- A formal product release has not been completed.
- Recent DS Lite Skill changes may not yet be integrated into the public `main` branch of the Delivery System source repository.

This repository contains website files only. It does not include or modify the Delivery System runtime, configure GitHub Pages, or change Cloudflare DNS.
