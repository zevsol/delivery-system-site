import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, '.review-screenshots');
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const routes = ['/','/demo/','/docs/','/architecture/','/zh/','/zh/demo/','/zh/docs/','/zh/architecture/'];
const checks = [];
const externalLinks = new Set();
let server, browser;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}
async function freePort() {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}
async function waitFor(url, timeout = 15000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    try { const response = await fetch(url); if (response.ok) return response; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Timed out waiting for ' + url);
}
async function makePage(port, targetId) {
  const socket = new WebSocket('ws://127.0.0.1:' + port + '/devtools/page/' + targetId);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') runtimeErrors.push(data.params.exceptionDetails.text || 'Runtime exception');
    if (data.id && pending.has(data.id)) {
      const entry = pending.get(data.id);
      pending.delete(data.id);
      data.error ? entry.reject(new Error(data.error.message)) : entry.resolve(data.result);
    }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  return { call, evaluate, socket, runtimeErrors };
}
async function key(page, keyName, code, vk) {
  const event = { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: vk };
  if (keyName === 'Enter') { event.text = String.fromCharCode(13); event.unmodifiedText = String.fromCharCode(13); }
  await page.call('Input.dispatchKeyEvent', event);
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk });
}
async function navigate(page, url) {
  await page.call('Page.navigate', { url });
  const targetPath = new URL(url).pathname;
  for (let i = 0; i < 80; i++) {
    const ready = await page.evaluate('document.readyState === "complete" && location.pathname === ' + JSON.stringify(targetPath)).catch(() => false);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await new Promise(resolve => setTimeout(resolve, 140));
}
async function capture(page, port, url, width, height, filename) {
  await page.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 430 });
  await navigate(page, 'http://127.0.0.1:' + port + url);
  const info = await page.evaluate('(() => ({lang:document.documentElement.lang,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canonical:document.querySelector("link[rel=canonical]")?.href,ogUrl:document.querySelector("meta[property=\\\"og:url\\\"]")?.content,alternates:Object.fromEntries([...document.querySelectorAll("link[rel=alternate][hreflang]")].map(a=>[a.hreflang,a.href])),links:[...document.querySelectorAll("a[href]")].map(a=>a.href)}))()');
  assert(info.scrollWidth <= width, 'No horizontal overflow: ' + url + ' at ' + width + 'px (' + info.scrollWidth + 'px)');
  assert(info.canonical === 'https://ds.zevsol.com' + url, 'Canonical route: ' + url);
  assert(info.ogUrl === info.canonical, 'Open Graph URL matches canonical: ' + url);
  const englishPair = 'https://ds.zevsol.com' + (url.startsWith('/zh/') ? url.slice(3) || '/' : url);
  const chinesePair = 'https://ds.zevsol.com' + (url.startsWith('/zh/') ? url : '/zh' + (url === '/' ? '/' : url));
  assert(info.alternates.en === englishPair && info.alternates.zh === chinesePair && info.alternates['x-default'] === englishPair, 'hreflang alternates match route pair: ' + url);
  assert(info.lang === (url.startsWith('/zh/') ? 'zh' : 'en'), 'Document language: ' + url);
  const paired = url.startsWith('/zh/') ? (url.slice(3) || '/') : '/zh' + (url === '/' ? '/' : url);
  assert(info.links.some(link => new URL(link).pathname === paired), 'Language switch preserves page: ' + url);
  const audit = await page.evaluate('(async () => { const urls=[...new Set([...document.querySelectorAll("a[href]")].map(a=>a.href).filter(h=>new URL(h).origin===location.origin))]; const broken=[]; for(const u of urls){const x=new URL(u); if(x.hash && x.pathname===location.pathname && !document.getElementById(decodeURIComponent(x.hash.slice(1)))) broken.push(u); if(!(await fetch(x.pathname).then(r=>r.ok).catch(()=>false))) broken.push(u)} return broken })()');
  assert(audit.length === 0, 'Internal links and page anchors resolve: ' + url + (audit.length ? ' (' + audit.join(',') + ')' : ''));
  info.links.filter(link => new URL(link).origin !== 'http://127.0.0.1:' + port).forEach(link => externalLinks.add(link));
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
  await writeFile(path.join(shots, filename), Buffer.from(shot.data, 'base64'));
  return info;
}

