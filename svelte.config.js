import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		// GitHub Pages serves the site under /<repository>/; pass BASE_PATH at build time.
		paths: {
			base: process.env.BASE_PATH || ''
		}
	},
	preprocess: vitePreprocess()
};

export default config;
