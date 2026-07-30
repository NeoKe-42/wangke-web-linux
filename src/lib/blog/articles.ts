export type ArticleBlock =
	| { type: 'paragraph'; text: string }
	| { type: 'heading'; text: string }
	| { type: 'list'; items: string[] }
	| { type: 'code'; language: string; code: string }
	| { type: 'callout'; text: string };

export interface BlogArticle {
	slug: string;
	title: string;
	summary: string;
	date: string;
	dateLabel: string;
	readingTime: string;
	tags: string[];
	content: ArticleBlock[];
}

export const articles: BlogArticle[] = [
	{
		slug: 'webvm-cold-start',
		title: '把 WebVM 冷启动从“等待”变成可测量的问题',
		summary:
			'记录 WangKe Web Linux 如何定位首次命令卡顿，并通过磁盘块持久缓存、并行加载和真实冷启动测量逐步优化。',
		date: '2026-07-30',
		dateLabel: '2026 年 7 月 30 日',
		readingTime: '8 分钟',
		tags: ['WebVM', 'CheerpX', 'Service Worker', 'Performance'],
		content: [
			{
				type: 'paragraph',
				text: 'WangKe Web Linux 是一个完全运行在浏览器里的 Debian 环境。它没有远程 SSH 服务器：CheerpX 在客户端把 x86 指令实时翻译为 WebAssembly，根文件系统则从 GitHub Pages 按需读取。'
			},
			{
				type: 'callout',
				text: '优化的原则很简单：不伪造命令结果，不替换 Linux，不预下载整个磁盘，也不把等待偷偷挪到 Shell 提示符之前。'
			},
			{ type: 'heading', text: '症状：第一次慢，第二次快' },
			{
				type: 'paragraph',
				text: '最初的测量非常典型：free -h 第一次约 1.425 秒，第二次约 0.024 秒；df -h 第一次约 0.960 秒，第二次约 0.015 秒。这种数量级差异说明终端渲染不是主因，真正的成本来自首次磁盘块读取和首次 JIT。'
			},
			{
				type: 'code',
				language: 'bash',
				code: 'time free -h\ntime free -h\n\ntime df -h\ntime df -h'
			},
			{ type: 'heading', text: '第一步：只缓存真正访问过的磁盘块' },
			{
				type: 'paragraph',
				text: 'GitHubDevice 将 ext2 镜像读取为 128 KB 分块。Service Worker 对分块、对应的 .meta 文件以及镜像目录的 index.list 使用 cache-first，但不会扫描或预取整张磁盘。'
			},
			{
				type: 'list',
				items: [
					'缓存命中时直接返回已经补齐 COOP、COEP、CORP 响应头的 Response。',
					'缓存未命中时走真实网络，并且只保存 HTTP 200、response.ok、非 opaque 的响应。',
					'登录、Tailscale、中继和其他动态请求不会进入磁盘缓存。',
					'网络失败时，如果相同磁盘块已经存在于 Cache Storage，VM 仍可继续读取。'
				]
			},
			{ type: 'heading', text: '第二步：让缓存理解镜像版本' },
			{
				type: 'paragraph',
				text: '每次 Actions 构建的镜像名包含日期和 run ID。页面在创建 GitHubDevice 前会把当前镜像 URL 通知 Service Worker。检测到新名称后，旧镜像分块和过期 index.list 会被清理，同一镜像的普通刷新则保留缓存。'
			},
			{
				type: 'code',
				language: 'text',
				code: 'wangke_debian_20260730_30535539190.ext2\n└─ wangke_debian_20260730_30535539190.ext2.c000000.txt'
			},
			{ type: 'heading', text: '第三步：优化真正的启动关键路径' },
			{
				type: 'paragraph',
				text: '早期版本在显示提示符之前运行常用命令。这样能让第一次手动执行变快，却会延长用户看到 Shell 的时间。最终版本删除了所有命令预热，让 /bin/bash --login 直接启动。'
			},
			{
				type: 'paragraph',
				text: '与此同时，CheerpX 远程运行时开始加载的时间被提前，并与镜像版本检查并行；页面还会提前连接运行时 CDN。模拟启动日志也不再逐行 sleep，因此不会阻塞真实 VM。'
			},
			{ type: 'heading', text: '线上结果与仍然存在的限制' },
			{
				type: 'list',
				items: [
					'磁盘加载开始时间从一次观测中的约 2.98 秒提前到约 1.48 秒。',
					'Linux 创建从约 4.10 秒提前到约 2.73 秒。',
					'控制台连接从约 9.78 秒缩短到约 8.00 秒。',
					'crossOriginIsolated 与 SharedArrayBuffer 保持可用，真实 Bash 输入不受影响。'
				]
			},
			{
				type: 'paragraph',
				text: '全新浏览器里的首次命令依然可能很慢，因为它必须真实下载此前没有访问过的文件系统块，并完成对应的 x86→WebAssembly JIT。持久缓存解决的是重复访问；它无法让第一次网络传输凭空消失。'
			},
			{
				type: 'callout',
				text: '性能优化最重要的不是隐藏等待，而是明确它发生在哪一层，并确保每一次改动都能被真实测量。'
			}
		]
	},
	{
		slug: 'browser-native-linux',
		title: '这个 Linux 终端为什么不需要服务器',
		summary:
			'从页面输入到 Linux 系统调用，快速了解 WebAssembly JIT、ext2 按需加载和浏览器持久写入层如何协作。',
		date: '2026-07-29',
		dateLabel: '2026 年 7 月 29 日',
		readingTime: '5 分钟',
		tags: ['Linux', 'WebAssembly', 'Architecture'],
		content: [
			{
				type: 'paragraph',
				text: '打开 WangKe Web Linux 时，浏览器没有连接一台远程 Linux 主机。内核兼容层、x86 用户态程序、终端输入输出和持久文件系统都在本地标签页中协作。'
			},
			{ type: 'heading', text: '一条命令经历了什么' },
			{
				type: 'list',
				items: [
					'xterm.js 接收键盘输入并把字符交给 CheerpX 控制台。',
					'Bash 是 ext2 镜像里的真实 32 位 Linux 程序。',
					'CheerpX 将需要执行的 x86 代码实时翻译为 WebAssembly。',
					'程序访问尚未加载的文件时，GitHubDevice 才请求对应磁盘块。',
					'标准输出通过自定义控制台回到 xterm.js。'
				]
			},
			{
				type: 'code',
				language: 'text',
				code: 'Keyboard → xterm.js → CheerpX console → Bash\n                                   ↓\nCache Storage ← GitHubDevice ← ext2 chunks'
			},
			{ type: 'heading', text: '只读基础镜像与可写覆盖层' },
			{
				type: 'paragraph',
				text: 'GitHub Pages 上的 ext2 分块始终是只读的。用户对系统做出的修改写入浏览器 IndexedDB 中的 OverlayDevice。两层组合后，对 Linux 来说仍然是一块正常的可写磁盘。'
			},
			{
				type: 'paragraph',
				text: '因此“恢复系统”只需要清空写入覆盖层，而“清除磁盘缓存”删除的是已经下载的只读分块。两个操作解决不同问题，也不会互相冒充。'
			},
			{ type: 'heading', text: '浏览器安全边界' },
			{
				type: 'paragraph',
				text: 'CheerpX 需要 SharedArrayBuffer，因此页面必须处于跨源隔离状态。GitHub Pages 无法自定义这些响应头，项目使用 Service Worker 为响应补齐 COOP、COEP 和 CORP，同时保留重定向处理。'
			},
			{
				type: 'callout',
				text: '这是一个真实执行 Linux 程序的浏览器虚拟环境，而不是用 JavaScript 模拟几个命令输出的终端皮肤。'
			}
		]
	}
];

export function findArticle(slug: string): BlogArticle | undefined {
	return articles.find((article) => article.slug === slug);
}
