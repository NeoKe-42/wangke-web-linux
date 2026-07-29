import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Serves locally built disk images from custom-disk-images/ during
 * `vite dev` and `vite preview` (the directory is outside static/ on
 * purpose: images are large and must never be bundled or committed).
 */
function serveCustomDiskImages() {
	const dir = path.resolve('custom-disk-images');
	const handler = (req: any, res: any, next: any) => {
		const url: string = req.url || '';
		if (!url.startsWith('/custom-disk-images/')) return next();
		const file = path.join(dir, path.basename(url.split('?')[0]));
		fs.stat(file, (err, st) => {
			if (err || !st.isFile()) {
				res.statusCode = 404;
				res.end('disk image not found');
				return;
			}
			res.setHeader('Content-Type', 'application/octet-stream');
			res.setHeader('Content-Length', st.size);
			res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
			fs.createReadStream(file).pipe(res);
		});
	};
	return {
		name: 'serve-custom-disk-images',
		configureServer(server: any) {
			server.middlewares.use(handler);
		},
		configurePreviewServer(server: any) {
			server.middlewares.use(handler);
		}
	};
}

// Cross-origin isolation headers required for SharedArrayBuffer (CheerpX).
// In development and preview the server sends them directly; on GitHub Pages
// they are injected by static/serviceWorker.js instead, since Pages cannot
// set response headers.
const coiHeaders = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp',
	'Cross-Origin-Resource-Policy': 'cross-origin'
};

export default defineConfig({
	server: { headers: coiHeaders },
	preview: { headers: coiHeaders },
	// The CheerpX loader uses top-level await; the default es2020 dep-optimize
	// target cannot parse it.
	optimizeDeps: {
		esbuildOptions: { target: 'es2022' }
	},
	build: {
		target: 'es2022',
		// CheerpX is a large self-contained engine; silence the chunk size warning.
		chunkSizeWarningLimit: 8000
	},
	plugins: [sveltekit(), serveCustomDiskImages()]
});
