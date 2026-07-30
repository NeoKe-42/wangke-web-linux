import { chromium } from '@playwright/test';

const URL = 'https://neoke-42.github.io/wangke-web-linux/';

function toMs(s) {
	if (!s) return null;
	const m = s.match(/([0-9]+)m([0-9.]+)s/);
	return m ? (parseInt(m[1], 10) * 60 + parseFloat(m[2])) * 1000 : null;
}

async function runTimed(page, cmd) {
	await page.locator('.xterm-helper-textarea').focus();
	const before = await page.evaluate(() => document.querySelector('.xterm').textContent.length);
	await page.keyboard.type(cmd);
	await page.keyboard.press('Enter');
	await page.waitForFunction(
		(b) => {
			const t = document.querySelector('.xterm').textContent;
			return t.length > b && /wangke@web-linux:~\$\s*$/.test(t);
		},
		before,
		{ timeout: 180000, polling: 500 }
	);
	const text = await page.evaluate(() => document.querySelector('.xterm').textContent);
	const matches = [...text.matchAll(/real\s+([0-9]+m[0-9.]+s)/g)];
	return matches.length ? toMs(matches[matches.length - 1][1]) : null;
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

let chunkRequestsFirst = 0;
let chunkRequestsReload = 0;
let phase = 'first';
page.on('request', (r) => {
	if (/\.ext2\.c[0-9a-f]+\.txt/i.test(r.url())) {
		if (phase === 'first') chunkRequestsFirst++;
		else chunkRequestsReload++;
	}
});

console.log('loading (cleared storage, first boot)...');
await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
await page.locator('.xterm').waitFor({ timeout: 90000 });
await page.waitForFunction(
	() => /wangke@web-linux:~\$\s*$/.test(document.querySelector('.xterm')?.textContent ?? ''),
	null,
	{ timeout: 300000, polling: 2000 }
);

const bootText = await page.evaluate(() => document.querySelector('.xterm').textContent);
const preheatShown =
	bootText.includes('Preparing frequently used commands') && bootText.includes('System ready');
const coi = await page.evaluate(() => window.crossOriginIsolated);

const free1 = await runTimed(page, 'time free -h');
const free2 = await runTimed(page, 'time free -h');
const df1 = await runTimed(page, 'time df -h');
const df2 = await runTimed(page, 'time df -h');
const neo1 = await runTimed(page, 'time neofetch');
// prompt-time hang probe for the new caching SW (also informational timings)
const ls1 = await runTimed(page, 'time ls /');
const py1 = await runTimed(page, 'time python3 -c "print(6*7)"');
const git1 = await runTimed(page, 'time git --version');

// reload: blocks should now come from the SW disk cache
phase = 'reload';
console.log('reloading (disk blocks expected from SW cache)...');
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(
	() => /wangke@web-linux:~\$\s*$/.test(document.querySelector('.xterm')?.textContent ?? ''),
	null,
	{ timeout: 300000, polling: 2000 }
);
const freeReload = await runTimed(page, 'time free -h');
const coi2 = await page.evaluate(() => window.crossOriginIsolated);

await browser.close();

const fmt = (ms) => (ms === null ? 'n/a' : `${ms.toFixed(0)} ms`);
console.log(
	JSON.stringify(
		{
			crossOriginIsolated_first: coi,
			crossOriginIsolated_reload: coi2,
			preheatLinesShown: preheatShown,
			chunkRequests_firstLoad: chunkRequestsFirst,
			chunkRequests_afterReload: chunkRequestsReload,
			free_1st_manual_ms: fmt(free1),
			free_2nd_ms: fmt(free2),
			df_1st_manual_ms: fmt(df1),
			df_2nd_ms: fmt(df2),
			neofetch_not_prewarmed_ms: fmt(neo1),
			ls_at_prompt_ms: fmt(ls1),
			python3_at_prompt_ms: fmt(py1),
			git_at_prompt_ms: fmt(git1),
			free_after_reload_ms: fmt(freeReload)
		},
		null,
		2
	)
);
