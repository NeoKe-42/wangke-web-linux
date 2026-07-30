export const DISK_CACHE_NAME = 'wangke-web-linux-disk-v1';
const IDENTITY_CACHE_NAME = 'wangke-web-linux-disk-identity-v1';

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
