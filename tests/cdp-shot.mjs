// cdp-shot.mjs — 실시간 헤드리스 Chrome으로 페이지를 열고, 선택자에 맞는 요소(들)를 PNG로 찍는다.
// usage: node tests/cdp-shot.mjs <url> <selector> <out-prefix> [waitMs=6000] [max=3]
// 예:   node tests/cdp-shot.mjs "file:///…/문제집.html?debug=1" '.page:has(.q-num)' /tmp/shot 8000 2
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, selector, prefix, waitMs = '6000', max = '3'] = process.argv.slice(2);
const port = 9700 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', '--window-size=1600,2200', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/booklet-cdp-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws; let id = 0; const pending = new Map();
const call = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(100); } }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { m.error ? pending.get(m.id).rej(new Error(m.error.message)) : pending.get(m.id).res(m.result); pending.delete(m.id); } });
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 2200, deviceScaleFactor: 2, mobile: false });
  await call('Page.navigate', { url });
  await sleep(Number(waitMs));
  // 미리보기 축소(transform)를 풀고, 대상마다 화면에 스크롤해 온 뒤 뷰포트 좌표로 찍는다
  // (#preview가 안쪽 스크롤 상자라 문서 좌표로는 못 잡는다).
  const sel = selector;
  const setup = `(() => {
    const st = document.createElement('style'); st.textContent = '#preview .page{transform:none!important;margin:8px auto!important} #preview{overflow:visible!important;height:auto!important;max-height:none!important} body{overflow:visible!important}'; document.head.appendChild(st);
    // 측정용 화면 밖 사본(.measure-root)은 제외한다 — 같은 문항 번호가 거기에도 있다.
    const els = (${JSON.stringify(sel)}.startsWith('js:') ? (0, eval)(${JSON.stringify(sel)}.slice(3)) : [...document.querySelectorAll(${JSON.stringify(sel)})]).filter((el) => el && !el.closest('.measure-root')).slice(0, ${Number(max)});
    window.__shotEls = els; return els.length;
  })()`;
  const n = (await call('Runtime.evaluate', { expression: setup, returnByValue: true })).result.value || 0;
  if (!n) console.error('[cdp-shot] 선택자에 맞는 요소가 없습니다:', sel);
  for (let i = 0; i < n; i++) {
    // 안쪽 스크롤 상자는 위에서 풀어 두었으므로 문서 좌표(rect + scroll)로 찍는다 — 창을 스크롤한 뒤에도 맞다.
    const r = await call('Runtime.evaluate', { expression: `(() => { const el = window.__shotEls[${i}]; el.scrollIntoView({block:'start'}); const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; })()`, returnByValue: true });
    const c = r.result.value;
    await sleep(150);
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: c.x, y: c.y, width: c.w, height: c.h, scale: 1.5 } });
    const out = `${prefix}-${i + 1}.png`;
    writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log(out, `${Math.round(c.w)}x${Math.round(c.h)} @(${Math.round(c.x)},${Math.round(c.y)})`);
  }
} catch (e) {
  console.error('[cdp-shot] 실패:', e.message);
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
}
