"""Build the bilingual, dependency-free static website pages."""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://github.com/zevsol/delivery-system"
ISSUES = SOURCE + "/issues"
SLUGS = {"home": "", "demo": "demo/", "docs": "docs/", "architecture": "architecture/"}

COPY = {
"en": {
"nav": ["Product", "Recorded demo", "Docs", "Architecture"], "switch": "中文", "switch_label": "Switch language to Chinese",
"pages": ["Home", "Recorded Demo", "Documentation", "Architecture & status"],
"descriptions": ["Turn a development idea into a structured, reviewable GitHub Issue draft with Delivery System Lite.", "Explore an actual local MCP test result with its Preview receipt and Markdown draft. Static sample only; no live AI or GitHub writes.", "A concise setup path for the current Delivery System source and local stdio MCP preview workflow.", "See the preview-first workflow and the current verification boundary for Delivery System Lite and GitHub Apply."],
"navaria": "Main navigation", "skip": "Skip to content", "hero": ["A CLEARER PATH FROM IDEA TO ACTION", "Turn intent into<br><em>reviewable work.</em>", "Delivery System Lite turns a development request into a structured Work Item. Follow one recorded case through its Preview and Markdown draft."],
"hero_note": "Recorded local MCP result · no live AI · no GitHub writes", "demo_cta": "Explore the recorded case", "docs_cta": "How it works",
"story": ["ONE REAL DS LITE CASE", "A request gains shape<br>at every step.", "Follow the same portfolio request through three stages: human intent, a sealed conceptual Preview, and its Issue Markdown presentation."],
"step_names": ["Intent", "Sealed Preview", "GitHub Issue Markdown"],
"step_copy": ["A developer asks for a responsive portfolio with an introduction, projects, contact details, and keyboard access—and names what stays out of scope.", "The local planning flow returns one conceptual work item with explicit scope, non-goals, acceptance criteria, and verification. No repository was claimed.", "The recorded work item is presented as a Markdown draft to review, copy, or download. This step does not create an Issue."],
"panel_title": ["A clear request", "One reviewable outcome", "A draft you control"], "panel_desc": ["Start with the outcome and boundaries, in the developer’s own words.", "The recorded Preview organizes the request into one conceptual work item.", "Markdown presents the recorded payload; it does not write remotely."],
"intent_label": "REQUEST SUMMARY · NOT VERBATIM", "intent": "Build a responsive developer portfolio with an introduction, project showcase, and contact links. Support desktop, mobile, and keyboard use. No login, payments, or admin panel.",
"scope_label": "MADE EXPLICIT", "scope": ["Outcome and scope", "Non-goals", "Five checkable acceptance criteria", "Verification steps"], "case_progress": "CASE PROGRESS", "story_label": "INTERACTIVE WALKTHROUGH", "view_stage": "View this stage",
"trust": ["BUILT AROUND REVIEW", "Clarity before<br>commitment.", "The Lite prototype demonstrates a local planning Preview. A recorded output is evidence, not a hosted live service or an accepted remote write path."],
"trust_cards": [["01", "Preview first", "Inspect a structured result before deciding what to do next."], ["02", "Human stays in control", "Copy or download the draft yourself. Nothing is submitted for you."], ["03", "Evidence stays scoped", "See what one environment verified—and what remains unaccepted."]],
"closing": "See the draft this Preview produced.", "closing_cta": "Review the complete Markdown", "disclaimer": "Recorded result · 1 work item · 0 GitHub writes",
"capabilities": ["WHAT LITE DOES", "From request to reviewable work.", "This recorded case demonstrates one request becoming one structured item.", "CAN DO", ["Structure a request as a Work Item", "Return a Preview to inspect", "Make scope, non-goals, criteria, and checks visible", "Present a copyable GitHub Issue Markdown draft"], "NOT CLAIMED", ["Live AI generation on this website", "Verified decomposition for every request type", "Automatic GitHub Issue creation", "Accepted full GitHub Apply or a stable release"]],
"handoff": ["RECORDED MARKDOWN · 1 WORK ITEM", "Review the real draft.", "This excerpt comes from the recorded Issue Markdown. Review the full request, criteria, and verification notes in the Demo."],
"demo_kicker": "RECORDED OUTPUT · CONCEPTUAL PREVIEW", "demo_hero": "One request.<br><em>One reviewable draft.</em>", "demo_intro": "This page presents the recorded result from one local DS Lite run. It does not call AI live, request Authority, apply changes, or create a GitHub Issue.",
"tabs": ["01 · Original request", "02 · Planned Work Item", "03 · Preview evidence", "04 · Issue Markdown"], "tab_headings": ["Original request · translated", "Planned Work Item", "Preview evidence", "Issue Markdown"], "request_badge": "ENGLISH TRANSLATION · ORIGINAL INPUT WAS CHINESE",
"intent_para": "The original request recorded in the test is shown below.", "intent": "I want to build a personal portfolio website that supports desktop and mobile, with an introduction, project showcase, and contact information. The website should be mostly static, with no login, payments, or admin panel. It should provide basic keyboard accessibility and clear project links.", "receipt_para": "This is the recorded receipt identity and count summary. It represents a conceptual Preview; it is not repository-aware or eligible for Apply.", "markdown_para": "The Chinese Markdown file is the original sample. This English view is a presentation-layer translation, not a second Runtime receipt.", "raw_badge": "TRANSLATION · NOT THE ORIGINAL INPUT", "translated_badge": "TRANSLATION · NOT A SECOND RUNTIME RECEIPT", "copy": "Copy Markdown", "download": "Download Markdown", "copy_ready": "Ready to copy", "copied": "Copied to clipboard", "copy_error": "Copy unavailable. Use Download instead.", "markdown_loading": "Loading recorded Markdown…", "static_warning": "Static page · no live AI · no Authority or Apply · no GitHub Issue creation",
"docs_kicker": "LOCAL SETUP · SOURCE CHECKOUT", "docs_hero": "Run the preview<br><em>in your own Host.</em>", "docs_intro": "The verified workflow runs from a local source checkout with a compatible MCP Host. Exact configuration screens differ by Host.",
"doc_sections": [["01 / PREREQUISITES", "Before you start", "Python 3.10+, Git, the Delivery System source checkout, and an MCP Host that supports a local stdio server. The conceptual Preview flow does not need GitHub write credentials."], ["02 / INSTALL", "Create an isolated environment", "Clone the product repository and install its pinned runtime dependencies from its lock file."], ["03 / MCP SERVER", "Configure the local server", "Use the virtual-environment Python executable, launch the stdio server module, and set a dedicated local workspace root for Preview state. Host configuration syntax varies."], ["04 / SKILL", "Load the planning Skill", "Expose the planning Skill folder using the Host’s Skill mechanism. Hosts do not all discover repository Skills automatically."], ["05 / FIRST REQUEST", "Describe an outcome", "State the goal, scope, constraints, and non-goals. Review the returned Preview before copying any Issue draft."]],
"code_copy": "Copy command", "code_copied": "Copied", "docs_note": "This is a source-checkout guide, not a universal installer. A fresh checkout of public main may not include the recent DS Lite Skill Markdown presentation changes.", "formal_docs": "Formal product documentation", "doc_links": ["Getting started", "User workflow", "Host configuration", "Release compatibility"],
"arch_kicker": "CAPABILITY IS NOT ACCEPTANCE", "arch_hero": "Designed for governed<br><em>delivery.</em>", "arch_intro": "The full model separates planning from remote change. This site reports what was verified in one local workflow and what still needs integration acceptance.",
"arch_steps": [["01 · VERIFIED", "Plan", "Create a Sealed Preview from development intent.", "Verified in one local Codex + MCP environment."], ["02 · SOURCE CAPABILITY", "Audit", "Review a precise Preview and its evidence.", "Source capability; end-to-end acceptance is separate."], ["03 · EXPLICIT DECISION", "Approval", "Approve one Preview revision.", "A human decision, not a model inference."], ["04 · NOT ACCEPTED", "GitHub Apply", "Apply bounded GitHub changes and record receipts.", "Real GitHub Apply has not completed integration acceptance."]],
"status_title": "Honest status", "status": [["DS Lite Preview", "Verified locally in one Codex environment"], ["Issue Markdown", "Recorded sample; Skill update may not be on public main"], ["GitHub Apply", "Integration acceptance not completed"], ["Formal release", "Not completed"]],
"footnote": "No analytics, tracking pixels, ad scripts, live AI calls, or GitHub write actions.", "footer_note": "Static product website · product source and status maintained separately",
},
"zh": {
"nav": ["产品", "记录演示", "文档", "架构"], "switch": "English", "switch_label": "Switch language to English",
"pages": ["首页", "记录演示", "文档", "架构与状态"],
"descriptions": ["Delivery System Lite 将开发想法整理成结构化、可审查的 GitHub Issue 草稿。", "查看一次真实的本地 MCP 测试结果、预览回执和 Markdown 草稿。静态展示，不调用实时 AI 或写入 GitHub。", "根据当前 Delivery System 源码配置本地 stdio MCP 预览流程的简明指南。", "了解预览优先的工作流，以及 Delivery System Lite 和 GitHub Apply 当前的验证边界。"],
"navaria": "主导航", "skip": "跳转到正文", "hero": ["从开发需求到清晰交付", "把开发需求<br><em>整理成可审阅的<br>工作项。</em>", "Delivery System Lite 将开发需求整理成结构化工作项。通过一条真实记录，查看对应预览和 Markdown 草稿。"],
"hero_note": "本地 MCP 历史结果 · 不调用实时 AI · 不写入 GitHub", "demo_cta": "查看真实记录案例", "docs_cta": "了解工作方式",
"story": ["一个真实的 DS LITE 案例", "需求在每一步<br>变得更清晰。", "同一个作品集需求，依次经过三个阶段：人的意图、封存的概念预览，以及展示为 Issue Markdown 的草稿。"],
"step_names": ["需求意图", "封存预览", "GitHub Issue Markdown"],
"step_copy": ["开发者希望制作一个响应式作品集，包含个人介绍、项目、联系方式和键盘访问能力，同时明确排除哪些范围。", "本地规划流程返回一个概念级工作项，明确列出范围、非目标、验收标准和验证步骤。没有声明目标仓库。", "记录中的工作项被呈现为 Markdown 草稿，供人审阅、复制或下载。此步骤不会创建 Issue。"],
"panel_title": ["清晰的需求", "一个可审查的结果", "由你掌控的草稿"], "panel_desc": ["用开发者自己的语言描述目标和边界。", "记录中的预览把需求整理成一个概念级工作项。", "Markdown 是对记录内容的展示，不会写入远端。"],
"intent_label": "需求摘要 · 非逐字原文", "intent": "制作一个响应式开发者作品集，包含个人介绍、项目展示和联系链接。支持桌面、手机和键盘操作。不需要登录、支付或管理后台。",
"scope_label": "预览明确整理的内容", "scope": ["目标与范围", "非目标", "五项可检查的验收标准", "验证步骤"], "case_progress": "案例进度", "story_label": "交互式过程演示", "view_stage": "查看此阶段",
"trust": ["围绕审阅而设计", "先看清楚，<br>再做决定。", "Lite 原型展示的是本地规划预览。历史结果可以作为证据，但它不是在线托管服务，也不代表远端写入流程已验收。"],
"trust_cards": [["01", "预览优先", "先检查结构化结果，再决定下一步。"], ["02", "由人掌控", "自行复制或下载草稿，不会替你提交。"], ["03", "证据有边界", "清楚展示单一环境验证了什么、还有什么未验收。"]],
"closing": "看看预览整理出的草稿。", "closing_cta": "查看完整 Markdown", "disclaimer": "历史记录 · 1 个工作项 · 0 次 GitHub 写入",
"capabilities": ["DS LITE 能做什么", "从需求到可审阅的工作项。", "这条真实记录展示一个需求如何整理成一个结构化工作项。", "可以做到", ["把需求整理成 Work Item", "返回可检查的 Preview", "明确范围、非目标、验收条件和验证方式", "提供可复制的 GitHub Issue Markdown 草稿"], "当前未验证", ["本站实时调用 AI 生成结果", "适用于所有需求类型的拆分", "自动创建 GitHub Issue", "DS Full GitHub Apply 已通过集成验收或正式发布"]],
"handoff": ["历史 Markdown · 1 个工作项", "查看真实草稿。", "以下节选来自记录中的 Issue Markdown。打开 Demo 查看完整需求、验收条件和验证说明。"],
"demo_kicker": "历史结果 · 概念预览", "demo_hero": "一个需求。<br><em>一份可审阅的草稿。</em>", "demo_intro": "此页面展示一次本地 DS Lite 运行的历史结果。它不会实时调用 AI、申请 Authority、执行 Apply，也不会创建 GitHub Issue。",
"tabs": ["01 · 原始需求", "02 · 计划工作项", "03 · Preview 证据", "04 · Issue Markdown"], "tab_headings": ["原始需求", "计划工作项", "Preview 证据", "Issue Markdown"], "request_badge": "原始中文请求 · Runtime 输入",
"intent_para": "以下为测试中记录的原始中文请求。", "intent": "我要开发一个个人作品集网站，支持桌面和移动端，包含个人介绍、项目展示和联系方式。网站以静态内容为主，不需要登录、支付或后台管理。要求基本键盘可访问性和清晰的项目链接。", "receipt_para": "这里展示准确的历史回执标识和计数。它是概念级预览，不针对仓库，也不具备 Apply 写入资格。", "markdown_para": "中文 Markdown 文件是原始样本。英文页面展示的是展示层翻译，不是另一份 Runtime 回执。", "raw_badge": "原始输入 · Runtime 中文记录", "translated_badge": "展示层英文翻译 · 非另一份 Runtime 回执", "copy": "复制 Markdown", "download": "下载 Markdown", "copy_ready": "可复制", "copied": "已复制到剪贴板", "copy_error": "无法复制，请使用下载。", "markdown_loading": "正在读取记录中的 Markdown…", "static_warning": "静态页面 · 不调用实时 AI · 不申请 Authority 或执行 Apply · 不创建 GitHub Issue",
"docs_kicker": "本地配置 · 源码检出", "docs_hero": "在你自己的 Host 中<br><em>运行本地预览。</em>", "docs_intro": "已验证的流程从本地源码检出开始，并使用兼容的 MCP Host。不同 Host 的配置界面会有所不同。",
"doc_sections": [["01 / 前置条件", "开始之前", "需要 Python 3.10+、Git、Delivery System 源码，以及支持本地 stdio 服务的 MCP Host。概念预览流程不需要 GitHub 写入凭据。"], ["02 / 安装", "创建隔离环境", "克隆产品源码仓库，并根据仓库锁定文件安装运行时依赖。"], ["03 / MCP 服务", "配置本地服务", "使用虚拟环境中的 Python 启动 stdio 服务模块，并为预览状态设置专用本地工作区。各 Host 的配置格式不同。"], ["04 / Skill", "加载规划 Skill", "通过 Host 自身的 Skill 机制加载规划 Skill 文件夹。不同 Host 不一定会自动发现仓库中的 Skill。"], ["05 / 第一个需求", "描述目标结果", "写清目标、范围、约束和非目标。检查返回的预览后，再决定是否复制 Issue 草稿。"]],
"code_copy": "复制命令", "code_copied": "已复制", "docs_note": "这是源码检出指南，不是通用一键安装器。公开 main 的新检出版本可能尚未包含近期 DS Lite Skill 的 Markdown 展示改动。", "formal_docs": "产品正式文档", "doc_links": ["快速开始", "用户工作流", "Host 配置", "发布兼容性"],
"arch_kicker": "具备能力不等于通过验收", "arch_hero": "为受治理的交付<br><em>而设计。</em>", "arch_intro": "完整模型将规划与远端修改分开。本站说明哪些部分在一个本地流程中得到验证，哪些仍需集成验收。",
"arch_steps": [["01 · 已验证", "Plan", "根据开发意图生成 Sealed Preview。", "已在一个本地 Codex + MCP 环境验证。"], ["02 · 源码能力", "Audit", "审查指定预览及其证据。", "源码具备能力；端到端验收仍需单独完成。"], ["03 · 明确决策", "Approval", "批准某个预览修订版本。", "由人明确决策，不从模型回复推断。"], ["04 · 尚未验收", "GitHub Apply", "执行有界 GitHub 修改并记录回执。", "真实 GitHub Apply 尚未完成集成验收。"]],
"status_title": "如实说明当前状态", "status": [["DS Lite Preview", "已在一个 Codex 环境本地验证"], ["Issue Markdown 展示", "有记录样本；Skill 改动可能尚未进入公开 main"], ["GitHub Apply", "尚未完成集成验收"], ["正式发布", "尚未完成"]],
"footnote": "不使用分析追踪、像素、广告脚本、实时 AI 调用或 GitHub 写入操作。", "footer_note": "静态产品网站 · 源码与产品状态分别维护",
}}
def esc(value):
    return escape(str(value), quote=True)

