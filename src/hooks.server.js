/**
 * Sends cross-origin isolation headers on every SvelteKit response during
 * development and preview, so SharedArrayBuffer (required by CheerpX) works
 * without the service worker. On GitHub Pages responses are static files and
 * this hook does not run; static/serviceWorker.js injects the same headers
 * there instead.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export async function handle({ event, resolve }) {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
	return response;
}
