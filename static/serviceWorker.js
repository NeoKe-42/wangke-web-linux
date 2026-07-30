// Service worker for WangKe Web Linux.
//
// Two responsibilities:
//   1. Inject COOP/COEP/CORP headers on every response so cross-origin
//      isolation (SharedArrayBuffer) works on hosts that cannot set headers
//      (e.g. GitHub Pages). This is the original WebVM behaviour.
//   2. Persistently cache the CheerpX GitHubDevice disk blocks (ext2 chunks,
//      the .meta file and the relevant index.list) so that, after the first
//      load, command execution no longer waits on the network for blocks that
//      have already been read. Only blocks CheerpX actually touches are
//      cached; the whole image is never pre-downloaded.

const DISK_CACHE = "wangke-web-linux-disk-v1";
const IDENTITY_CACHE = "wangke-web-linux-disk-identity-v1";
const IDENTITY_KEY = "__disk_image_identity__";

const CHUNK_RE = /\.ext2\.c[0-9a-f]+\.txt$/i;
const META_RE = /\.ext2\.meta$/i;

// SW-global state (lives as long as this worker instance).
let diskDir = null; // URL directory of the active disk image
let knownIdentity = null; // last image identity we observed

/** Extract the ext2 base name ("foo_20260730_123.ext2") from a chunk/meta URL. */
function getDiskImageIdentity(url) {
	const pathname = new URL(url, self.location.href).pathname;
	const m = pathname.match(/([^/]+\.ext2)(?:\.(?:c[0-9a-f]+\.txt|meta))?$/i);
	return m ? m[1] : null;
}

function isIndexPathname(pathname) {
	return pathname.endsWith("/index.list") || pathname === "index.list";
}

function directoryOf(url) {
	const parsed = new URL(url, self.location.href);
	return `${parsed.origin}${parsed.pathname.replace(/[^/]*$/, "")}`;
}

function serviceWorkerScopeDirectory() {
	return directoryOf(self.registration.scope);
}

/**
 * True for CheerpX disk reads we want to cache. index.list is accepted only
 * from the active image directory. Before the page has announced that
 * directory, the registration scope is the safe fallback because the deploy
 * workflow puts the image and its index.list next to the app.
 */
function isDiskRequest(request) {
	if (request.method !== "GET") return false;
	const url = new URL(request.url);
	if (CHUNK_RE.test(url.pathname) || META_RE.test(url.pathname)) return true;
	if (isIndexPathname(url.pathname)) {
		const dir = directoryOf(url);
		return dir === (diskDir ?? serviceWorkerScopeDirectory());
	}
	return false;
}

/** Build a response with the cross-origin-isolation headers applied. */
function patchResponseHeaders(r) {
	const newHeaders = new Headers(r.headers);
	newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
	newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
	newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
	// CheerpOS needs the resolved URL; bounce redirected requests back through
	// the worker with a 301 + location header (original WebVM workaround).
	if (r.redirected === true) newHeaders.set("location", r.url);
	return new Response(r.redirected === true ? null : r.body, {
		headers: newHeaders,
		status: r.redirected === true ? 301 : r.status,
		statusText: r.statusText,
	});
}

/** Network fetch with header patching; propagates network errors cleanly. */
async function fetchAndPatch(request) {
	let r;
	try {
		r = await fetch(request);
	} catch (error) {
		// Network failure: never touch an undefined response, just propagate.
		throw error;
	}
	// Opaque responses carry no readable headers/body; pass them through as-is.
	if (r.status === 0 || r.type === "opaque") return r;
	return patchResponseHeaders(r);
}

/**
 * Drop blocks that belong to a previous image and any cached directory
 * listing (the listing changes between deploys). The current image's blocks
 * are kept, so a normal reload never loses its cache.
 */
async function cleanupOldDiskEntries(cache, currentIdentity) {
	const keys = await cache.keys();
	for (const req of keys) {
		const pathname = new URL(req.url).pathname;
		const id = getDiskImageIdentity(req.url);
		if (isIndexPathname(pathname)) {
			await cache.delete(req); // stale listing; re-fetched on demand
		} else if (id && id !== currentIdentity) {
			await cache.delete(req); // previous image's chunks / meta
		}
	}
}

/**
 * Remember the active image and, when it changes, clean up the previous one
 * in the background. The persisted marker means a plain reload of the same
 * image does NOT trigger cleanup (so the cache survives refreshes).
 */
function noteIdentity(identity) {
	knownIdentity = identity; // set synchronously to avoid duplicate triggers
	return (async () => {
		try {
			const idCache = await caches.open(IDENTITY_CACHE);
			const markerResp = await idCache.match(IDENTITY_KEY);
			const marker = markerResp ? await markerResp.text() : null;
			if (marker && marker !== identity) {
				const cache = await caches.open(DISK_CACHE);
				await cleanupOldDiskEntries(cache, identity);
			}
			await idCache.put(IDENTITY_KEY, new Response(identity));
		} catch (e) {
			console.log("Disk cache version cleanup failed:", e);
		}
	})();
}