def route(lang, slug):
    return "/zh/" + slug if lang == "zh" else "/" + slug

def pageshell(lang, page, prefix, t):
    idx = {"home": 0, "demo": 1, "docs": 2, "architecture": 3}[page]
    en = "https://ds.zevsol.com/" + SLUGS[page]
    zh = "https://ds.zevsol.com/zh/" + SLUGS[page]
    url = zh if lang == "zh" else en
    lang_url = en if lang == "zh" else zh
    sw = lang_url.removeprefix("https://ds.zevsol.com")
    nav = "".join(f'<a href="{prefix}{"zh/" if lang == "zh" else ""}{s}" {"aria-current=\"page\"" if i == idx else ""}>{esc(t["nav"][i])}</a>' for i, s in enumerate(SLUGS.values()))
    title = esc(t["pages"][idx] + " — Delivery System")
    if page == "home": title = esc("Delivery System — " + ("intent into reviewable work" if lang == "en" else "从意图到可审查的工作"))
    brand = f'<a class="brand" href="{prefix}{"zh/" if lang == "zh" else ""}" aria-label="Delivery System"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M8 11h13M8 18h20M8 25h11"/><circle cx="26" cy="25" r="3"/></svg></span><span>delivery<span class="brand-dot">.</span>system</span></a>'
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f8ff"><title>{title}</title><meta name="description" content="{esc(t['descriptions'][idx])}"><link rel="canonical" href="{url}"><link rel="alternate" hreflang="en" href="{en}"><link rel="alternate" hreflang="zh" href="{zh}"><link rel="alternate" hreflang="x-default" href="{en}"><meta property="og:type" content="website"><meta property="og:site_name" content="Delivery System"><meta property="og:title" content="{title}"><meta property="og:description" content="{esc(t['descriptions'][idx])}"><meta property="og:url" content="{url}"><meta property="og:image" content="https://ds.zevsol.com/assets/og-preview.png"><meta property="og:locale" content="{'zh_CN' if lang == 'zh' else 'en_US'}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/svg+xml" href="{prefix}assets/favicon.svg"><link rel="stylesheet" href="{prefix}assets/style.css"><script defer src="{prefix}assets/site.js"></script></head><body class="lang-{lang} page-{page}"><a class="skip-link" href="#main">{esc(t['skip'])}</a><header class="site-header"><div class="nav-wrap">{brand}<button class="menu-toggle" type="button" aria-label="{'打开导航' if lang == 'zh' else 'Open navigation'}" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span></button><nav id="site-nav" class="site-nav" aria-label="{esc(t['navaria'])}">{nav}</nav><div class="header-actions"><a class="language-switch" href="{sw}" lang="{'en' if lang == 'zh' else 'zh'}" aria-label="{esc(t['switch_label'])}">{esc(t['switch'])}<span aria-hidden="true">↗</span></a><a class="github-link" href="{SOURCE}" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div></div></header><main id="main">'''

