export const DISK_CACHE_NAME = 'wangke-web-linux-disk-v1';
const IDENTITY_CACHE_NAME = 'wangke-web-linux-disk-identity-v1';

/**
 * Tell the Service Worker which versioned GitHubDevice image is about to be
 * opened. Waiting for its acknowledgement prevents a cached index.list from
 * an older deployment from hiding the new image name.
 */
export async function prepareDiskDownloadCache(imageUrl: string): Promise<void> {
	if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;

	await new Promise<void>((resolve) => {
		const channel = new MessageChannel();
		const finish = () => {
			window.clearTimeout(timeout);
			channel.port1.close();
			resolve();
		};
		const timeout = window.setTimeout(finish, 5000);
		channel.port1.onmessage = finish;
		navigator.serviceWorker.controller?.postMessage(
			{ type: 'SET_ACTIVE_DISK_IMAGE', url: new URL(imageUrl, window.location.href).href },
			[channel.port2]
		);
	});
}

/**
 * Deletes the Service Worker's read-only disk-block cache (the chunks that
 * accelerate boot). This is independent of the user's IndexedDB write overlay,
 * which is cleared by "恢复系统" via VmHandle.resetDisk(). After this resolves
 * the caller should reload; the next boot re-downloads blocks on demand.
 */
export async function clearDiskDownloadCache(): Promise<void> {
	if (typeof caches === 'undefined') return;
	await Promise.all([caches.delete(DISK_CACHE_NAME), caches.delete(IDENTITY_CACHE_NAME)]);
}
