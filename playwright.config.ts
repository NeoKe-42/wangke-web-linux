import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke test: boots the real CheerpX VM in headless Chromium and
 * executes real shell commands. The first run downloads a disk image, so
 * timeouts are generous. Run with: npm run test:e2e
 */
export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 300_000,
	expect: { timeout: 240_000 },
	retries: 0,
	workers: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5199',
		headless: true,
		viewport: { width: 1280, height: 800 }
	},
	webServer: {
		command: 'npm run dev -- --port 5199 --strictPort',
		port: 5199,
		reuseExistingServer: false,
		timeout: 120_000
	}
});