def footer(lang, prefix, t, page):
    zhprefix = "zh/" if lang == "zh" else ""
    brand = f'<a class="brand" href="{prefix}{zhprefix}"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M8 11h13M8 18h20M8 25h11"/><circle cx="26" cy="25" r="3"/></svg></span><span>delivery<span class="brand-dot">.</span>system</span></a>'
    links = "".join(f'<a href="{prefix}{zhprefix}{slug}">{esc(t["nav"][i])}</a>' for i, slug in enumerate(list(SLUGS.values())[1:], 1))
    links += f'<a href="{SOURCE}" target="_blank" rel="noopener noreferrer">{"产品源码" if lang == "zh" else "Product source"} ↗</a><a href="{ISSUES}" target="_blank" rel="noopener noreferrer">{"反馈与问题" if lang == "zh" else "Feedback issues"} ↗</a>'
    paired = ("/" if page == "home" else "/" + SLUGS[page]) if lang == "zh" else "/zh/" + SLUGS[page]
    if page == "home" and lang == "zh":
        paired = "/"
    return f'</main><footer class="site-footer"><div class="footer-top">{brand}<p>{esc(t["footer_note"])}</p></div><div class="footer-links">{links}<a href="{paired}" lang="{"en" if lang == "zh" else "zh"}">{esc(t["switch"])}</a></div><div class="footer-bottom"><span>© 2026 Delivery System</span><span>{esc(t["footnote"])}</span></div></footer></body></html>'

