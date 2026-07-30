<script lang="ts">
	import { base } from '$app/paths';
	import BlogHeader from '$lib/components/BlogHeader.svelte';
	import { articles } from '$lib/blog/articles';
</script>

<svelte:head>
	<title>WangKe Notes — Linux 与 WebAssembly</title>
	<meta
		name="description"
		content="WangKe Web Linux 的技术笔记：浏览器 Linux、WebAssembly、CheerpX 与工程实践。"
	/>
</svelte:head>

<div class="h-dvh overflow-y-auto bg-[#0c0c0c] text-zinc-300">
	<BlogHeader />

	<main class="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
		<section class="mb-12 border-l-2 border-green-500 pl-5">
			<p class="mb-2 text-xs uppercase tracking-[0.24em] text-green-500">WangKe Notes</p>
			<h1 class="text-2xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
				在浏览器里，认真运行 Linux
			</h1>
			<p class="mt-4 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
				记录 Web Linux、WebAssembly、性能工程，以及那些只有真正运行起来才会遇到的问题。
			</p>
		</section>

		<div class="grid gap-5">
			{#each articles as article, index}
				<article
					class="group rounded-lg border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-700 sm:p-7"
				>
					<div class="flex items-start gap-4">
						<span class="hidden pt-1 text-xs text-zinc-700 sm:block">
							{String(index + 1).padStart(2, '0')}
						</span>
						<div class="min-w-0 flex-1">
							<div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-600">
								<time datetime={article.date}>{article.dateLabel}</time>
								<span>·</span>
								<span>{article.readingTime}</span>
							</div>
							<h2 class="text-lg font-bold text-zinc-100 group-hover:text-green-400 sm:text-xl">
								<a href={`${base}/blog/${article.slug}`}>{article.title}</a>
							</h2>
							<p class="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">{article.summary}</p>
							<div class="mt-5 flex flex-wrap items-center gap-2">
								{#each article.tags as tag}
									<span class="rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-500">
										#{tag}
									</span>
								{/each}
								<a
									href={`${base}/blog/${article.slug}`}
									class="ml-auto text-xs text-zinc-500 group-hover:text-green-400"
								>
									阅读全文 →
								</a>
							</div>
						</div>
					</div>
				</article>
			{/each}
		</div>
	</main>

	<footer class="border-t border-zinc-900 px-4 py-8 text-center text-[11px] text-zinc-700">
		Built alongside WangKe Web Linux.
	</footer>
</div>
