import { chromium } from '@playwright/test';
const URL = 'https://neoke-42.github.io/wangke-web-linux/';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('[console.error] ' + m.text().slice(0, 200)); });
await p.goto(URL, { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(90000);
const info = await p.evaluate(() => {
	const t = document.querySelector('.xterm')?.textContent ?? '';
	return {
		coi: window.crossOriginIsolated,
		swController: !!navigator.serviceWorker?.controller,
		hasPreparing: t.includes('Preparing frequently used commands'),
		hasSystemReady: t.includes('System ready'),
		hasPrompt: /wangke@web-linux:~\$/.test(t),
		tail: t.slice(-700)
	};
});
console.log('errors:', JSON.stringify(errs.slice(0, 8), null, 1));
console.log(JSON.stringify(info, null, 1));
await p.screenshot({ path: '/tmp/wk-diag.png' });
await b.close();