def recorded_issue(lang):
    filename = "sample-issue.en.md" if lang == "en" else "sample-issue.md"
    lines = (ROOT / "assets" / filename).read_text(encoding="utf-8").splitlines()
    titles = [line[2:] for line in lines if line.startswith("# ")]
    if len(titles) != 1:
        raise ValueError(f"Expected one recorded Work Item in {filename}, found {len(titles)}")
    title = titles[0]
    sections = {}
    current = None
    for line in lines:
        if line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current and line.startswith("- "):
            sections[current].append(line[2:].strip())
    required = ("Scope", "Non-goals", "Acceptance Criteria", "Verification")
    if any(not sections.get(name) for name in required):
        raise ValueError(f"Recorded Work Item sections are incomplete in {filename}")
    criteria = sections["Acceptance Criteria"]
    snippet = "# " + title + "\n\n## Acceptance Criteria\n\n" + "\n".join(f"- {item}" for item in criteria)
    outcome_lines = []
    in_outcome = False
    for line in lines:
        if line.startswith("## "):
            in_outcome = line[3:].strip() == "Background / Outcome"
        elif in_outcome and line.strip():
            outcome_lines.append(line.strip())
    if not outcome_lines:
        raise ValueError(f"Recorded Work Item outcome is missing in {filename}")
    outcome = " ".join(outcome_lines)
    return title, sections, snippet, outcome


