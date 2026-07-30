<script lang="ts">
	import { base } from '$app/paths';
</script>

<header class="border-b border-zinc-800 bg-zinc-950/95">
	<div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
		<a href={`${base}/blog`} class="font-bold tracking-wide text-zinc-100 hover:text-green-400">
			WangKe Notes
		</a>
		<span class="hidden text-zinc-700 sm:inline">/</span>
		<span class="hidden text-xs text-zinc-500 sm:inline">Linux · WebAssembly · Engineering</span>
		<div class="flex-1"></div>
		<a
			href={`${base}/`}
			class="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-green-700 hover:text-green-400"
		>
			打开终端 <span aria-hidden="true">↗</span>
		</a>
	</div>
</header>
