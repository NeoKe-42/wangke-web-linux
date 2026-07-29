import { test, expect } from '@playwright/test';

test('boots a real Linux shell in the browser and runs commands', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (e) => pageErrors.push(String(e)));

	await page.goto('/');

	// The simulated boot log appears in the terminal.
	const xterm = page.locator('.xterm');
	await expect(xterm).toBeVisible({ timeout: 60_000 });
	await expect(xterm).toContainText('Booting WangKe Web Linux', { timeout: 60_000 });

	// Wait until the real shell prompt is on screen. The disk image is
	// streamed block-by-block, so the first boot can take a while.
	await expect(xterm).toContainText('$', { timeout: 240_000 });

	const textarea = page.locator('.xterm-helper-textarea');
	await textarea.focus();

	// Arithmetic proves this is a real shell, not a simulation.
	await page.keyboard.type('echo WANGKE_OK_$((40+2))');
	await page.keyboard.press('Enter');
	await expect(xterm).toContainText('WANGKE_OK_42', { timeout: 60_000 });

	// Coreutils are really installed.
	await page.keyboard.type('uname -s');
	await page.keyboard.press('Enter');
	await expect(xterm).toContainText('Linux', { timeout: 60_000 });

	// python3 really runs.
	await page.keyboard.type('python3 -c "print(6*7)"');
	await page.keyboard.press('Enter');
	await expect(xterm).toContainText('42', { timeout: 120_000 });

	expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});

test('shows on-screen helper keys on touch devices', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true
	});
	const page = await context.newPage();
	await page.goto('/');

	await expect(page.locator('.xterm')).toBeVisible({ timeout: 60_000 });
	await expect(page.getByText('WangKe Web Linux').first()).toBeVisible();
	for (const label of ['Ctrl', 'Alt', 'Tab', 'Esc', '←', '↑', '↓', '→']) {
		await expect(page.locator('.touch-keys button', { hasText: label })).toBeVisible();
	}

	await context.close();
});