def home_page(lang, prefix, t):
    names, copies = t["step_names"], t["step_copy"]
    work_item_title, issue, markdown_excerpt, _ = recorded_issue(lang)
    excerpt = esc(markdown_excerpt)
    demo_href = prefix + ("zh/" if lang == "zh" else "") + "demo/"
    buttons = []
    for i in range(3):
        buttons.append(f'<article class="story-stop" data-story-section="{i}"><div class="story-index">0{i+1}</div><div><h3>{esc(names[i])}</h3><p>{esc(copies[i])}</p><span class="step-status">{esc(["Request received", "Preview sealed", "Draft ready"][i] if lang == "en" else ["收到需求", "预览已封存", "草稿已就绪"][i])}</span><button class="step-trigger" type="button" data-story-step data-story-template="#stage-{i+1}" data-kicker="{esc(t['story_label'])}" data-title="{esc(t['panel_title'][i])}" data-description="{esc(t['panel_desc'][i])}" aria-current="{'step' if i == 0 else 'false'}">{esc(t['view_stage'])} <span aria-hidden="true">↗</span></button></div></article>')
    tags = ["Responsive", "Keyboard-ready", "Static content"] if lang == "en" else ["响应式", "支持键盘访问", "静态内容"]
    tag_html = "".join(f"<span>{esc(tag)}</span>" for tag in tags)
    panel = f'''<div class="intent-card"><span class="panel-overline">{esc(t["intent_label"])}</span><p>{esc(t["intent"])}</p><div class="tag-row">{tag_html}</div></div>'''
    group_names = ["Scope", "Non-goals", "Acceptance Criteria", "Verification"] if lang == "en" else ["范围", "非目标", "验收条件", "验证说明"]
    group_keys = ["Scope", "Non-goals", "Acceptance Criteria", "Verification"]
    preview_group_parts = []
    for label, key in zip(group_names, group_keys):
        group_items = "".join("<li>" + esc(item) + "</li>" for item in issue[key])
        preview_group_parts.append(f'<details><summary><span>{esc(label)}</span><b>{len(issue[key])}</b></summary><ul>{group_items}</ul></details>')
    preview_groups = "".join(preview_group_parts)
    record_label = "RECORDED WORK ITEM · 01" if lang == "en" else "真实记录中的工作项 · 01"
    receipt = '<b>Conceptual</b><span>·</span><span>1 work item</span><span>·</span><span>0 writes</span>' if lang == "en" else '<b>Conceptual</b><span>·</span><span>1 个工作项</span><span>·</span><span>0 次写入</span>'
    excerpt_label = "MARKDOWN EXCERPT · ACCEPTANCE CRITERIA" if lang == "en" else "Markdown 节选 · 原始中文验收条件；样本章节标题为英文"
    full_demo = "Open the complete recorded Demo ↗" if lang == "en" else "查看完整记录演示 ↗"
    draft_label = "ISSUE MARKDOWN · RECORDED EXCERPT" if lang == "en" else "Issue Markdown · 真实记录节选"
    stage2 = f'''<article class="work-item-preview"><div class="work-item-heading"><span class="panel-overline">{record_label}</span><h4>{esc(work_item_title)}</h4></div><div class="preview-groups">{preview_groups}</div><div class="receipt-chip">{receipt}</div></article>'''
    stage3 = f'''<article class="draft-card"><div class="draft-head"><span class="file-chip">MD</span><span>{draft_label}</span></div><small class="excerpt-label">{excerpt_label}</small><pre>{excerpt}</pre><a class="text-link" href="{demo_href}">{full_demo}</a></article>'''
    templates = f'<template id="stage-1">{panel}</template><template id="stage-2">{stage2}</template><template id="stage-3">{stage3}</template>'
    capabilities = t["capabilities"]
    can_list = "".join(f'<li><span aria-hidden="true">✓</span>{esc(item)}</li>' for item in capabilities[4])
    cannot_list = "".join(f'<li><span aria-hidden="true">—</span>{esc(item)}</li>' for item in capabilities[6])
    handoff = t["handoff"]
    handoff_card = f'''<div class="handoff-document"><div class="handoff-bar"><span class="file-chip">MD</span><span>{handoff[0]}</span><span class="handoff-dot"></span></div><strong>{esc(work_item_title)}</strong><small>{excerpt_label}</small><pre>{excerpt}</pre></div>'''
    trustcards = "".join(f'<article class="trust-card"><span>{esc(n)}</span><h3>{esc(h)}</h3><p>{esc(d)}</p></article>' for n, h, d in t["trust_cards"])
    part_1 = f'''<section class="hero-section"><div class="hero-grid-bg"></div><div class="hero-glow hero-glow-a"></div><div class="hero-glow hero-glow-b"></div><div class="hero-inner"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-mark"></span>{esc(t['hero'][0])}</p><h1>{t['hero'][1]}</h1><p class="hero-lead">{esc(t['hero'][2])}</p><div class="hero-actions"><a class="button button-primary" href="{prefix}{'zh/' if lang == 'zh' else ''}demo/">{esc(t['demo_cta'])}<span aria-hidden="true">↗</span></a><a class="button button-quiet" href="{prefix}{'zh/' if lang == 'zh' else ''}docs/">{esc(t['docs_cta'])}<span aria-hidden="true">→</span></a></div><p class="hero-note"><span class="mint-dot"></span>{esc(t['hero_note'])}</p></div><div class="hero-art" aria-label="{'Three connected preview stages' if lang == 'en' else '相连的三个预览阶段'}"><div class="art-grid"></div><div class="art-orbit"></div><div class="float-tag tag-intent">01 <span>INTENT</span></div><div class="float-tag tag-preview">02 <span>SEALED</span></div><div class="float-tag tag-markdown">03 <span>MARKDOWN</span></div><div class="hero-stack"><div class="stack-back"></div><div class="stack-mid"></div><div class="stack-front"><div class="mock-window"><i></i><i></i><i></i><span>preview_receipt.json</span></div><div class="mock-label">{'SEALED PREVIEW' if lang == 'en' else '封存预览'}</div><div class="mock-line wide"></div><div class="mock-line"></div><div class="mock-check"><b>✓</b> {'Scope is explicit' if lang == 'en' else '范围已明确'}</div><div class="mock-check"><b>✓</b> {'Review before write' if lang == 'en' else '先审阅，再写入'}</div><div class="mock-footer"><span class="mint-dot"></span> Conceptual <span>REV 01</span></div></div></div><div class="art-connector connector-one"></div><div class="art-connector connector-two"></div><div class="art-caption">DS LITE · LOCAL MCP · RECORDED</div></div></div><div class="hero-bottom"><span>PLAN <i>→</i> REVIEW <i>→</i> DELIVER</span><span>01 / 03</span></div></section>'''
    part_2 = f'''<section class="story-section" id="story"><div class="section-heading"><p class="eyebrow">{esc(t['story'][0])}</p><h2>{t['story'][1]}</h2><p>{esc(t['story'][2])}</p></div><div class="story-layout"><div class="story-steps">{''.join(buttons)}</div><aside class="product-panel" data-story-panel data-active-step="1" aria-live="polite"><div class="panel-top"><span data-panel-kicker>{esc(t['story_label'])}</span><span class="panel-count" data-story-counter>01 / 03</span></div><h3 data-panel-title>{esc(t['panel_title'][0])}</h3><p class="panel-description" data-panel-description>{esc(t['panel_desc'][0])}</p><div class="panel-progress" role="progressbar" aria-label="{esc(t['case_progress'])}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1"><span data-story-progress></span></div><div data-panel-content>{panel}</div><div class="panel-foot"><span><i class="mint-dot"></i> {esc(t['case_progress'])}</span><span data-story-counter>01 / 03</span></div></aside></div>{templates}</section>'''
    part_3 = f'''<section class="capability-section"><div class="capability-intro"><p class="eyebrow">{esc(capabilities[0])}</p><h2>{esc(capabilities[1])}</h2><p>{esc(capabilities[2])}</p></div><div class="capability-columns"><section><h3>{esc(capabilities[3])}</h3><ul>{can_list}</ul></section>'''
    part_4 = f'''<section><h3>{esc(capabilities[5])}</h3><ul>{cannot_list}</ul></section></div></section><section class="trust-section"><div class="trust-copy"><p class="eyebrow">{esc(t['trust'][0])}</p><h2>{t['trust'][1]}</h2><p>{esc(t['trust'][2])}</p><a class="text-link" href="{prefix}{'zh/' if lang == 'zh' else ''}architecture/">{esc(t['nav'][3])} <span aria-hidden="true">→</span></a></div><div class="trust-cards">{trustcards}</div></section>'''
    part_5 = f'''<section class="closing-band"><div class="handoff-copy"><p class="eyebrow">{esc(handoff[0])}</p><h2>{esc(handoff[1])}</h2><p>{esc(handoff[2])}</p><a class="button button-primary" href="{demo_href}">{esc(t['closing_cta'])}<span aria-hidden="true">↗</span></a></div>{handoff_card}</section>'''
    return "".join([part_1,part_2,part_3,part_4,part_5])
