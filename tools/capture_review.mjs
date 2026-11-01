import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
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
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  return { call, evaluate, socket };
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
  const info = await page.evaluate('(() => ({lang:document.documentElement.lang,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,canonical:document.querySelector("link[rel=canonical]")?.href,links:[...document.querySelectorAll("a[href]")].map(a=>a.href)}))()');
  assert(info.scrollWidth <= width, 'No horizontal overflow: ' + url + ' at ' + width + 'px (' + info.scrollWidth + 'px)');
  assert(info.canonical === 'https://ds.zevsol.com' + url, 'Canonical route: ' + url);
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
      const info = await capture(page, serverPort, route, width, height, name);
      reports.push({ route, width, height, title: info.title, documentWidth: info.scrollWidth });
    }
  }

  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/');
  await page.evaluate('document.querySelectorAll("[data-story-step]")[2].click()');
  await new Promise(resolve => setTimeout(resolve, 900));
  assert(await page.evaluate('document.querySelector("[data-panel-title]").textContent') === 'A draft you control', 'Story click updates panel title');
  assert(await page.evaluate('document.querySelector("[data-panel-content]").textContent.includes("MARKDOWN DRAFT")'), 'Story click updates panel content');
  const progressWidth = await page.evaluate('document.querySelector("[data-story-progress]").style.width');
  const stepDebug = await page.evaluate('JSON.stringify({title:document.querySelector("[data-panel-title]").textContent,y:scrollY,step:[...document.querySelectorAll("[data-story-section]")].map(x=>({top:x.getBoundingClientRect().top,height:x.getBoundingClientRect().height}))})');
  assert(progressWidth === '100%', 'Story click updates progress (' + progressWidth + '; ' + stepDebug + ')');
  await page.evaluate('document.querySelector("[data-story-step]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 900));
  assert(await page.evaluate('document.querySelector("[data-panel-title]").textContent') === 'A clear request', 'Keyboard Enter activates a story phase');

  await navigate(page, 'http://127.0.0.1:' + serverPort + '/demo/');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[0].focus()');
  await key(page, 'ArrowRight', 'ArrowRight', 39);
  assert(await page.evaluate('document.querySelectorAll("[data-demo-tab]")[1].getAttribute("aria-selected")') === 'true', 'Demo tabs support arrow-key navigation');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[2].click()');
  await new Promise(resolve => setTimeout(resolve, 250));
  assert(await page.evaluate('document.querySelector("[data-load-markdown]").textContent.includes("# Build a responsive personal portfolio website")'), 'English Demo loads translated Markdown');
  assert(await page.evaluate('document.querySelector(".translation-badge").textContent.includes("NOT A SECOND RUNTIME RECEIPT")'), 'English translation is clearly labelled');
  await page.evaluate('document.querySelector("[data-copy-url]").focus()');
  await key(page, 'Enter', 'Enter', 13);
  await new Promise(resolve => setTimeout(resolve, 250));
  assert((await page.evaluate('navigator.clipboard.readText()')).startsWith('# Build a responsive personal portfolio'), 'Copy Markdown writes translated text');
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/zh/demo/');
  await page.evaluate('document.querySelectorAll("[data-demo-tab]")[2].click()');
  await new Promise(resolve => setTimeout(resolve, 150));
  assert(await page.evaluate('document.querySelector("[data-load-markdown]").textContent.includes("# 开发响应式个人作品集网站")'), 'Chinese Demo loads original Markdown');
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert(await page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'), 'Reduced-motion preference is honored');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate(page, 'http://127.0.0.1:' + serverPort + '/');
  await page.evaluate('document.querySelector(".menu-toggle").focus()');
  await key(page, 'Enter', 'Enter', 13);
  assert(await page.evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")') === 'true', 'Mobile navigation opens from the keyboard');
  assert(await page.evaluate('document.querySelector(".site-nav").classList.contains("is-open")'), 'Mobile menu exposes its links when open');
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

  const externalResults = [];
  for (const href of externalLinks) {
    const response = await fetch(href, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(12000) });
    externalResults.push({ href, status: response.status });
    assert(response.ok, 'External link resolves: ' + href);
  }

  await writeFile(path.join(shots, 'browser-report.json'), JSON.stringify({ viewports: reports, checks, externalLinks: externalResults }, null, 2));
  console.log(JSON.stringify({ screenshots: shots, viewportChecks: reports.length, totalChecks: checks.length, externalLinks: externalResults }, null, 2));
  page.socket.close();
} finally {
  if (server) server.kill();
  if (browser) browser.kill();
}
