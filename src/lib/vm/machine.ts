import { networkInterface } from './network';
import type { VmConfig, VmPhase } from './types';

/**
 * Thin, typed wrapper around the CheerpX virtualization engine.
 *
 * CheerpX runs the actual x86 Linux kernel + userspace inside Web Workers
 * (x86 → WebAssembly JIT), so the emulated system never blocks the main
 * thread. This module only orchestrates devices, mounts and the run loop.
 */

export interface VmIo {
	write: (data: Uint8Array, vt: number) => void;
	readonly columns: number;
	readonly rows: number;
}

export interface VmEvents {
	onPhase: (phase: VmPhase, detail?: string) => void;
	onDiskActivity?: (active: boolean) => void;
}

export interface VmHandle {
	/** Feed input to the running shell, as if typed in the terminal. */
	input: (data: string) => void;
	/** Wipe the persistent IndexedDB disk overlay ("恢复系统"). */
	resetDisk: () => Promise<void>;
}

export function checkBrowserSupport(): string | null {
	if (typeof WebAssembly === 'undefined') {
		return '当前浏览器不支持 WebAssembly。请使用最新版本的 Chrome、Edge、Firefox 或 Safari。';
	}
	if (typeof SharedArrayBuffer === 'undefined') {
		return (
			'跨源隔离未启用（缺少 SharedArrayBuffer）。本站通过 Service Worker 自动注入所需响应头，' +
			'首次访问会自动刷新一次页面。如果仍然看到此消息：请确认通过 HTTPS 或 localhost 访问，' +
			'并且浏览器没有禁用 Service Worker。'
		);
	}
	return null;
}

export function describeVmError(e: unknown): string {
	const msg = e instanceof Error ? e.message : String(e);
	if (/fetch|network|websocket|socket|load failed|timeout/i.test(msg)) {
		return `网络错误：无法加载磁盘镜像。${msg}。请检查网络连接后刷新重试。`;
	}
	return `虚拟机启动失败：${msg}。请打开浏览器 DevTools 控制台查看详情。CheerpX 需要最新版 Chrome / Edge / Firefox / Safari。`;
}

export async function startVm(config: VmConfig, io: VmIo, events: VmEvents): Promise<VmHandle> {
	const CheerpX = await import('@leaningtech/cheerpx');

	// 1. Root filesystem image.
	events.onPhase('loading-disk', config.diskImageUrl);
	let blockDevice;
	switch (config.diskImageType) {
		case 'cloud':
			try {
				blockDevice = await CheerpX.CloudDevice.create(config.diskImageUrl);
			} catch (e) {
				// The cloud backend speaks WebSocket first; fall back to plain HTTP.
				if (config.diskImageUrl.startsWith('wss:')) {
					blockDevice = await CheerpX.CloudDevice.create(
						'https:' + config.diskImageUrl.slice('wss:'.length)
					);
				} else {
					throw e;
				}
			}
			break;
		case 'bytes':
			blockDevice = await CheerpX.HttpBytesDevice.create(config.diskImageUrl);
			break;
		case 'github':
			blockDevice = await CheerpX.GitHubDevice.create(config.diskImageUrl);
			break;
		default:
			throw new Error(`Unrecognized disk image type: ${String(config.diskImageType)}`);
	}

	// 2. Persistent write overlay backed by IndexedDB: changes survive reloads,
	//    and resetDisk() below restores the pristine image.
	const blockCache = await CheerpX.IDBDevice.create(config.cacheId);
	const overlayDevice = await CheerpX.OverlayDevice.create(blockDevice, blockCache);

	// 3. Expose the site's own static files inside the VM at /web.
	const webDevice = await CheerpX.WebDevice.create('');

	events.onPhase('starting-kernel');
	const mounts = [
		{ type: 'ext2', dev: overlayDevice, path: '/' },
		{ type: 'dir', dev: webDevice, path: '/web' },
		{ type: 'devs', path: '/dev' },
		{ type: 'devpts', path: '/dev/pts' },
		{ type: 'proc', path: '/proc' },
		{ type: 'sys', path: '/sys' }
	];

	const cx = await CheerpX.Linux.create({
		mounts,
		networkInterface
	} as unknown as Parameters<typeof CheerpX.Linux.create>[0]);

	if (events.onDiskActivity) {
		const onDisk = (state: string | number) => events.onDiskActivity?.(String(state) !== 'ready');
		cx.registerCallback('diskActivity', onDisk);
	}

	// 4. Bind the emulated serial console to xterm.js.
	const readFunc = cx.setCustomConsole(
		(buffer: Uint8Array, vt: number) => io.write(buffer, vt),
		io.columns,
		io.rows
	);
	events.onPhase('running');

	// 5. Run the shell; restart it if the user exits.
	void (async () => {
		try {
			for (;;) {
				await cx.run(config.cmd, config.args, config.opts);
			}
		} catch (e) {
			events.onPhase('error', e instanceof Error ? e.message : String(e));
		}
	})();

	return {
		input: (data: string) => {
			for (let i = 0; i < data.length; i++) readFunc(data.charCodeAt(i));
		},
		resetDisk: async () => {
			await blockCache.reset();
		}
	};
}