def demo_page(lang, prefix, t):
    mdfile = "sample-issue.en.md" if lang == "en" else "sample-issue.md"
    mdurl = prefix + "assets/" + mdfile
    work_item_title, issue, markdown_excerpt, outcome = recorded_issue(lang)
    if lang == "en":
        other_title, other_sections, _, _ = recorded_issue("zh")
    else:
        other_title, other_sections, _, _ = recorded_issue("en")
    if work_item_title == other_title or any(len(issue[key]) != len(other_sections[key]) for key in ("Scope", "Non-goals", "Acceptance Criteria", "Verification")):
        raise ValueError("Recorded bilingual Issue samples do not align")
    labels = {
        "en": {"Scope": "Scope", "Non-goals": "Non-goals", "Acceptance Criteria": "Acceptance Criteria", "Verification": "Verification"},
        "zh": {"Scope": "范围", "Non-goals": "非目标", "Acceptance Criteria": "验收条件", "Verification": "验证说明"},
    }[lang]
    summary_one = "One planned GitHub Issue draft" if lang == "en" else "一份计划中的 GitHub Issue 草稿"
    summary_counts = [
        (len(issue["Scope"]), labels["Scope"]),
        (len(issue["Acceptance Criteria"]), labels["Acceptance Criteria"]),
        (len(issue["Verification"]), labels["Verification"]),
        (len(issue["Non-goals"]), labels["Non-goals"]),
    ]
    summary = f'<div class="outcome-summary"><div class="outcome-lead"><span class="file-chip">01</span><div><strong>{summary_one}</strong><span>{esc(work_item_title)}</span><small>{"Planned only · no GitHub Issue exists from this Preview" if lang == "en" else "仅为规划结果 · 此 Preview 未创建 GitHub Issue"}</small></div></div><div class="outcome-counts">' + "".join(f'<div><strong>{count}</strong><span>{esc(label)}</span></div>' for count, label in summary_counts) + '</div></div>'
    tabs = "".join(f'<button id="demo-tab-{i+1}" class="demo-tab" type="button" role="tab" aria-controls="demo-panel-{i+1}" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}" data-demo-tab>{esc(label)}</button>' for i, label in enumerate(t["tabs"]))
    raw = "<section id=\"demo-panel-1\" class=\"demo-stage-panel\" role=\"tabpanel\" aria-labelledby=\"demo-tab-1\" data-demo-panel><div class=\"stage-heading\"><p class=\"eyebrow\">01 / " + esc(t["tab_headings"][0]) + "</p><h2>" + esc(t["step_names"][0]) + "</h2><p>" + esc(t["intent_para"]) + "</p><span class=\"translation-badge\">" + esc(t["request_badge"]) + "</span></div><blockquote>" + esc(t["intent"]) + "</blockquote><div class=\"boundary-note\">" + ("Faithful English translation of the original Chinese request." if lang == "en" else "此处为真实测试输入，按原文展示。") + "</div></section>"
    if lang == "en":
        work_item_copy = "A Work Item is a structured planned delivery result. The planned create_issue operation records intent; it does not mean GitHub executed it. One Work Item usually maps to one planned Issue, and is not a remote Issue itself."
        relations_heading, no_relations = "Planned relationships", "This case has no planned parent-child relationship or dependency."
        parent_copy = "Parent / Sub-Issue · add_sub_issue · child → parent"
        dependency_copy = "Dependency · add_dependency · dependent → prerequisite"
        evidence_head = "Current receipt status"
        statuses = [("Preview level", "Conceptual"), ("Repository claim", "Not provided"), ("Remote snapshot", "None"), ("Planned relationships", "None"), ("GitHub writes", "None occurred"), ("Revision", "1")]
        technical = "Technical details", "Historical MCP execution report · exact receipt values"
        repository_explanation = "null means this Preview was not bound to a target repository."
        snapshot_explanation = "null means no remote snapshot was attached to this Preview."
        eligibility_explanation = "false means this Preview was not eligible for GitHub writes; it does not rule out Audit."
        provenance_explanation = "The source was declared but was not externally verified."
        current_desc = "No target repository or remote snapshot was provided; this is a conceptual plan."
        aware_desc = "A target repository and relevant remote evidence are available, but the result has not met all write-eligibility conditions."
        eligible_desc = "Remote queries are complete, the planned operations meet write conditions, and no relevant blockers remain. Separate Audit, Human Approval, and Authority conditions are still required."
        planned = "Planned Work Item · not a created Issue"
        outcome_label = "Outcome"
        relation_explain = "An Independent Work Item has no planned relation. Other relation types below explain supported operation semantics; they are not present in this case."
    else:
        work_item_copy = "Work Item 是 DS 规划中的结构化交付结果。计划操作 create_issue 只表示操作意图，不代表已在 GitHub 执行。一个 Work Item 通常对应一个计划创建的 Issue，但它本身不是远端 Issue。"
        relations_heading, no_relations = "计划关系", "此案例没有规划父子关系或依赖关系。"
        parent_copy = "父项 / 子 Issue · add_sub_issue · 子项 → 父项"
        dependency_copy = "依赖关系 · add_dependency · 依赖项 → 前置项"
        evidence_head = "当前回执状态"
        statuses = [("Preview Level", "Conceptual"), ("Repository Claim", "未提供"), ("Remote Snapshot", "无"), ("计划关系", "无"), ("GitHub 写入", "未发生"), ("Revision", "1")]
        technical = "技术详情", "历史 MCP 执行报告 · 回执原始值"
        repository_explanation = "null 表示此 Preview 未绑定目标仓库。"
        snapshot_explanation = "null 表示此 Preview 未附带远端快照。"
        eligibility_explanation = "false 表示此 Preview 不具备 GitHub 写入资格；这不代表绝对不能进行 Audit。"
        provenance_explanation = "来源为声明值，未经外部验证。"
        current_desc = "未提供目标仓库或远端快照；这是概念规划。"
        aware_desc = "具备目标仓库和相关远端证据，但尚未满足完整写入资格条件。"
        eligible_desc = "远端查询完整、规划操作符合写入条件且没有相关阻塞；仍需独立满足 Audit、Human Approval 和 Authority 条件。"
        planned = "计划工作项 · 并非已创建的 Issue"
        outcome_label = "预期结果"
        relation_explain = "独立工作项没有规划关系。下方其他关系类型仅解释支持的操作语义，不代表本案例存在这些关系。"

    item_fields = []
    for key in ("Scope", "Non-goals", "Acceptance Criteria", "Verification"):
        entries = "".join(f'<li>{esc(item)}</li>' for item in issue[key])
        item_fields.append(f'<details class="item-field"><summary>{esc(labels[key])}<span>{len(issue[key])}</span></summary><ul>{entries}</ul></details>')
    item = f'<section id="demo-panel-2" class="demo-stage-panel" role="tabpanel" aria-labelledby="demo-tab-2" data-demo-panel hidden><div class="stage-heading"><p class="eyebrow">02 / {esc(t["tab_headings"][1])}</p><h2>{planned}</h2><p>{work_item_copy}</p></div><article class="planned-item"><span class="translation-badge">{"ONE RECORDED WORK ITEM" if lang == "en" else "一项真实记录中的工作项"}</span><h3>{esc(work_item_title)}</h3><h4>{outcome_label}</h4><p>{esc(outcome)}</p><div class="item-fields">{"".join(item_fields)}</div><section class="relation-note"><h4>{relations_heading}</h4><p>{no_relations}</p><p>{relation_explain}</p><ul><li>Independent Work Item · {"no planned relationship" if lang == "en" else "无规划关系"}</li><li>{parent_copy}</li><li>{dependency_copy}</li></ul></section></article></section>'

    level_details = [
        ("Conceptual", current_desc, True),
        ("RepositoryAware", aware_desc, False),
        ("WriteEligible", eligible_desc, False),
    ]
    levels = "".join(f'<details class="level-node{" is-current" if current else ""}" {"open" if current else ""}><summary><span class="level-dot" aria-hidden="true"></span><span><strong>{name}</strong><small>{"CURRENT RECORDED LEVEL" if current and lang == "en" else "当前历史回执等级" if current else "CONTRACT EXPLANATION" if lang == "en" else "契约说明"}</small></span>{"<b class=\"current-pill\">CURRENT</b>" if current and lang == "en" else "<b class=\"current-pill\">当前</b>" if current else "<span class=\"level-chevron\" aria-hidden=\"true\">＋</span>"}</summary><p>{description}</p></details>' for name, description, current in level_details)
    status_rows = "".join(f'<div><dt>{esc(key)}</dt><dd>{esc(value)}</dd></div>' for key, value in statuses)
    preview_id = "preview-5e03cf0f4e7c4e978d1ff62b1405ebf8"
    copy_label = "Copy" if lang == "en" else "复制"
    copy_status = "Copied" if lang == "en" else "已复制"
    tech_values = [
        ("Preview ID", preview_id, True, ""),
        ("Request ID", "request-ea987c77b7924a2794d85d198f95dcd5", True, ""),
        ("Revision", "1", False, ""),
        ("Preview Level", "Conceptual", False, ""),
        ("Repository Identity", "null", False, repository_explanation),
        ("Remote Snapshot", "null", False, snapshot_explanation),
        ("Write Eligibility", "false", False, eligibility_explanation),
        ("Provenance Status", "declared_unverified", False, provenance_explanation),
    ]
    tech_rows = "".join(f'<div><dt>{esc(key)}</dt><dd><code>{esc(value)}</code>{f"<button type=\"button\" class=\"copy-id\" aria-label=\"{copy_label} {esc(key)}\" data-copy-text=\"{esc(value)}\" data-copied-label=\"{copy_status}\">{copy_label}</button>" if copy else ""}</dd>{f"<small style=\"grid-column:2;color:#687b95;font-size:9px;line-height:1.5\">{esc(explanation)}</small>" if explanation else ""}</div>' for key, value, copy, explanation in tech_values)
    evidence = f'<section id="demo-panel-3" class="demo-stage-panel" role="tabpanel" aria-labelledby="demo-tab-3" data-demo-panel hidden><div class="stage-heading"><p class="eyebrow">03 / {esc(t["tab_headings"][2])}</p><h2>{evidence_head}</h2><p>{"This fixed track explains the contract levels. Only Conceptual is the level recorded for this case; selecting an explanation never changes the receipt." if lang == "en" else "此固定轨道用于解释契约等级。本案例真实记录仅为 Conceptual；展开其他说明不会改变回执。"}</p></div><div class="level-track" aria-label="Preview level contract">{levels}</div><dl class="evidence-status">{status_rows}</dl><details class="technical-details"><summary>{technical[0]}<span>{"IDENTIFIERS & PROVENANCE" if lang == "en" else "技术标识与来源"}</span></summary><p>{technical[1]}</p><dl class="technical-grid">{tech_rows}</dl><p class="copy-status" data-tech-copy-status aria-live="polite"></p></details></section>'

    excerpt = esc(markdown_excerpt)
    md = f'<section id="demo-panel-4" class="demo-stage-panel markdown-stage" role="tabpanel" aria-labelledby="demo-tab-4" data-demo-panel hidden><div class="stage-heading"><p class="eyebrow">04 / {esc(t["tab_headings"][3])}</p><h2>{esc(work_item_title)}</h2><span class="translation-badge">{esc(t["translated_badge"] if lang == "en" else t["raw_badge"])}</span><p>{esc(t["markdown_para"])}</p></div><div class="markdown-toolbar"><span class="file-chip">MD</span><span>delivery-system-issue-draft.md</span><span class="toolbar-spacer"></span><button class="button button-small" type="button" data-copy-url="{mdurl}" data-copied-label="{esc(t["copied"])}" data-copy-error-label="{esc(t["copy_error"])}">{esc(t["copy"])}</button><a class="button button-small button-outline" href="{mdurl}" download="{"delivery-system-issue-draft.en.md" if lang == "en" else "delivery-system-issue-draft.md"}">{esc(t["download"])}</a></div><pre class="markdown-source" data-load-markdown="{mdurl}" data-load-error="{esc(t["copy_error"])}" aria-live="polite">{esc(t["markdown_loading"])}</pre><p class="copy-status" data-copy-status>{esc(t["copy_ready"])}</p></section>'
    return f'<section class="subpage-hero demo-hero"><div class="subpage-grid"></div><div class="subpage-inner"><p class="eyebrow"><span class="eyebrow-mark"></span>{esc(t["demo_kicker"])}</p><h1>{t["demo_hero"]}</h1><p>{esc(t["demo_intro"])}</p></div></section><section class="demo-content">{summary}<div class="demo-workspace"><div class="demo-tabs" role="tablist" aria-label="{"Recorded result layers" if lang == "en" else "记录成果层次"}">{tabs}</div><div class="demo-stage">{raw}{item}{evidence}{md}</div></div><p class="demo-disclaimer">{esc(t["static_warning"])}</p></section>'

