<script lang="ts">
	import { base } from '$app/paths';
	import BlogHeader from '$lib/components/BlogHeader.svelte';
	import type { BlogArticle } from '$lib/blog/articles';

	export let data: { article: BlogArticle };
	$: article = data.article;
</script>

<svelte:head>
	<title>{article.title} — WangKe Notes</title>
	<meta name="description" content={article.summary} />
</svelte:head>

<div class="h-dvh overflow-y-auto bg-[#0c0c0c] text-zinc-300">
	<BlogHeader />

	<main class="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
		<a href={`${base}/blog`} class="text-xs text-zinc-600 hover:text-green-400">← 返回文章列表</a>

		<article class="mt-8">
			<header class="border-b border-zinc-800 pb-8">
				<div class="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
					<time datetime={article.date}>{article.dateLabel}</time>
					<span>·</span>
					<span>{article.readingTime}</span>
				</div>
				<h1 class="text-2xl font-bold leading-tight tracking-tight text-zinc-100 sm:text-4xl">
					{article.title}
				</h1>
				<p class="mt-5 text-sm leading-7 text-zinc-500 sm:text-base">{article.summary}</p>
				<div class="mt-5 flex flex-wrap gap-2">
					{#each article.tags as tag}
						<span class="rounded bg-zinc-900 px-2 py-1 text-[10px] text-zinc-500">#{tag}</span>
					{/each}
				</div>
			</header>

			<div class="py-8">
				{#each article.content as block}
					{#if block.type === 'heading'}
						<h2 class="mb-4 mt-10 text-xl font-bold tracking-tight text-zinc-100">
							<span class="mr-2 text-green-500">#</span>{block.text}
						</h2>
					{:else if block.type === 'paragraph'}
						<p class="my-5 text-sm leading-8 text-zinc-400 sm:text-[15px]">{block.text}</p>
					{:else if block.type === 'list'}
						<ul class="my-5 space-y-3 text-sm leading-7 text-zinc-400 sm:text-[15px]">
							{#each block.items as item}
								<li class="flex gap-3">
									<span class="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-green-600"></span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					{:else if block.type === 'code'}
						<div class="my-6 overflow-hidden rounded-lg border border-zinc-800 bg-black">
							<div class="border-b border-zinc-900 px-4 py-2 text-[10px] uppercase text-zinc-700">
								{block.language}
							</div>
							<pre class="overflow-x-auto p-4 text-xs leading-6 text-green-400"><code>{block.code}</code></pre>
						</div>
					{:else if block.type === 'callout'}
						<aside
							class="my-7 border-l-2 border-green-600 bg-zinc-950 px-5 py-4 text-sm leading-7 text-zinc-400"
						>
							{block.text}
						</aside>
					{/if}
				{/each}
			</div>
		</article>

		<nav class="flex items-center justify-between border-t border-zinc-800 py-8 text-xs">
			<a href={`${base}/blog`} class="text-zinc-500 hover:text-green-400">← 所有文章</a>
			<a href={`${base}/`} class="text-zinc-500 hover:text-green-400">打开 Linux 终端 →</a>
		</nav>
	</main>
</div>