try {
  await mkdir(shots, { recursive: true });
  const serverPort = await freePort();
  server = spawn('python', ['-m', 'http.server', String(serverPort), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await waitFor('http://127.0.0.1:' + serverPort + '/');
  const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
  assert((sitemap.match(/<url>/g) || []).length === 8 && (sitemap.match(/hreflang="x-default"/g) || []).length === 8, 'Sitemap includes all eight routes and language alternates');
  assert((await readFile(path.join(root, 'CNAME'), 'utf8')).trim() === 'ds.zevsol.com', 'Custom domain CNAME remains ds.zevsol.com');

  const debugPort = await freePort();
  const profile = await mkdtemp(path.join(os.tmpdir(), 'delivery-site-chrome-'));
  browser = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  await waitFor('http://127.0.0.1:' + debugPort + '/json/version');
  const targets = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('Chrome did not create a page target');
  const page = await makePage(debugPort, target.id);
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Browser.grantPermissions', { origin: 'http://127.0.0.1:' + serverPort, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] }).catch(() => {});

  const sizes = [[1440,1000],[768,1024],[390,844]];
  const reports = [];
  for (const route of routes) {
    for (const [width,height] of sizes) {
      let name = 'viewport-' + route.replaceAll('/','_') + width + '.png';
      if (route === '/' && width === 1440) name = 'home-en-1440.png';
      if (route === '/' && width === 768) name = 'home-en-768.png';
      if (route === '/' && width === 390) name = 'home-en-390.png';
      if (route === '/demo/' && width === 1440) name = 'demo-en-1440.png';
      if (route === '/demo/' && width === 390) name = 'demo-en-390.png';
      if (route === '/zh/' && width === 1440) name = 'home-zh-1440.png';
      if (route === '/zh/' && width === 390) name = 'home-zh-390.png';
      if (route === '/zh/demo/' && width === 1440) name = 'demo-zh-1440.png';
      if (route === '/zh/demo/' && width === 390) name = 'demo-zh-390.png';
      const info = await capture(page, serverPort, route, width, height, name);
      reports.push({ route, width, height, title: info.title, documentWidth: info.scrollWidth });
    }
  }

  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[2].click()');
  await new Promise(resolve => setTimeout(resolve, 900));
  assert(await page.evaluate('document.querySelector("[data-panel-title]").textContent') === 'A draft you control', 'Story click updates panel title');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("EXCERPT")'), 'Story click updates panel content');
  const progressWidth = await page.evaluate('document.querySelector("[data-story-progress]").style.width');
  const stepDebug = await page.evaluate('JSON.stringify({title:document.querySelector("[data-panel-title]").textContent,y:scrollY,step:[...document.querySelectorAll("[data-story-section]")].map(x=>({top:x.getBoundingClientRect().top,height:x.getBoundingClientRect().height}))})');
  assert(progressWidth === '100%', 'Story click updates progress (' + progressWidth + '; ' + stepDebug + ')');
  await new Promise(resolve => setTimeout(resolve, 400));
  assert(await page.evaluate('document.querySelector("[data-story-panel]").dataset.activeStep') === '3', 'Scroll observer preserves the clicked phase after smooth scrolling');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[1].click()');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").querySelectorAll("details").length === 4 && document.querySelector("[data-panel-content] h4").textContent === "Build a responsive personal portfolio website"'), 'Preview panel shows the recorded Work Item and four source sections');
  await page.evaluate('document.querySelector("[data-panel-content] details summary").focus()');
  await key(page, 'Enter', 'Enter', 13);
  assert(await page.evaluate('document.querySelector("[data-panel-content] details").open && document.querySelector("[data-panel-content] details li").textContent === "Show a personal introduction."'), 'Work Item scope disclosures are keyboard accessible and source-backed');
  await page.evaluate('document.querySelector("[data-story-step]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 900));
  assert(await page.evaluate('document.querySelector("[data-panel-title]").textContent') === 'A clear request', 'Keyboard Enter activates a story phase');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[2].click()');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("The page includes an introduction, project showcase, and contact information.")'), 'English story shows the translated source Markdown excerpt');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("EXCERPT") && new URL(document.querySelector("[data-panel-content] a").href).pathname === "/demo/"'), 'English excerpt is labelled and links to the full Demo');
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/zh/');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[2].click()');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("页面包含个人介绍、项目展示和联系方式。")'), 'Chinese story shows the original source Markdown excerpt');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("节选") && new URL(document.querySelector("[data-panel-content] a").href).pathname === "/zh/demo/"'), 'Chinese excerpt is labelled and links to the full Demo');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[1].click()');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("验收条件") && document.querySelector("[data-panel-content]").textContent.includes("页面包含个人介绍、项目展示和联系方式。")'), 'Chinese Preview uses the source Chinese acceptance criteria');

  await navigate(page, 'http://127.0.0.1:' + serverPort + '/demo/');
  assert((await page.evaluate('document.querySelector("#demo-panel-1 blockquote").textContent')) === 'I want to build a personal portfolio website that supports desktop and mobile, with an introduction, project showcase, and contact information. The website should be mostly static, with no login, payments, or admin panel. It should provide basic keyboard accessibility and clear project links.', 'English Demo shows the faithful translated request');
  assert(await page.evaluate('document.querySelector("#demo-panel-1 .translation-badge").textContent.includes("TRANSLATION")'), 'English original-request panel is labelled as translation');
  assert(await page.evaluate('document.querySelectorAll("[data-demo-tab]").length === 4 && [...document.querySelectorAll("[data-demo-panel]")].filter(x=>!x.hidden).length === 1'), 'Demo exposes four accessible reading layers with one active panel');
  const sampleEn = await readFile(path.join(root, 'assets/sample-issue.en.md'), 'utf8');
  const sampleZh = await readFile(path.join(root, 'assets/sample-issue.md'), 'utf8');
  const sectionCount = (source, heading) => {
    const start = source.indexOf('## ' + heading + '\n');
    if (start < 0) throw new Error('Missing sample section ' + heading);
    const rest = source.slice(start).split('\n').slice(1);
    return rest.slice(0, rest.findIndex(line => line.startsWith('## ')) < 0 ? rest.length : rest.findIndex(line => line.startsWith('## '))).filter(line => line.startsWith('- ')).length;
  };
  const expectedCounts = ['Scope','Acceptance Criteria','Verification','Non-goals'].map(name => sectionCount(sampleEn, name));
  assert(JSON.stringify(expectedCounts) === JSON.stringify([6,5,4,3]), 'Markdown source sample has the expected section counts: ' + expectedCounts.join('/'));
  const actualCounts = await page.evaluate('[...document.querySelectorAll(".outcome-counts>div strong")].map(x=>Number(x.textContent))');
  assert(JSON.stringify(actualCounts) === JSON.stringify(expectedCounts), 'Result summary counts are parsed from the real English Markdown sample');
  assert((await page.evaluate('document.querySelector(".outcome-lead strong").textContent')) === 'One planned GitHub Issue draft', 'Outcome summary describes a planned draft, not a created Issue');
  assert(await page.evaluate('document.querySelector("#demo-panel-1 blockquote").textContent.includes("I want to build a personal portfolio") && document.querySelector("#demo-panel-1 .translation-badge").textContent.includes("TRANSLATION")'), 'English original request remains clearly marked as a translation');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[0].focus()');
  await key(page, 'ArrowRight', 'ArrowRight', 39);
  assert(await page.evaluate('document.querySelectorAll("[data-demo-tab]")[1].getAttribute("aria-selected")') === 'true', 'Demo tabs support arrow-key navigation');
  assert(await page.evaluate('document.querySelector("#demo-panel-2 .planned-item h3").textContent === "Build a responsive personal portfolio website" && document.querySelector("#demo-panel-2 .item-fields").children.length === 4'), 'Planned Work Item shows actual title and all four structured fields');
  assert(await page.evaluate('document.querySelector("#demo-panel-2").textContent.includes("create_issue") && document.querySelector("#demo-panel-2").textContent.includes("not a remote Issue")'), 'Work Item and create_issue intent are distinguished from a remote Issue');
  assert(await page.evaluate('document.querySelector("#demo-panel-2 .relation-note").textContent.includes("no planned relationship") && document.querySelector("#demo-panel-2 .relation-note").textContent.includes("add_sub_issue") && document.querySelector("#demo-panel-2 .relation-note").textContent.includes("child → parent") && document.querySelector("#demo-panel-2 .relation-note").textContent.includes("add_dependency") && document.querySelector("#demo-panel-2 .relation-note").textContent.includes("dependent → prerequisite")'), 'Current independent case is separated from supported Parent/Sub-Issue and Dependency semantics');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[2].click()');
  assert(await page.evaluate('[...document.querySelectorAll(".level-node")].map(n=>n.querySelector("strong").textContent).join(",") === "Conceptual,RepositoryAware,WriteEligible" && document.querySelector(".level-node.is-current").querySelector("strong").textContent === "Conceptual"'), 'Preview contract rail lists all three levels and highlights only the real Conceptual result');
  await page.evaluate('document.querySelectorAll(".level-node")[2].querySelector("summary").click()');
  assert(await page.evaluate('document.querySelectorAll(".level-node")[2].open && document.querySelector(".level-node.is-current").querySelector("strong").textContent === "Conceptual" && document.querySelector(".evidence-status").textContent.includes("Conceptual")'), 'Opening WriteEligible explanation never upgrades or changes the historical receipt');
  assert(await page.evaluate('document.querySelectorAll(".level-node")[2].textContent.includes("Remote queries are complete") && document.querySelectorAll(".level-node")[2].textContent.includes("Audit, Human Approval, and Authority") && document.querySelectorAll(".level-node")[1].textContent.includes("relevant remote evidence")'), 'RepositoryAware and WriteEligible explanations preserve the source contract and separate approval requirements');
  await key(page, 'Escape', 'Escape', 27);
  assert(await page.evaluate('!document.querySelectorAll(".level-node")[2].open && document.querySelector(".level-node.is-current").querySelector("strong").textContent === "Conceptual"'), 'Escape closes the level explanation without changing the current level');
  await page.evaluate('document.querySelector(".technical-details summary").click()');
  assert(await page.evaluate('document.querySelector(".technical-details").open && document.querySelector(".technical-grid").textContent.includes("request-ea987c77b7924a2794d85d198f95dcd5") && document.querySelector(".technical-grid").textContent.includes("declared_unverified") && document.querySelector(".technical-grid").textContent.includes("null means this Preview was not bound to a target repository") && document.querySelector(".technical-grid").textContent.includes("does not rule out Audit")'), 'English technical details show the exact Request ID and explain null, false, and provenance semantics');
  await page.evaluate('document.querySelector(".copy-id").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 180));
  const copiedTechId = await page.evaluate('navigator.clipboard.readText().catch(e => "ERR:" + e.name)');
  const copyStatus = await page.evaluate('document.querySelector("[data-tech-copy-status]").textContent');
  assert(copiedTechId === 'preview-5e03cf0f4e7c4e978d1ff62b1405ebf8' && copyStatus === 'Copied', 'Technical Preview ID copy writes the exact identifier and announces success (' + copiedTechId + '; ' + copyStatus + ')');
  await page.evaluate('document.querySelectorAll(".copy-id")[1].focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 140));
  const requestCopy = await page.evaluate('navigator.clipboard.readText().catch(e => "ERR:" + e.name)');
  const requestCopyStatus = await page.evaluate('document.querySelector("[data-tech-copy-status]").textContent');
  assert(requestCopy === 'request-ea987c77b7924a2794d85d198f95dcd5' && requestCopyStatus === 'Copied', 'Request ID is also keyboard-copyable with an accessible status message (' + requestCopy + '; ' + requestCopyStatus + ')');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[3].click()');
  const exactSectionChecks = await page.evaluate('(async () => { const [en,zh]=await Promise.all([fetch("/assets/sample-issue.en.md").then(r=>r.text()),fetch("/assets/sample-issue.md").then(r=>r.text())]); return document.querySelector("[data-load-markdown]").dataset.loadMarkdown.endsWith("sample-issue.en.md") && en.includes("## Acceptance Criteria") && zh.includes("## Acceptance Criteria") })()');
  assert(exactSectionChecks, 'Issue Markdown panel targets the two existing language samples');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert(await page.evaluate('document.querySelector("[data-load-markdown]").textContent.includes("# Build a responsive personal portfolio website")'), 'English Demo loads translated Markdown');
  assert(await page.evaluate('document.querySelector("#demo-panel-4 .translation-badge").textContent.includes("NOT A SECOND RUNTIME RECEIPT")'), 'English translation is clearly labelled');
  await page.evaluate('document.querySelector("[data-copy-url]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 250));
  assert((await page.evaluate('navigator.clipboard.readText()')).startsWith('# Build a responsive personal portfolio'), 'Copy Markdown writes translated text');
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/zh/demo/');
  assert((await page.evaluate('document.querySelector("#demo-panel-1 blockquote").textContent')) === '我要开发一个个人作品集网站，支持桌面和移动端，包含个人介绍、项目展示和联系方式。网站以静态内容为主，不需要登录、支付或后台管理。要求基本键盘可访问性和清晰的项目链接。', 'Chinese Demo shows the exact original request');
  assert(await page.evaluate('[...document.querySelectorAll(".outcome-counts>div strong")].map(x=>Number(x.textContent)).join(",") === "6,5,4,3" && document.querySelector(".outcome-lead strong").textContent.includes("计划中的 GitHub Issue 草稿")'), 'Chinese outcome summary keeps the same sample-derived counts and planned status');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[1].click()');
  assert(await page.evaluate('document.querySelector("#demo-panel-2 .planned-item h3").textContent === "开发响应式个人作品集网站" && document.querySelector("#demo-panel-2 .item-fields").textContent.includes("验收条件")'), 'Chinese Planned Work Item presents its source-language title and sections');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[2].click()');
  assert(await page.evaluate('document.querySelector(".level-node.is-current").querySelector("strong").textContent === "Conceptual" && document.querySelector(".evidence-status").textContent.includes("未发生")'), 'Chinese evidence states remain aligned with the unchanged receipt');
  await page.evaluate('document.querySelector(".technical-details summary").click()');
  assert(await page.evaluate('document.querySelector(".technical-grid").textContent.includes("request-ea987c77b7924a2794d85d198f95dcd5") && document.querySelector(".technical-grid").textContent.includes("Repository Identitynull") && document.querySelector(".technical-grid").textContent.includes("未绑定目标仓库") && document.querySelector(".technical-grid").textContent.includes("未经外部验证") && document.querySelector(".technical-grid").textContent.includes("绝对不能进行 Audit")'), 'Chinese technical evidence gives the same exact identifiers and null, false, and provenance meaning');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[3].click()');
  await new Promise(resolve => setTimeout(resolve, 150));
  assert(await page.evaluate('document.querySelector("[data-load-markdown]").textContent.includes("# 开发响应式个人作品集网站")'), 'Chinese Demo loads original Markdown');
  await page.evaluate('document.querySelector("[data-copy-url]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert((await page.evaluate('navigator.clipboard.readText()')).startsWith('# 开发响应式个人作品集网站'), 'Chinese Copy Markdown preserves the original sample');
  const zhDownload = await page.evaluate('(async () => { const a=document.querySelector("a[download]"); return {name:a.download,ok:await fetch(a.href).then(r=>r.ok)} })()');
  assert(zhDownload.ok && zhDownload.name === 'delivery-system-issue-draft.md', 'Chinese original Markdown download remains available');
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert(await page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'), 'Reduced-motion preference is honored');
  assert(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior === "auto"'), 'Reduced-motion disables smooth document scrolling');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/');
  await page.evaluate('document.querySelector(".menu-toggle").focus()');
  await key(page, 'Enter', 'Enter', 13);
  assert(await page.evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")') === 'true', 'Mobile navigation opens from the keyboard');
  assert(await page.evaluate('document.querySelector(".site-nav").classList.contains("is-open")'), 'Mobile menu exposes its links when open');
  await key(page, 'Escape', 'Escape', 27);
  assert((await page.evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")')) === 'false', 'Escape closes the mobile menu and updates aria-expanded');
  assert(!(await page.evaluate('document.querySelector(".site-nav").classList.contains("is-open")')), 'Escape hides mobile navigation links');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[2].click()');
  await new Promise(resolve => setTimeout(resolve, 600));
  assert(await page.evaluate('document.querySelector("[data-story-panel]").dataset.activeStep === "3" && document.querySelector("[data-story-panel]").getBoundingClientRect().top < innerHeight'), 'Mobile phase selection scrolls the updated product panel into view');
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/docs/');
  await page.evaluate('document.querySelector("[data-copy-target]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 200));
  const docsCopy = await page.evaluate('navigator.clipboard.readText().then(t => t.startsWith("git clone https://github.com/zevsol/delivery-system.git")).catch(() => false)');
  const docsCopyStatus = await page.evaluate('document.querySelector(".code-panel [data-copy-status]")?.textContent');
  assert(docsCopy, 'Docs code-copy button copies the setup commands (' + docsCopyStatus + ')');
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/demo/');
  const download = await page.evaluate('(async () => { const a=document.querySelector("a[download]"); return {name:a.download,ok:await fetch(a.href).then(r=>r.ok)} })()');
  assert(download.ok && download.name === 'delivery-system-issue-draft.en.md', 'Markdown download target exists with its expected filename');

  for (const [route, widths] of [['/demo/',[1440,390]],['/zh/demo/',[1440,390]]]) {
    for (const width of widths) {
      await page.call('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await navigate(page, 'http://127.0.0.1:' + serverPort + route);
      await page.evaluate('document.querySelectorAll("[data-demo-tab]")[2].click()');
      await new Promise(resolve => setTimeout(resolve, 80));
      const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
      const lang = route.startsWith('/zh/') ? 'zh' : 'en';
      await writeFile(path.join(shots, `demo-${lang}-evidence-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
  }

  assert(page.runtimeErrors.length === 0, 'No JavaScript runtime exceptions (' + page.runtimeErrors.join('; ') + ')');

  const externalResults = [];
  for (const href of externalLinks) {
    try {
      const response = await fetch(href, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(6000) });
      externalResults.push({ href, status: response.status });
      assert(response.ok, 'External link resolves: ' + href);
    } catch (error) {
      const parsed = new URL(href);
      externalResults.push({ href, status: 'unreachable', error: error.cause?.code || error.name });
      assert(parsed.protocol === 'https:' && ['github.com'].includes(parsed.hostname), 'External URL remains an HTTPS GitHub link; live check unavailable: ' + href);
    }
  }

  await writeFile(path.join(shots, 'browser-report.json'), JSON.stringify({ viewports: reports, checks, externalLinks: externalResults }, null, 2));
  console.log(JSON.stringify({ screenshots: shots, viewportChecks: reports.length, totalChecks: checks.length, externalLinks: externalResults }, null, 2));
  page.socket.close();
} finally {
  if (server) server.kill();
  if (browser) browser.kill();
}