def docs_page(lang, prefix, t):
    blocks = []
    clone = f'git clone {SOURCE}.git\ncd delivery-system\npython -m venv .venv\n.\\.venv\\Scripts\\python.exe -m pip --isolated install --no-user --no-cache-dir --index-url https://pypi.org/simple --no-require-hashes -r pylock.toml'
    server = '&lt;repo&gt;\\.venv\\Scripts\\python.exe -B -m mcp_server.server --workspace-root &lt;absolute-workspace-path&gt;'
    for i, (kicker, title, copy) in enumerate(t["doc_sections"]):
        code = ""
        if i == 1:
            code = f'<div class="code-panel"><div class="code-head"><span>PowerShell</span><button type="button" class="copy-code" data-copy-target="clone-code" data-copied-label="{esc(t["code_copied"])}">{esc(t["code_copy"])}</button></div><pre id="clone-code"><code>{esc(clone)}</code></pre><span class="copy-status" data-copy-status></span></div>'
        elif i == 2:
            code = f'<div class="code-panel"><div class="code-head"><span>MCP server · semantic example</span><button type="button" class="copy-code" data-copy-target="mcp-code" data-copied-label="{esc(t["code_copied"])}">{esc(t["code_copy"])}</button></div><pre id="mcp-code"><code>{server}</code></pre><span class="copy-status" data-copy-status></span></div><p class="muted-copy">{"Host config syntax varies; use your Host documentation for command, arguments, and working directory." if lang == "en" else "各 Host 配置格式不同，请按 Host 文档填写命令、参数和工作目录。"}</p>'
        elif i == 3:
            code = f'<p><a class="inline-link" href="{SOURCE}/tree/main/skills/plan-github-work-items" target="_blank" rel="noopener noreferrer">skills/plan-github-work-items ↗</a> {"Load this folder through your Host Skill mechanism. The public main branch may not yet include recent Markdown presentation changes." if lang == "en" else "通过 Host 的 Skill 机制加载此目录。公开 main 可能尚未包含近期 Markdown 展示改动。"}</p>'
        blocks.append(f'<section class="guide-section"><div class="guide-index">{esc(kicker)}</div><h2>{esc(title)}</h2><p>{esc(copy)}</p>{code}</section>')
    filenames = ["getting-started.md", "user-workflow.md", "host-configuration.md", "release-compatibility.md"]
    links = "".join(f'<a href="{SOURCE}/blob/main/docs/{file}" target="_blank" rel="noopener noreferrer">{esc(label)} <span aria-hidden="true">↗</span></a>' for file, label in zip(filenames, t["doc_links"]))
    return f'<section class="subpage-hero"><div class="subpage-grid"></div><div class="subpage-inner"><p class="eyebrow"><span class="eyebrow-mark"></span>{esc(t["docs_kicker"])}</p><h1>{t["docs_hero"]}</h1><p>{esc(t["docs_intro"])}</p></div></section><section class="docs-content"><div class="docs-callout"><b>{"Verified boundary" if lang == "en" else "已验证边界"}</b><p>{esc(t["docs_note"])}</p></div>{"".join(blocks)}<section class="formal-links"><p class="eyebrow">{esc(t["formal_docs"])}</p><div>{links}</div></section></section>'

