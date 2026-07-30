<script lang="ts">
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { base } from '$app/paths';
	import { settingsOpen } from '$lib/stores';
	import {
		connectionState,
		currentIp,
		exitNode,
		startLogin,
		copyIp,
		dashboardUrl
	} from '$lib/vm/network';

	const dispatch = createEventDispatcher<{ restart: void; reset: void; clearDiskCache: void }>();

	let confirmReset = false;
	let confirmTimer: ReturnType<typeof setTimeout> | undefined;
	let confirmClearCache = false;
	let confirmClearCacheTimer: ReturnType<typeof setTimeout> | undefined;
	onDestroy(() => {
		clearTimeout(confirmTimer);
		clearTimeout(confirmClearCacheTimer);
	});

	function armReset() {
		if (!confirmReset) {
			confirmReset = true;
			confirmTimer = setTimeout(() => (confirmReset = false), 3000);
			return;
		}
		clearTimeout(confirmTimer);
		confirmReset = false;
		dispatch('reset');
		settingsOpen.set(false);
	}

	function armClearCache() {
		if (!confirmClearCache) {
			confirmClearCache = true;
			confirmClearCacheTimer = setTimeout(() => (confirmClearCache = false), 3000);
			return;
		}
		clearTimeout(confirmClearCacheTimer);
		confirmClearCache = false;
		dispatch('clearDiskCache');
		settingsOpen.set(false);
	}

	async function connectNetwork() {
		const popup = window.open(`${base}/login.html`, '_blank', 'width=640,height=720');
		try {
			const url = await startLogin();
			if (popup) popup.location.href = url;
		} catch {
			popup?.close();
		}
	}

	const actionBtn =
		'px-3 py-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs';
</script>

{#if $settingsOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		role="presentation"
		on:click={() => settingsOpen.set(false)}
	>
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			class="w-full max-w-md bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-300 shadow-xl"
			role="dialog"
			aria-label="Settings"
			on:click|stopPropagation
			on:keydown={(e) => e.key === 'Escape' && settingsOpen.set(false)}
		>
			<div class="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
				<span class="font-bold text-zinc-100">Settings</span>
				<button
					class="text-zinc-500 hover:text-zinc-200 px-1"
					aria-label="Close settings"
					on:click={() => settingsOpen.set(false)}>✕</button
				>
			</div>

			<div class="p-4 space-y-5">
				<section>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Network</h2>
					<p class="mb-2 text-xs leading-relaxed">
						状态：{connectionStateLabel($connectionState)}
						{#if $currentIp}
							（IP: <button class="underline hover:text-zinc-100" on:click={copyIp} title="Click to copy"
									>{$currentIp}</button
								>）
						{/if}
						{#if $exitNode}
							· 已检测到 exit node，可访问公网
						{/if}
					</p>
					{#if $connectionState === 'DISCONNECTED' || $connectionState === 'LOGINFAILED'}
						<button class={actionBtn} on:click={connectNetwork}>连接网络（Tailscale 登录）</button>
					{:else if $connectionState === 'LOGINREADY'}
						<p class="text-xs text-orange-400">已生成登录链接，请在弹出的窗口中完成 Tailscale 登录。</p>
					{:else if $connectionState === 'CONNECTED' && dashboardUrl}
						<a class="underline text-xs" href={dashboardUrl} target="_blank" rel="noreferrer">
							在 Tailscale 控制台查看设备
						</a>
					{/if}
					<p class="mt-2 text-[11px] text-zinc-500 leading-relaxed">
						网络经 Tailscale relay 建立，完全由浏览器本地发起。注意：ICMP 不可用，ping 无法使用，请用
						curl / wget 测试连通性。
					</p>
				</section>

				<section>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">System</h2>
					<div class="flex flex-wrap gap-2">
						<button
							class={actionBtn}
							on:click={() => {
								settingsOpen.set(false);
								dispatch('restart');
							}}>重启虚拟机</button
						>
						<button
							class="{actionBtn} {confirmReset
								? 'border-red-500 text-red-400'
								: ''}"
							on:click={armReset}
						>
							{confirmReset ? '再次点击确认清除' : '恢复系统（清除写入数据）'}
						</button>
						<button
							class="{actionBtn} {confirmClearCache
								? 'border-red-500 text-red-400'
								: ''}"
							on:click={armClearCache}
						>
							{confirmClearCache ? '再次点击确认清除缓存' : '清除磁盘缓存'}
						</button>
					</div>
					<p class="mt-2 text-[11px] text-zinc-500 leading-relaxed">
						“恢复系统”只清除浏览器 IndexedDB
						中的虚拟磁盘<b class="text-zinc-300">写入覆盖层</b>（你在系统里的修改），把系统还原到镜像初始状态；它<b
							class="text-zinc-300">不会</b
						>清除用于加速启动的只读磁盘块缓存。
					</p>
					<p class="mt-1 text-[11px] text-zinc-500 leading-relaxed">
						“清除磁盘缓存”删除 Service Worker
						缓存的只读磁盘分块。清除并刷新后，下一次启动需要重新按需下载磁盘块（首次命令会再次变慢，随后恢复）。
					</p>
				</section>

				<section>
					<h2 class="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">About</h2>
					<p class="text-[11px] text-zinc-500 leading-relaxed">
						WangKe Web Linux — 基于 <a
							class="underline"
							href="https://github.com/leaningtech/webvm"
							target="_blank"
							rel="noreferrer">WebVM</a
						>（Apache-2.0）与 <a
							class="underline"
							href="https://cheerpx.io"
							target="_blank"
							rel="noreferrer">CheerpX</a
						>
						虚拟化引擎。完整的 Debian Linux
						通过 x86→WebAssembly 实时翻译运行在你的浏览器里，没有远程 SSH 服务器，没有后端。
					</p>
				</section>
			</div>
		</div>
	</div>
{/if}

<script context="module" lang="ts">
	import type { NetState } from '$lib/vm/network';

	function connectionStateLabel(s: NetState): string {
		switch (s) {
			case 'DISCONNECTED':
				return '未连接（VM 内无网络）';
			case 'DOWNLOADING':
				return '网络栈加载中…';
			case 'LOGINSTARTING':
				return '正在等待登录地址…';
			case 'LOGINREADY':
				return '等待 Tailscale 登录…';
			case 'LOGINFAILED':
				return '登录失败';
			case 'CONNECTED':
				return '已连接';
			case 'IPCOPIED':
				return 'IP 已复制';
			default:
				return String(s);
		}
	}
</script>
