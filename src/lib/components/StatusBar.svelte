<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { base } from '$app/paths';
	import { vmPhase, diskActive, settingsOpen } from '$lib/stores';
	import { connectionState, currentIp } from '$lib/vm/network';
	import type { VmPhase } from '$lib/vm/types';
	import type { NetState } from '$lib/vm/network';

	const dispatch = createEventDispatcher<{ restart: void }>();

	const phaseLabel: Record<VmPhase, string> = {
		idle: 'Starting',
		booting: 'Booting',
		'loading-disk': 'Loading disk',
		'starting-kernel': 'Starting kernel',
		running: 'Running',
		error: 'Error'
	};

	function phaseDot(p: VmPhase): string {
		if (p === 'running') return 'bg-green-500';
		if (p === 'error') return 'bg-red-500';
		if (p === 'idle') return 'bg-zinc-600';
		return 'bg-yellow-500 animate-pulse';
	}

	const netLabel: Record<NetState, string> = {
		DISCONNECTED: 'Relay off',
		DOWNLOADING: 'Net: waiting',
		LOGINSTARTING: 'Net: login…',
		LOGINREADY: 'Net: login…',
		LOGINFAILED: 'Net: login failed',
		CONNECTED: 'Online',
		IPCOPIED: 'IP copied'
	} as Record<NetState, string>;

	function netDot(s: NetState): string {
		if (s === 'CONNECTED' || s === 'IPCOPIED') return 'bg-green-500';
		if (s === 'DISCONNECTED') return 'bg-zinc-600';
		return 'bg-orange-500 animate-pulse';
	}

	let fullscreen = false;
	function onFullscreenChange() {
		fullscreen = document.fullscreenElement !== null;
	}
	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch {
			// some mobile browsers reject the request; ignore
		}
	}
	onMount(() => {
		document.addEventListener('fullscreenchange', onFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
	});

	const btn =
		'px-2 py-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700 transition-colors';
</script>

<header
	class="flex items-center gap-2 sm:gap-3 h-9 px-2 sm:px-3 bg-zinc-950 border-b border-zinc-800 text-xs select-none shrink-0"
>
	<span class="font-bold tracking-wide text-zinc-100 truncate">WangKe Web Linux</span>

	<span class="flex items-center gap-1.5 text-zinc-400" title="VM state: {phaseLabel[$vmPhase]}">
		<span class="w-2 h-2 rounded-full {phaseDot($vmPhase)}"></span>
		<span class="hidden sm:inline">VM: {phaseLabel[$vmPhase]}</span>
	</span>

	<span
		class="flex items-center gap-1.5 text-zinc-400"
		title="Network: {netLabel[$connectionState]}{$currentIp ? ` (${$currentIp})` : ''}"
	>
		<span class="w-2 h-2 rounded-full {netDot($connectionState)}"></span>
		<span class="hidden md:inline">
			{netLabel[$connectionState]}{$currentIp ? ` · ${$currentIp}` : ''}
		</span>
	</span>

	<span class="hidden sm:flex items-center gap-1.5 text-zinc-500" title="Disk activity">
		<span class="w-2 h-2 rounded-full {$diskActive ? 'bg-amber-400' : 'bg-zinc-800'}"></span>
		<span class="hidden lg:inline">Disk</span>
	</span>

	<div class="flex-1"></div>

	<a
		class={btn}
		href={`${base}/blog`}
		target="_blank"
		rel="noreferrer"
		title="Open blog in a new tab"
		aria-label="Open blog"
	>
		<span class="hidden sm:inline">Blog</span><span class="sm:hidden">文</span>
	</a>
	<button class={btn} title="Restart VM" aria-label="Restart VM" on:click={() => dispatch('restart')}>
		⟳
	</button>
	<button
		class={btn}
		title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
		aria-label="Toggle fullscreen"
		on:click={toggleFullscreen}
	>
		⛶
	</button>
	<button
		class={btn}
		title="Settings"
		aria-label="Settings"
		on:click={() => settingsOpen.set(true)}
	>
		⚙
	</button>
</header>
