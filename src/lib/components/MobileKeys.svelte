<script lang="ts">
	import { stickyCtrl, stickyAlt } from '$lib/stores';

	/** Sends a sequence to the VM shell (wired to xterm input by the parent). */
	export let send: (data: string) => void = () => {};

	type Arrow = 'A' | 'B' | 'D' | 'C'; // up / down / left / right (xterm SS3 codes)

	function arrow(code: Arrow) {
		const ctrl = $stickyCtrl;
		const alt = $stickyAlt;
		if (ctrl) send(`\x1b[1;5${code}`);
		else if (alt) send(`\x1b[1;3${code}`);
		else send(`\x1b[${code}`);
		if (ctrl || alt) {
			stickyCtrl.set(false);
			stickyAlt.set(false);
		}
	}

	function key(action: 'esc' | 'tab' | 'ctrl' | 'alt') {
		switch (action) {
			case 'esc':
				send('\x1b');
				break;
			case 'tab':
				send('\t');
				break;
			case 'ctrl':
				stickyCtrl.set(!$stickyCtrl);
				stickyAlt.set(false);
				break;
			case 'alt':
				stickyAlt.set(!$stickyAlt);
				stickyCtrl.set(false);
				break;
		}
	}
</script>

<!-- Visible only on touch devices (see .touch-keys in app.css). -->
<div
	class="touch-keys shrink-0 flex-wrap justify-between gap-x-2 gap-y-1 px-1.5 py-2 bg-zinc-950 border-t border-zinc-800"
>
	<div class="flex items-center gap-1">
		<button class="key" class:key-active={$stickyCtrl} on:click={() => key('ctrl')}>Ctrl</button>
		<button class="key" class:key-active={$stickyAlt} on:click={() => key('alt')}>Alt</button>
		<button class="key" on:click={() => key('tab')}>Tab</button>
		<button class="key" on:click={() => key('esc')}>Esc</button>
	</div>
	<div class="flex items-center gap-1">
		<button class="key" aria-label="Left" on:click={() => arrow('D')}>←</button>
		<button class="key" aria-label="Up" on:click={() => arrow('A')}>↑</button>
		<button class="key" aria-label="Down" on:click={() => arrow('B')}>↓</button>
		<button class="key" aria-label="Right" on:click={() => arrow('C')}>→</button>
	</div>
</div>
