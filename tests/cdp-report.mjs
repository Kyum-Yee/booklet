// cdp-report.mjs — 헤드리스 Chrome을 실시간으로 띄워 #report가 채워질 때까지 기다린 뒤 내용을 출력한다.
// usage: node tests/cdp-report.mjs <url> [timeoutMs=60000]
// (--virtual-time-budget는 파일 I/O 대기를 왜곡하므로 파일 읽기·업로드 경로 검증에는 이것을 쓴다)
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url = process.argv[2];
const timeout = Number(process.argv[3] || 60000);
const port = 9200 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${port}`, '--user-data-dir=/tmp/booklet-cdp-' + port, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(path) { const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'PUT' }); return r.json(); }
let ws; let id = 0; const pending = new Map();
function call(method, params = {}) {
  return new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
}
try {
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(100); } }
  // /json/new?<url>은 URL 안의 &를 제 인자로 잘라 먹는다 — 빈 탭을 열고 Page.navigate로 온전한 URL을 넘긴다.
  const target = await json('/json/new?about:blank');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); } });
  await call('Runtime.enable');
  await call('Page.navigate', { url });
  const t0 = Date.now();
  let text = '';
  while (Date.now() - t0 < timeout) {
    const r = await call('Runtime.evaluate', { expression: '(document.getElementById("report")||{}).textContent||""', returnByValue: true });
    text = (r && r.result && r.result.value) || '';
    if (text && !text.includes('"state":"loading"') && text !== 'loading') break;
    await sleep(250);
  }
  process.stdout.write(text + '\n');
  process.stderr.write(`[cdp-report] ${Date.now() - t0}ms\n`);
} catch (e) {
  console.error('[cdp-report] 실패:', e.message);
} finally {
  try { ws && ws.close(); } catch {}
  chrome.kill();
}