/**
 * The page announces the configured image before GitHubDevice asks for
 * index.list. This lets us invalidate a previous deployment's cached listing
 * before it can hide the newly named image.
 */
async function setActiveDiskImage(imageUrl) {
	const absoluteUrl = new URL(imageUrl, self.registration.scope).href;
	const identity = getDiskImageIdentity(absoluteUrl);
	if (!identity) return;
	diskDir = directoryOf(absoluteUrl);
	// Always refresh the persisted marker. This is cheap when the identity is
	// unchanged and also restores it after the user explicitly clears caches.
	await noteIdentity(identity);
}

/** Cache-first read for disk blocks; stores only successful basic responses. */
async function handleDiskFetch(request, event) {
	const cache = await caches.open(DISK_CACHE);
	const cached = await cache.match(request);
	if (cached) return cached;

	let response;
	try {
		response = await fetchAndPatch(request);
	} catch (error) {
		// Network failed: if a cache entry exists (defensive), use it; else
		// keep the current error behaviour.
		const fallback = await cache.match(request);
		if (fallback) return fallback;
		throw error;
	}

	if (response && response.ok && response.status === 200 && response.type !== "opaque") {
		// The cloned body must be fully written before the worker can idle,
		// otherwise the stored entry is truncated and a later cache hit returns
		// a broken body (which hangs the emulated disk read). waitUntil keeps
		// the worker alive without delaying the response we hand back.
		const store = cache.put(request, response.clone()).catch(() => {});
		if (event) event.waitUntil(store);
		else await store;
	}
	return response;
}

function serviceWorkerInit() {
	self.addEventListener("install", () => self.skipWaiting());
	self.addEventListener("activate", (e) =>
		e.waitUntil(
			(async () => {
				// Remove caches from other versions only; never the active ones.
				const keep = new Set([DISK_CACHE, IDENTITY_CACHE]);
				const names = await caches.keys();
				await Promise.all(
					names.map((n) =>
						n.startsWith("wangke-web-linux-disk") && !keep.has(n) ? caches.delete(n) : null
					)
				);
				await self.clients.claim();
			})()
		)
	);

	self.addEventListener("fetch", function (e) {
		const request = e.request;
		if (request.method === "GET" && isDiskRequest(request)) {
			const identity = getDiskImageIdentity(request.url);
			if (identity) diskDir = directoryOf(request.url);
			// Run version cleanup in the background so it never delays the block.
			if (identity && identity !== knownIdentity) {
				e.waitUntil(noteIdentity(identity));
			}
			e.respondWith(handleDiskFetch(request, e));
		} else {
			// Everything else keeps the original header-injection behaviour.
			e.respondWith(fetchAndPatch(request));
		}
	});

	self.addEventListener("message", (e) => {
		if (e.data?.type !== "SET_ACTIVE_DISK_IMAGE" || typeof e.data.url !== "string") return;
		const update = setActiveDiskImage(e.data.url).finally(() => {
			e.ports[0]?.postMessage({ type: "ACTIVE_DISK_IMAGE_SET" });
		});
		e.waitUntil(update);
	});
}

async function doRegister() {
	try {
		const registration = await navigator.serviceWorker.register(window.document.currentScript.src);
		console.log("Service Worker registered", registration.scope);
		// EventListener to make sure that the page gets reloaded when a new serviceworker gets installed.
		// f.e on first access.
		registration.addEventListener("updatefound", () => {
			console.log("Reloading the page to transfer control to the Service Worker.");
			try {
				window.location.reload();
			} catch (err) {
				console.log("Service Worker failed reloading the page. ERROR:" + err);
			}
		});
		// When the registration is active, but it's not controlling the page, we reload the page to have it take control.
		// This f.e occurs when you hard-reload (shift + refresh). https://www.w3.org/TR/service-workers/#navigator-service-worker-controller
		if (registration.active && !navigator.serviceWorker.controller) {
			console.log("Reloading the page to transfer control to the Service Worker.");
			try {
				window.location.reload();
			} catch (err) {
				console.log("Service Worker failed reloading the page. ERROR:" + err);
			}
		}
	} catch (e) {
		console.error("Service Worker failed to register:", e);
	}
}

async function serviceWorkerRegister() {
	const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
	if (window.crossOriginIsolated) {
		// The server already provides COOP/COEP (vite dev/preview). Drop any
		// stale registration so the worker stops intercepting dev requests.
		if (isLocal && "serviceWorker" in navigator) {
			try {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) await registration.unregister();
			} catch (e) {
				console.log("Service Worker cleanup failed:", e);
			}
		}
		return;
	}
	if (!window.isSecureContext) {
		console.log("Service Worker not registered, a secure context is required.");
		return;
	}
	// Register the service worker and reload the page to transfer control to the serviceworker.
	if ("serviceWorker" in navigator) await doRegister();
	else console.log("Service worker is not supported in this browser");
}

if (typeof window === "undefined")
	// If the script is running in a Service Worker context
	serviceWorkerInit();
// If the script is running in the browser context
else serviceWorkerRegister();
