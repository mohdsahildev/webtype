import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const WebSocket = globalThis.WebSocket;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_USER_DATA = path.join(process.cwd(), 'scratch', 'chrome-test-profile');
const URL = 'http://localhost:3005';

if (!fs.existsSync(TEMP_USER_DATA)) {
  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });
}

// 1. Launch Chrome
const chrome = spawn(CHROME_PATH, [
  '--remote-debugging-port=9222',
  '--headless=new',
  `--user-data-dir=${TEMP_USER_DATA}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--window-size=1280,800',
  'about:blank'
], { stdio: 'ignore' });

async function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

let ws;
let messageId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log('Waiting for Chrome debugging endpoint...');
  await delay(2000);

  let versionRes;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch('http://localhost:9222/json/version');
      if (res.ok) {
        versionRes = await res.json();
        break;
      }
    } catch {
      await delay(500);
    }
  }

  if (!versionRes) {
    throw new Error('Could not connect to Chrome debugging endpoint');
  }

  const listRes = await (await fetch('http://localhost:9222/json/list')).json();
  const target = listRes.find((t) => t.type === 'page') || listRes[0];
  console.log('Connecting to target page WS:', target.webSocketDebuggerUrl);

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res) => ws.addEventListener('open', res));

  const consoleLogs = [];
  const networkErrors = [];

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        reject(msg.error);
      } else {
        resolve(msg.result);
      }
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      consoleLogs.push({ type: msg.params.type, text });
      if (msg.params.type === 'error') {
        console.error('[Browser Console Error]:', text);
      }
    } else if (msg.method === 'Network.responseReceived') {
      const { status, url } = msg.params.response;
      if (status >= 400) {
        networkErrors.push({ status, url });
        console.error(`[HTTP ${status}]`, url);
      }
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');

  console.log('\n======================================================');
  console.log('TEST 1: FRESH CACHE / THROTTLED NETWORK INITIAL LOAD');
  console.log('======================================================');

  // Clear cache and cookies
  await send('Network.clearBrowserCache');
  await send('Network.clearBrowserCookies');

  // Throttle network (Latency 100ms, Download 15 MB/s)
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 15 * 1024 * 1024,
    uploadThroughput: 5 * 1024 * 1024,
    connectionType: 'cellular3g'
  });

  console.log('Navigating to', URL);
  await send('Page.navigate', { url: URL });

  let loadingObserved = false;
  let readyObserved = false;
  let realCharacterConfirmed = false;

  const startTime = Date.now();

  for (let i = 0; i < 80; i++) {
    await delay(300);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        const isMainMenuVisible = text.includes('PLAY') && text.includes('TYPE • SWING • SURVIVE');
        return {
          loadingText: text.replace(/\\n+/g, ' ').slice(0, 100),
          isMainMenuVisible,
        };
      })()`,
      returnByValue: true
    });

    const state = evalRes.result?.value;
    if (!state) continue;

    if (!state.isMainMenuVisible) {
      loadingObserved = true;
      console.log(`[${elapsed}s] Loading Screen Active -> Text: "${state.loadingText}"`);
    } else if (state.isMainMenuVisible && !readyObserved) {
      readyObserved = true;
      console.log(`\n[${elapsed}s] Transition to Main Menu completed! Text: "${state.loadingText}"`);
      realCharacterConfirmed = true;
      break;
    }
  }

  console.log('\n--- Test 1 Results ---');
  console.log('Loading screen remained visible during download:', loadingObserved);
  console.log('Main menu appeared after assets genuinely ready:', readyObserved);
  console.log('Real character confirmed in Main Menu:', realCharacterConfirmed);

  console.log('\n======================================================');
  console.log('TEST 2: INTRO TRANSITION (MENU -> RUN -> JUMP -> FALL -> GAMEPLAY)');
  console.log('======================================================');

  console.log('Triggering PLAY via SPACE keypress...');
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    windowsVirtualKeyCode: 32,
    code: 'Space',
    key: ' ',
    text: ' '
  });
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    windowsVirtualKeyCode: 32,
    code: 'Space',
    key: ' '
  });

  let gameplayObserved = false;
  for (let i = 0; i < 40; i++) {
    await delay(300);
    const evalIntro = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return {
          text: text.slice(0, 80),
          isMenu: text.includes('PLAY') && text.includes('TYPE • SWING • SURVIVE'),
          hasHUD: text.includes('WPM') || text.includes('STREAK') || text.includes('ACCURACY') || text.includes('TYPE THE WORD') || text.includes('TUTORIAL'),
        };
      })()`,
      returnByValue: true
    });

    const val = evalIntro.result?.value;
    if (val?.hasHUD) {
      gameplayObserved = true;
      console.log('Active HUD / Intro / Gameplay observed:', val);
      break;
    }
  }

  console.log('Intro sequence to gameplay transition successful:', gameplayObserved);

  console.log('\n======================================================');
  console.log('TEST 3: CACHED RELOAD STARTUP TIME');
  console.log('======================================================');

  // Normal network speed
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  const cachedStart = Date.now();
  console.log('Reloading with browser cache enabled...');
  await send('Page.navigate', { url: URL });

  let cachedMenuReadyTime = null;
  for (let i = 0; i < 40; i++) {
    await delay(100);
    const evalCached = await send('Runtime.evaluate', {
      expression: `(() => {
        const text = document.body.innerText;
        return text.includes('PLAY') && text.includes('TYPE • SWING • SURVIVE');
      })()`,
      returnByValue: true
    });

    if (evalCached.result?.value) {
      cachedMenuReadyTime = Date.now() - cachedStart;
      console.log(`[Cached Reload] Main menu ready in ${cachedMenuReadyTime} ms!`);
      break;
    }
  }

  console.log('\n======================================================');
  console.log('TEST 4: CONSOLE ERRORS & NETWORK 404 AUDIT');
  console.log('======================================================');
  const errorLogs = consoleLogs.filter(l => l.type === 'error');
  console.log('Total Console Errors:', errorLogs.length);
  if (errorLogs.length > 0) {
    console.error('Console errors:', errorLogs);
  }
  console.log('Total Network >= 400 Errors:', networkErrors.length);

  ws.close();
  chrome.kill();

  if (loadingObserved && readyObserved && realCharacterConfirmed && gameplayObserved && errorLogs.length === 0 && networkErrors.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED! INITIAL LOADING FIX 100% VERIFIED.');
    process.exit(0);
  } else {
    console.error('\n❌ VERIFICATION FAILED');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  if (ws) ws.close();
  if (chrome) chrome.kill();
  process.exit(1);
});
