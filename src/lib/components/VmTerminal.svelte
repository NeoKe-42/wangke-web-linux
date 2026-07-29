<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import StatusBar from './StatusBar.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import MobileKeys from './MobileKeys.svelte';
	import { createTerminal, type TerminalHandle } from '$lib/terminal/terminal';
	import { playBootLog, writeStatus } from '$lib/terminal/boot';
	import {
		startVm,
		checkBrowserSupport,
		describeVmError,
		type VmHandle,
		type VmIo
	} from '$lib/vm/machine';
	import { vmConfig, bootLines, fallbackIntro } from '$lib/config/vm';
	import { vmPhase, vmError, diskActive, stickyCtrl, stickyAlt } from '$lib/stores';

	let consoleEl: HTMLDivElement;
	let termHandle: TerminalHandle | null = null;
	let handle: VmHandle | null = null;
	let skipUnloadConfirm = false;

	/** Applies one-shot Ctrl/Alt sticky modifiers (set by MobileKeys) to input. */
	function send(data: string) {
		if (!handle) return;
		let out = data;
		const ctrl = get(stickyCtrl);
		const alt = get(stickyAlt);
		if ((ctrl || alt) && data.length === 1) {
			const lower = data.toLowerCase();
			if (lower >= 'a' && lower <= 'z') {
				out = ctrl ? String.fromCharCode(lower.charCodeAt(0) - 96) : `\x1b${data}`;
				stickyCtrl.set(false);
				stickyAlt.set(false);
			}
		}
		handle.input(out);
	}

	function onResize() {
		termHandle?.fit();
	}

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (handle && !skipUnloadConfirm) {
			// Ask before throwing the VM away (browser shows its native dialog).
			e.preventDefault();
			e.returnValue = '';
		}
	}

	function fail(message: string) {
		vmPhase.set('error');
		vmError.set(message);
		const term = termHandle?.term;
		if (term) {
			term.writeln('');
			term.writeln(`\x1b[1;31m[ERROR]\x1b[0m ${message}`);
		}
	}

	function restart() {
		skipUnloadConfirm = true;
		location.reload();
	}

	async function resetSystem() {
		skipUnloadConfirm = true;
		if (handle) {
			try {
				await handle.resetDisk();
			} catch {
				// reload anyway; the cache stays as-is if reset failed
			}
		}
		location.reload();
	}

	onMount(async () => {
		termHandle = createTerminal(consoleEl);
		const term = termHandle.term;
		term.onData(send);
		window.addEventListener('resize', onResize);
		window.addEventListener('beforeunload', onBeforeUnload);

		const unsupported = checkBrowserSupport();
		if (unsupported) {
			fail(unsupported);
			return;
		}

		try {
			vmPhase.set('booting');
			await playBootLog(term, bootLines);

			const io: VmIo = {
				write: (buf, vt) => {
					if (vt === 1) term.write(buf);
				},
				get columns() {
					return term.cols;
				},
				get rows() {
					return term.rows;
				}
			};

			handle = await startVm(vmConfig, io, {
				onPhase: (phase, detail) => {
					vmPhase.set(phase);
					if (phase === 'loading-disk') {
						writeStatus(term, `Loading virtual disk image (${detail ?? vmConfig.diskImageUrl})`);
					} else if (phase === 'starting-kernel') {
						writeStatus(term, 'Starting Linux (CheerpX x86 → WebAssembly JIT)');
					} else if (phase === 'running') {
						writeStatus(term, 'Console attached — handing over to /bin/bash');
						if (vmConfig.identity === 'official') {
							for (const line of fallbackIntro) term.writeln(line);
						}
					} else if (phase === 'error' && detail) {
						fail(describeVmError(new Error(detail)));
					}
				},
				onDiskActivity: (active) => diskActive.set(active)
			});

			term.focus();
		} catch (e) {
			fail(describeVmError(e));
		}
	});

	onDestroy(() => {
		window.removeEventListener('resize', onResize);
		window.removeEventListener('beforeunload', onBeforeUnload);
		termHandle?.destroy();
	});
</script>

<div class="flex flex-col h-dvh w-full bg-[#0c0c0c] text-zinc-200 overflow-hidden">
	<StatusBar on:restart={restart} />

	<div class="relative flex-1 min-h-0">
		<div bind:this={consoleEl} class="terminal-scroll absolute inset-0 p-1 sm:p-2"></div>

		{#if $vmPhase === 'error'}
			<div class="absolute inset-x-0 bottom-0 flex justify-center p-3">
				<button
					class="px-4 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-800"
					on:click={restart}
				>
					重试（重新加载页面）
				</button>
			</div>
		{/if}
	</div>

	<MobileKeys send={send} />
	<SettingsDialog on:restart={restart} on:reset={resetSystem} />
</div>
