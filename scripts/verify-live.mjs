import { chromium } from '@playwright/test';

// Post-deploy smoke test: boots the deployed site and runs a real command.
//   node scripts/verify-live.mjs [url]
//   LIVE_URL=https://... node scripts/verify-live.mjs
const URL = process.argv[2] || process.env.LIVE_URL || 'https://neoke-42.github.io/wangke-web-linux/';
const browser = await chromium.launch();
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(String(e).slice(0, 200)));
page.on('requestfailed', (r) => {
	const u = r.url();
	if (!u.includes('cxrtnc')) problems.push(`reqfail ${u.slice(0, 120)} ${r.failure()?.errorText}`);
});

console.log('navigating...');
await page.goto(URL, { waitUntil: 'load', timeout: 90_000 });

const xterm = page.locator('.xterm');
await xterm.waitFor({ timeout: 90_000 });
console.log('xterm visible; waiting for the real shell prompt (wangke image streams from Pages chunks)...');

// The prompt: wangke@web-linux:~$
await page.waitForFunction(
	() => document.querySelector('.xterm')?.textContent?.includes('wangke@web-linux:~$'),
	null,
	{ timeout: 300_000, polling: 2000 }
);
console.log('PROMPT OK: wangke@web-linux:~$');

await page.locator('.xterm-helper-textarea').focus();
await page.keyboard.type('whoami && echo WK_$((6*7)) && head -3 README.txt');
await page.keyboard.press('Enter');
await page.waitForFunction(
	() => document.querySelector('.xterm')?.textContent?.includes('WK_42'),
	null,
	{ timeout: 120_000, polling: 2000 }
);
console.log('COMMANDS OK');

const text = await page.evaluate(() => document.querySelector('.xterm')?.textContent ?? '');
console.log('--- welcome present:', text.includes('Welcome to WangKe Web Linux'));
console.log('--- whoami output present:', /whoami.*\nwangke|wangke\n/.test(text) || text.includes('wangke'));
console.log('--- README head present:', text.includes('WangKe Web Linux'));
console.log('--- problems:', problems.length ? problems.slice(0, 5) : 'none');
await page.screenshot({ path: '/tmp/wk-live.png' });
await browser.close();
console.log('LIVE CHECK DONE');
