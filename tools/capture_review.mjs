import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, '.review-screenshots', 'r5-fix-final');
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
  const networkRequests = [];
  const beaconRequests = [];
  let call;
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') runtimeErrors.push(data.params.exceptionDetails.text || 'Runtime exception');
    if (data.method === 'Network.requestWillBeSent') networkRequests.push(data.params.request.url);
    if (data.method === 'Fetch.requestPaused') {
      beaconRequests.push(data.params.request.url);
      call('Fetch.failRequest', { requestId: data.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    }
    if (data.id && pending.has(data.id)) {
      const entry = pending.get(data.id);
      pending.delete(data.id);
      data.error ? entry.reject(new Error(data.error.message)) : entry.resolve(data.result);
    }
  });
  call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  return { call, evaluate, socket, runtimeErrors, networkRequests, beaconRequests };
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
  info.links.filter(link => { const url = new URL(link); return url.protocol !== 'data:' && url.origin !== 'http://127.0.0.1:' + port; }).forEach(link => externalLinks.add(link));
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
  browser = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-proxy-server', '--host-resolver-rules=MAP ds.zevsol.com 127.0.0.1,MAP zevsol.github.io 127.0.0.1,MAP zevsol.com 127.0.0.1', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  await waitFor('http://127.0.0.1:' + debugPort + '/json/version');
  const targets = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('Chrome did not create a page target');
  const page = await makePage(debugPort, target.id);
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Network.enable');
  await page.call('Fetch.enable', { patterns: [{ urlPattern: '*static.cloudflareinsights.com/beacon.min.js*', requestStage: 'Request' }] });
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
  const actualCounts = await page.evaluate('[...document.querySelectorAll("#demo-case-single .outcome-counts>div strong")].map(x=>Number(x.textContent))');
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
  assert(await page.evaluate('[...document.querySelectorAll("#demo-case-single .outcome-counts>div strong")].map(x=>Number(x.textContent)).join(",") === "6,5,4,3" && document.querySelector("#demo-case-single .outcome-lead strong").textContent.includes("计划中的 GitHub Issue 草稿")'), 'Chinese outcome summary keeps the same sample-derived counts and planned status');
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

  await navigate(page, 'http://127.0.0.1:' + serverPort + '/demo/');
  const r24 = JSON.parse(await readFile(path.join(root, 'assets/r24-multi-work-item.json'), 'utf8'));
  assert(r24.work_items.length === 5 && r24.relationships.length === 9 && r24.work_items.reduce((n, item) => n + item.acceptance_criteria.value.length, 0) === 21, 'R24 fixture contains five Work Items, nine relationships, and 21 acceptance criteria');
  assert(!Object.hasOwn(r24.runtime, 'operation_intents') && r24.execution_history.github_issues_created === 0 && r24.execution_history.source_note.includes('not a field asserted from the Runtime'), 'Runtime fields exclude unsupported operation_intents; zero GitHub Issues is separately sourced from execution history');
  const r3Request = '为一个现有的团队项目管理 Web 应用增加项目内任务管理功能。\n\n团队成员需要能够在项目中创建任务、编辑任务标题和描述、指定负责人、设置截止日期、更新任务状态（待办、进行中、已完成），并按状态筛选任务。\n\n完整交付需要包含数据持久化、服务端 API、前端交互界面和自动化验证。\n\n需要考虑现有项目的身份认证和权限机制，但不得擅自设计一套新的用户账户系统。\n\n技术栈、数据库和现有 API 结构尚未提供，不得虚构这些技术事实。将必要的未知条件明确标记为待确认事项。';
  assert(r24.original_request.text === r3Request, 'Original Chinese request exactly matches the supplied R3 reference');
  const r3Runtime = {preview_id:'preview-f46d7c884c3e45c78cfa5a09a6fc1b8b',revision:1,request_id:'request-b68b3a678c35404a946f15bd846c5414',workspace_identity:'ws_v1_005e85383b31d63192602f34d1ab1e6fd3b723c02f2df1f272cc40cff4685a94',preview_level:'Conceptual',stale:false,write_eligible:false,blockers:[],findings:[],provenance_status:'declared_unverified',repository_identity:null,remote_snapshot:null};
  assert(JSON.stringify(r24.runtime)===JSON.stringify(r3Runtime), 'All evidenced Runtime Preview metadata matches R3; unsupported fields are absent');
  const commonContext = '用户提出为现有团队项目管理 Web 应用增加项目内任务管理；技术栈、数据库和 API 结构未知，需沿用现有身份认证与权限机制。';
  const commonCapability = '待确认现有项目架构、持久化及身份认证/授权能力';
  assert(r24.work_items.every(item=>item.context_problem.value===commonContext&&item.context_problem.declared_source==='user_asserted'&&item.required_capabilities.value.length===1&&item.required_capabilities.value[0]===commonCapability&&item.required_capabilities.declared_source==='model_assumption'&&JSON.stringify(item.write_metadata.value)==='{"assignees":[],"labels":[]}'&&item.write_metadata.declared_source==='model_assumption'), 'All five Work Items preserve R3 common context, required capability, write metadata, and source classifications');
  assert(r24.work_items.every(item=>['role','title','outcome','scope','non_goals','acceptance_criteria','verification'].every(key=>item[key].declared_source==='model_proposed')&&item.context_problem.declared_source==='user_asserted'&&item.required_capabilities.declared_source==='model_assumption'&&item.write_metadata.declared_source==='model_assumption'), 'All Work Item source classifications match the supplied R3 reference');
  assert(r24.work_items.every(item=>Object.entries(item).filter(([key])=>!['client_ref','item_id'].includes(key)).every(([,field])=>field.provenance_status==='declared_unverified')), 'All Work Item fields retain the R3 declared_unverified status');
  const r3Items = [
    {client_ref:'parent',item_id:'item-4de0a4b93b5d420ea2c0fd6c673e76ed',role:'parent',title:'交付项目内任务管理功能',outcome:'团队成员可在项目内管理任务，完整功能通过集成验证并有开发文档，使用既有认证与权限机制。',scope:'统筹数据持久化、服务端 API、前端交互及集成验证/开发文档；所有实现需先确认并适配现有技术栈、数据库、API 与认证权限机制。',non_goals:'不创建新账户系统；不假定或指定未提供的技术栈、数据库、API 结构；不包含项目外任务管理。',acceptance_criteria:['项目成员可创建任务并编辑标题、描述、负责人、截止日期和状态。','任务状态包含待办、进行中、已完成，并可按状态筛选。','任务数据持久化并通过服务端 API 提供。','前端交互接入服务端 API，行为遵循现有身份认证和权限机制。','自动化验证覆盖任务管理关键行为及集成路径，开发文档说明使用方式和验证方法。'],verification:'通过集成自动化验证检查核心任务流程、状态筛选、持久化与权限边界；审阅开发文档是否覆盖配置/使用及验证说明。'},
    {client_ref:'data',item_id:'item-2e4f229d99d4416cb43ae484e7a4f697',role:'child',title:'实现任务领域模型与持久化',outcome:'任务数据可在现有应用数据层持久保存，支持项目归属、标题、描述、负责人、截止日期和三种状态。',scope:'确认现有数据层约定后，定义任务数据结构及创建/读取/更新所需持久化能力。',non_goals:'不选择未确认的数据库或迁移技术；不实现新的用户账户或认证系统；不负责 HTTP API 或前端。',acceptance_criteria:['任务记录可关联到项目，并保存标题、描述、负责人、截止日期及待办/进行中/已完成状态。','持久化层支持创建、读取和更新任务，数据可在应用重启后保留。','数据约束与负责人引用方式符合经确认的现有数据模型和权限机制。'],verification:'针对数据结构及持久化操作运行自动化验证，确认字段映射、项目关联、状态约束与持久性。'},
    {client_ref:'api',item_id:'item-cd94c0ccf0404cd1a9003c90de34e56e',role:'child',title:'实现项目任务管理服务端 API',outcome:'客户端可通过符合现有 API 约定的服务端接口管理项目任务，并受现有认证和权限机制保护。',scope:'依照已确认的 API、认证/授权模式，实现任务创建、读取/更新及状态筛选所需接口；采用任务数据持久化能力。',non_goals:'不设计新账户系统；不虚构 API 风格、路由或认证方案；不实现前端界面。',acceptance_criteria:['接口支持在项目中创建任务并读取任务。','接口支持更新标题、描述、负责人、截止日期和状态。','接口支持按待办、进行中、已完成状态筛选。','接口复用现有身份认证和项目权限检查，未授权请求按现有约定拒绝。','请求与响应遵循确认后的 API 结构，并正确使用任务持久化能力。'],verification:'用服务端自动化验证覆盖有效和无效输入、创建/更新/筛选及授权/未授权访问。'},
    {client_ref:'frontend',item_id:'item-5f6fbd49bd4b41c3bb17d59a1c54bc3e',role:'child',title:'实现项目任务管理前端交互',outcome:'团队成员可在项目界面创建、查看、编辑任务并按状态筛选。',scope:'在现有前端模式中实现任务列表、创建/编辑交互、负责人和截止日期输入、状态更新及筛选；接入任务 API。',non_goals:'不引入未经确认的前端技术或设计系统；不绕过服务端权限控制；不实现服务端 API。',acceptance_criteria:['项目界面展示任务并提供创建任务入口。','用户可编辑任务标题、描述、负责人、截止日期和状态。','状态选择覆盖待办、进行中、已完成，任务列表可按状态筛选。','界面通过确认后的 API 契约读取和提交数据，并呈现成功或失败结果。'],verification:'使用前端自动化验证覆盖任务创建/编辑交互、状态更新、状态筛选与 API 成功/失败反馈。'},
    {client_ref:'integration',item_id:'item-b2e037d387c8405bb85cc81e4d9b56dd',role:'child',title:'验证任务管理集成并编写开发文档',outcome:'项目内任务管理的端到端关键路径可自动化验证，开发者能依据文档理解功能与验证方式。',scope:'集成数据层、API 与前端相关实现；编写功能概览、依赖现有认证/权限的说明及自动化验证运行说明。',non_goals:'不重复拥有各层功能实现；不添加未经确认的技术事实或新的账户设计。',acceptance_criteria:['自动化集成验证覆盖创建任务、修改任务字段/状态、按状态筛选及持久化往返。','验证覆盖现有认证和项目授权机制对任务操作的约束。','开发文档说明任务功能、现有认证/权限集成点以及相关自动化验证的运行方法。','集成验证与文档基于已确认的项目技术和 API 事实，不包含臆造内容。'],verification:'运行集成自动化验证并审阅文档，确认涵盖关键路径、权限行为和验证命令。'}
  ];
  const fixtureSourceItems = r24.work_items.map(item=>({client_ref:item.client_ref,item_id:item.item_id,role:item.role.value,title:item.title.value,outcome:item.outcome.value,scope:item.scope.value,non_goals:item.non_goals.value,acceptance_criteria:item.acceptance_criteria.value,verification:item.verification.value}));
  assert(JSON.stringify(fixtureSourceItems)===JSON.stringify(r3Items), 'Every original Chinese Work Item field, ID, role, acceptance criterion, and Verification exactly matches R3');
  assert(JSON.stringify(r24.work_items.map(x=>x.item_id)) === JSON.stringify(['item-4de0a4b93b5d420ea2c0fd6c673e76ed','item-2e4f229d99d4416cb43ae484e7a4f697','item-cd94c0ccf0404cd1a9003c90de34e56e','item-5f6fbd49bd4b41c3bb17d59a1c54bc3e','item-b2e037d387c8405bb85cc81e4d9b56dd']) && r24.work_items.every(x=>Object.values(x).filter(v=>v&&typeof v==='object'&&'declared_source'in v).every(v=>v.provenance_status==='declared_unverified')), 'Fixture preserves the exact five Runtime item IDs and field-level provenance status');
  const r3Relationships = [
    ['data','parent','planned_parent','任务持久化是完整项目内任务管理交付的一部分；父项拥有整体验收结果。'],
    ['api','parent','planned_parent','服务端任务 API 是完整项目内任务管理交付的一部分；父项拥有整体验收结果。'],
    ['frontend','parent','planned_parent','前端任务交互是完整项目内任务管理交付的一部分；父项拥有整体验收结果。'],
    ['integration','parent','planned_parent','集成验证与开发文档支撑完整功能的可验证交付；父项拥有整体验收结果。'],
    ['api','data','planned_dependency','API 的任务读写验收依赖可用的任务数据持久化能力。'],
    ['frontend','api','planned_dependency','前端完整任务管理流程依赖服务端提供并确认的任务 API 契约。'],
    ['integration','data','planned_dependency','端到端集成验证需依赖任务持久化实现。'],
    ['integration','api','planned_dependency','端到端集成验证需依赖服务端任务 API。'],
    ['integration','frontend','planned_dependency','端到端用户流程验证需依赖前端任务交互。']
  ];
  assert(JSON.stringify(r24.relationships.map(r=>[r.from_client_ref,r.to_client_ref,r.kind,r.rationale.value]))===JSON.stringify(r3Relationships), 'All nine Chinese relationship texts, kinds, and directions exactly match the supplied R3 reference');
  const r3RelationshipTranslations = [
    ['data','parent','Task persistence is part of delivering complete project-level task management; the parent item owns overall acceptance.'],
    ['api','parent','The server-side task API is part of delivering the complete project-level task-management feature; the parent item owns overall acceptance.'],
    ['frontend','parent','The frontend task interactions are part of delivering complete project-level task management; the parent item owns overall acceptance.'],
    ['integration','parent','Integration verification and developer documentation make delivery of the complete feature verifiable; the parent item owns overall acceptance.'],
    ['api','data','API read/write acceptance depends on available task data persistence.'],
    ['frontend','api','The complete frontend task-management flow depends on an available, confirmed task API contract.'],
    ['integration','data','End-to-end integration verification depends on the task persistence implementation.'],
    ['integration','api','End-to-end integration verification depends on the server-side task API.'],
    ['integration','frontend','End-to-end user-flow verification depends on the frontend task interactions.']
  ];
  assert(JSON.stringify(r24.presentation.en.relationships.map(r=>[r.from_client_ref,r.to_client_ref,r.rationale]))===JSON.stringify(r3RelationshipTranslations), 'All nine English relationship rationales are explicitly stored as presentation translations');
  const originalRequest = r24.original_request.text;
  await page.evaluate('document.querySelector("#demo-case-select").focus()');
  await key(page, 'ArrowDown', 'ArrowDown', 40);
  assert(await page.evaluate('document.querySelector("#demo-case-select").value === "multi" && document.querySelector("#demo-case-multi").hidden === false && document.querySelector("#demo-case-single").hidden === true'), 'Keyboard case selector changes the entire Demo to Multi Work Item');
  const enSummary = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .outcome-counts strong")].map(x=>x.textContent).join(",")');
  assert(enSummary === '5,1,4,9,4,5,0', 'Multi case summary shows the exact five-item, relation, and zero-write counts');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .source-request").textContent') === originalRequest, 'English multi case preserves the exact original Chinese request');
  const enTranslationInfo = await page.evaluate('JSON.stringify({label:document.querySelector("#demo-case-multi .translation-badge:last-of-type")?.textContent,translation:document.querySelector("#demo-case-multi .translated-request")?.textContent.slice(0,60)})');
  assert(enTranslationInfo.includes('NOT A SECOND RUNTIME OUTPUT') && enTranslationInfo.includes('Add project-level task management'), 'English request translation is explicit presentation copy, not Runtime input (' + enTranslationInfo + ')');
  const enItemContent = await page.evaluate('JSON.stringify([...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>({ref:x.dataset.workItem,title:x.querySelector(".work-item-title").textContent,body:x.querySelector(".multi-item-content").textContent})))');
  const enItems = JSON.parse(enItemContent);
  assert(enItems.length === 5 && enItems[0].title === 'Deliver project-level task management' && enItems.every(x=>x.body.includes('Verification') && x.body.includes('Acceptance criteria') && x.body.includes('Model proposed')), 'All five English Work Item details include verification, criteria, and field provenance');
  assert(enItems.every((actual,i)=>{const expected=r24.presentation.en.items[i];return actual.ref===r24.work_items[i].client_ref&&actual.title===expected.title&&[expected.context_problem,expected.outcome,expected.scope,expected.non_goals,...expected.acceptance_criteria,expected.verification].every(value=>actual.body.includes(value))}), 'All English Work Item content matches the separate presentation translation dataset');
  const enCriteriaCounts = await page.evaluate('[...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>[...x.querySelectorAll(".multi-detail-field")].find(f=>f.querySelector("h4").textContent.startsWith("Acceptance criteria")).querySelectorAll("li").length).join(",")');
  assert(enCriteriaCounts === '5,3,5,4,4', 'All 21 English acceptance criteria render and remain accessible in expandable details');
  const enVerifications = await page.evaluate('[...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>[...x.querySelectorAll(".multi-detail-field")].find(f=>f.querySelector("h4").textContent.startsWith("Verification")).querySelector("p").textContent).join("|")');
  assert(enVerifications.split('|').length === 5 && enVerifications.split('|').every(Boolean), 'Complete English Verification is present for all five Work Items');
  const enTree = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .work-item-tree li small")].map(x=>x.textContent).join("|")');
  assert(enTree.split('|').length === 4 && enTree.includes('data → parent') && enTree.includes('api → parent') && enTree.includes('frontend → parent') && enTree.includes('integration → parent'), 'Hierarchy presents all four child-to-parent links as readable text');
  const enDeps = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .dependency-list li p")].map(x=>x.textContent).join("|")');
  assert(enDeps.split('|').length === 5 && enDeps.includes('api → data') && enDeps.includes('frontend → api') && enDeps.includes('integration → data') && enDeps.includes('integration → api') && enDeps.includes('integration → frontend'), 'Independent dependency view preserves all five dependent-to-prerequisite directions');
  const enRelationshipText = await page.evaluate('document.querySelector("#demo-case-multi .multi-item-list").textContent + document.querySelector("#demo-case-multi .dependency-list").textContent');
  assert(r24.presentation.en.relationships.every(rel=>enRelationshipText.includes(rel.rationale)), 'All nine English relationship rationales render in the hierarchy or dependency UI');
  assert(r24.relationships.every(rel=>!enRelationshipText.includes(rel.rationale.value)), 'No original Chinese-only relationship rationale remains in the normal English relationship UI');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .work-item-tree").parentElement.querySelector(".multi-section-heading").textContent.includes("presentation translations")'), 'English relationship rationales are identified as translations, not Runtime output');
  const enMarkdownRelations = JSON.parse(await page.evaluate('JSON.stringify([...document.querySelectorAll("#demo-case-multi .multi-markdown-card")].map(card=>({ref:card.dataset.markdownWorkItem,text:card.querySelector("textarea").value})))'));
  assert(r24.presentation.en.relationships.every(rel=>enMarkdownRelations.find(draft=>draft.ref===rel.from_client_ref)?.text.includes(rel.rationale)), 'English Markdown relationship rationale text matches the English UI translations');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .preview-boundary").textContent.includes("not write-eligible") && document.querySelector("#demo-case-multi .preview-boundary").textContent.includes("unverified declarations")'), 'Multi case explains Conceptual and unverified boundaries');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .multi-technical").open === false && document.querySelector("#demo-case-multi .multi-technical").textContent.includes("preview-f46d7c884c3e45c78cfa5a09a6fc1b8b")'), 'Technical R24 evidence is collapsed and contains the exact receipt identity');
  const downloadChecks = await page.evaluate('JSON.stringify([...document.querySelectorAll("#demo-case-multi .multi-markdown-card")].map(card=>{const area=card.querySelector("textarea");const a=card.querySelector("a[download]");return {name:a.download,match:decodeURIComponent(a.href.split(",").slice(1).join(","))===area.value,disclosure:card.textContent.includes("Website-rendered")}}))');
  const enDownloads = JSON.parse(downloadChecks);
  assert(enDownloads.length === 5 && enDownloads.every(x=>x.match && x.disclosure), 'Five English illustrative Markdown drafts have matching downloadable content and derivation labels');
  const secondSummary = await page.evaluate('document.querySelector("#demo-case-multi [data-work-item=data] summary").textContent');
  await page.evaluate('document.querySelector("#demo-case-multi [data-work-item=data] summary").focus()');
  await key(page, 'Enter', 'Enter', 13);
  assert(await page.evaluate('document.querySelector("#demo-case-multi [data-work-item=data]").open'), 'Work Item disclosure opens from the keyboard');
  await key(page, 'Escape', 'Escape', 27);
  assert(await page.evaluate('!document.querySelector("#demo-case-multi [data-work-item=data]").open && document.activeElement.textContent.includes("Implement the task domain model")'), 'Escape closes the expanded Work Item and restores summary focus');
  const enCopyResults = [];
  for (let i=0;i<5;i++) {
    await page.evaluate(`document.querySelectorAll('#demo-case-multi .multi-markdown-card')[${i}].open=true;document.querySelectorAll('#demo-case-multi [data-copy-markdown]')[${i}].focus()`);
    await key(page, 'Enter', 'Enter', 13);
    await new Promise(resolve => setTimeout(resolve, 60));
    enCopyResults.push(await page.evaluate(`navigator.clipboard.readText().then(text=>({text,expected:document.querySelectorAll('#demo-case-multi .markdown-draft-source')[${i}].value,status:document.querySelectorAll('#demo-case-multi [data-draft-copy-status]')[${i}].textContent}))`));
  }
  assert(enCopyResults.every(x=>x.text.replaceAll('\r\n','\n')===x.expected.replaceAll('\r\n','\n')&&x.status==='Draft copied'), 'All five English Markdown copy actions copy their matching draft and announce success');

  await navigate(page, 'http://127.0.0.1:' + serverPort + '/zh/demo/');
  await page.evaluate('document.querySelector("#demo-case-select").focus()');
  await key(page, 'ArrowDown', 'ArrowDown', 40);
  assert(await page.evaluate('document.querySelector("#demo-case-select").value === "multi" && document.querySelector("#demo-case-multi").hidden === false'), 'Chinese keyboard selector activates the same complete Multi Work Item case');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .source-request").textContent') === originalRequest, 'Chinese multi case preserves the exact R24 Runtime request');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .translated-request").textContent.startsWith("Add project-level task management") && document.querySelector("#demo-case-multi .translation-badge:last-of-type").textContent.includes("不是另一份 Runtime 输出")'), 'Chinese page labels the English display translation accurately');
  const zhCounts = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .outcome-counts strong")].map(x=>x.textContent).join(",")');
  assert(zhCounts === '5,1,4,9,4,5,0', 'Chinese multi case reports the exact R24 summary counts');
  const zhCriteriaCounts = await page.evaluate('[...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>[...x.querySelectorAll(".multi-detail-field")].find(f=>f.querySelector("h4").textContent.startsWith("验收条件")).querySelectorAll("li").length).join(",")');
  assert(zhCriteriaCounts === '5,3,5,4,4', 'All 21 original Chinese acceptance criteria render');
  const zhVerifications = await page.evaluate('[...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>[...x.querySelectorAll(".multi-detail-field")].find(f=>f.querySelector("h4").textContent.startsWith("验证说明")).querySelector("p").textContent).join("|")');
  assert(zhVerifications.split('|').length === 5 && zhVerifications.split('|').every(Boolean), 'Complete original Chinese Verification is present for all five Work Items');
  const zhItemContent = JSON.parse(await page.evaluate('JSON.stringify([...document.querySelectorAll("#demo-case-multi [data-work-item]")].map(x=>({ref:x.dataset.workItem,title:x.querySelector(".work-item-title").textContent,body:x.querySelector(".multi-item-content").textContent})))'));
  assert(zhItemContent.every((actual,i)=>{const source=r24.work_items[i];return actual.ref===source.client_ref&&actual.title===source.title.value&&[source.context_problem.value,source.outcome.value,source.scope.value,source.non_goals.value,...source.acceptance_criteria.value,source.verification.value].every(value=>actual.body.includes(value))}), 'All Chinese Work Item fields, acceptance criteria, and verification match recorded Runtime values');
  const zhDeps = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .dependency-list li p")].map(x=>x.textContent).join("|")');
  assert(zhDeps.includes('api → data') && zhDeps.includes('frontend → api') && zhDeps.includes('integration → data') && zhDeps.includes('integration → api') && zhDeps.includes('integration → frontend'), 'Chinese dependency text preserves all exact directions');
  const zhParentLinks = await page.evaluate('[...document.querySelectorAll("#demo-case-multi .work-item-tree li small")].map(x=>x.textContent).join("|")');
  assert(zhParentLinks.includes('data → parent')&&zhParentLinks.includes('api → parent')&&zhParentLinks.includes('frontend → parent')&&zhParentLinks.includes('integration → parent'), 'Chinese hierarchy preserves all four child-to-parent directions');
  const zhRelationText = await page.evaluate('document.querySelector("#demo-case-multi .work-item-tree").textContent+document.querySelector("#demo-case-multi .dependency-list").textContent+ [...document.querySelectorAll("#demo-case-multi .planned-parent-line")].map(x=>x.textContent).join(" ")');
  assert(r24.relationships.every(rel=>zhRelationText.includes(rel.rationale.value)), 'All nine Chinese relationship rationales match the recorded Runtime payload');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .work-item-tree").parentElement.querySelector(".multi-section-heading").textContent.includes("关系理由为中文原文")'), 'Chinese relationship source and English translation disclosure is explicit');
  const zhDownloadsRaw = await page.evaluate('JSON.stringify([...document.querySelectorAll("#demo-case-multi .multi-markdown-card")].map(card=>{const area=card.querySelector("textarea");const a=card.querySelector("a[download]");return {name:a.download,match:decodeURIComponent(a.href.split(",").slice(1).join(","))===area.value,disclosure:card.textContent.includes("网站生成")}}))');
  const zhDownloads = JSON.parse(zhDownloadsRaw);
  assert(zhDownloads.length === 5 && zhDownloads.every(x=>x.match && x.disclosure), 'Five Chinese illustrative Markdown drafts download their exact rendered content with disclosure');
  assert(await page.evaluate('document.querySelector("#demo-case-multi .multi-markdown-list").parentElement.textContent.includes("不是单独的 Runtime Markdown 回执")'), 'Chinese Markdown section carries the full Runtime/GitHub disclosure');
  const zhCopyResults = [];
  for (let i=0;i<5;i++) {
    await page.evaluate(`document.querySelectorAll('#demo-case-multi .multi-markdown-card')[${i}].open=true;document.querySelectorAll('#demo-case-multi [data-copy-markdown]')[${i}].focus()`);
    await key(page, 'Enter', 'Enter', 13);
    await new Promise(resolve => setTimeout(resolve, 60));
    zhCopyResults.push(await page.evaluate(`navigator.clipboard.readText().then(text=>({text,expected:document.querySelectorAll('#demo-case-multi .markdown-draft-source')[${i}].value,status:document.querySelectorAll('#demo-case-multi [data-draft-copy-status]')[${i}].textContent}))`));
  }
  assert(zhCopyResults.every(x=>x.text.replaceAll('\r\n','\n')===x.expected.replaceAll('\r\n','\n')&&x.status==='草稿已复制'), 'All five Chinese Markdown copy actions copy their matching draft and announce success');
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

  for (const [hostname, label] of [['localhost', 'localhost'], ['127.0.0.1', '127.0.0.1'], ['zevsol.github.io', 'GitHub Pages preview host'], ['zevsol.com', 'apex domain']]) {
    page.beaconRequests.length = 0;
    await navigate(page, 'http://' + hostname + ':' + serverPort + '/');
    await new Promise(resolve => setTimeout(resolve, 180));
    assert(await page.evaluate('document.querySelectorAll("script[data-cf-beacon]").length === 0'), 'No Cloudflare Beacon element on ' + label);
    assert(page.beaconRequests.length === 0, 'No Cloudflare Beacon request on ' + label);
  }

  page.beaconRequests.length = 0;
  await navigate(page, 'http://ds.zevsol.com:' + serverPort + '/');
  await new Promise(resolve => setTimeout(resolve, 220));
  const beaconConfig = await page.evaluate('(() => { const script=document.querySelector("script[data-cf-beacon]"); return script && {type:script.type,src:script.src,config:JSON.parse(script.getAttribute("data-cf-beacon")),count:document.querySelectorAll("script[data-cf-beacon]").length,hostname:location.hostname} })()');
  assert(beaconConfig?.hostname === 'ds.zevsol.com' && beaconConfig.count === 1, 'Production hostname injects one Beacon element (' + JSON.stringify({ beaconConfig, href: await page.evaluate('location.href'), readyState: await page.evaluate('document.readyState'), intercepted: page.beaconRequests }) + ')');
  assert(beaconConfig?.type === 'module' && beaconConfig.src === 'https://static.cloudflareinsights.com/beacon.min.js' && beaconConfig.config.token === 'b938977f95e74883bc902ed62de72233', 'Production Beacon has the exact module URL and public site token');
  assert(page.beaconRequests.length === 1 && page.beaconRequests[0] === 'https://static.cloudflareinsights.com/beacon.min.js', 'Production triggers exactly one Beacon request, intercepted before network access');
  await page.evaluate('new Promise(resolve => { const script=document.createElement("script"); script.src="/assets/site.js"; script.onload=resolve; document.body.appendChild(script); })');
  await new Promise(resolve => setTimeout(resolve, 120));
  assert(await page.evaluate('document.querySelectorAll("script[data-cf-beacon]").length === 1') && page.beaconRequests.length === 1, 'Repeated shared runtime execution does not duplicate the Beacon injection');

  for (const [route, widths] of [['/demo/',[1440,768,390]],['/zh/demo/',[1440,768,390]]]) {
    for (const width of widths) {
      await page.call('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await navigate(page, 'http://127.0.0.1:' + serverPort + route);
      await page.evaluate('const s=document.querySelector("#demo-case-select");s.value="multi";s.dispatchEvent(new Event("change",{bubbles:true}))');
      await new Promise(resolve => setTimeout(resolve, 80));
      assert(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Multi case has no horizontal overflow: ' + route + ' at ' + width + 'px');
      assert(await page.evaluate('document.querySelector("#demo-case-multi").hidden === false && document.querySelector("#demo-case-single").hidden === true'), 'Case switch renders one coherent case only: ' + route + ' at ' + width + 'px');
      const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true });
      const lang = route.startsWith('/zh/') ? 'zh' : 'en';
      await writeFile(path.join(shots, `demo-multi-${lang}-${width}.png`), Buffer.from(shot.data, 'base64'));
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