def architecture_page(lang, prefix, t):
    cards = "".join(f'<article class="arch-step"><span>{esc(k)}</span><h2>{esc(title)}</h2><p>{esc(desc)}</p><small>{esc(status)}</small></article>' for k, title, desc, status in t["arch_steps"])
    rows = "".join(f'<div class="status-row"><strong>{esc(k)}</strong><span>{esc(v)}</span></div>' for k, v in t["status"])
    return f'<section class="subpage-hero"><div class="subpage-grid"></div><div class="subpage-inner"><p class="eyebrow"><span class="eyebrow-mark"></span>{esc(t["arch_kicker"])}</p><h1>{t["arch_hero"]}</h1><p>{esc(t["arch_intro"])}</p></div></section><section class="architecture-content"><div class="architecture-flow">{cards}</div><div class="arch-statement"><span class="mint-dot"></span><p>{"Source capability does not equal integration acceptance, production readiness, or release." if lang == "en" else "源码具备能力不等于通过集成验收、达到生产就绪或正式发布。"}</p></div><section class="status-panel"><p class="eyebrow">{esc(t["status_title"])}</p>{rows}</section><div class="architecture-links"><a class="button button-primary" href="{prefix}{"zh/" if lang == "zh" else ""}docs/">{esc(t["nav"][2])} →</a><a class="button button-quiet" href="{SOURCE}/blob/main/docs/architecture-and-lifecycle.md" target="_blank" rel="noopener noreferrer">{"Full architecture docs" if lang == "en" else "完整架构文档"} ↗</a></div></section>'

def build():
    for lang in ("en", "zh"):
        t = COPY[lang]
        for page, slug in SLUGS.items():
            prefix = "../" if lang == "zh" and page == "home" else "../../" if lang == "zh" else "./" if page == "home" else "../"
            target = ROOT / ("zh" if lang == "zh" else "") / slug / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            body = {"home": home_page, "demo": demo_page, "docs": docs_page, "architecture": architecture_page}[page](lang, prefix, t)
            target.write_text(pageshell(lang, page, prefix, t) + body + footer(lang, prefix, t, page), encoding="utf-8", newline="")
    urls = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for slug in SLUGS.values():
        en, zh = "https://ds.zevsol.com/" + slug, "https://ds.zevsol.com/zh/" + slug
        for current in (en, zh):
            urls.append(f'  <url><loc>{current}</loc><xhtml:link rel="alternate" hreflang="en" href="{en}"/><xhtml:link rel="alternate" hreflang="zh" href="{zh}"/><xhtml:link rel="alternate" hreflang="x-default" href="{en}"/></url>')
    urls.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(urls) + "\n", encoding="utf-8", newline="")

if __name__ == "__main__":
    build()
