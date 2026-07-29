# WangKe Web Linux

一个**完全运行在浏览器本地**的 Linux 终端网页：打开页面先看到 Linux 风格开机日志，随后进入一个可以真实执行命令的全屏终端。没有远程 SSH 服务器，没有后端，没有数据库——整个 Debian 系统通过 [CheerpX](https://cheerpx.io) 虚拟化引擎（x86 → WebAssembly 实时翻译）在你的浏览器里运行。

基于 [leaningtech/webvm](https://github.com/leaningtech/webvm)（Apache-2.0）二次开发，虚拟机层直接复用 WebVM/CheerpX，界面与工程完全重写。

## 功能

- 全屏深色终端（xterm.js + 等宽字体），顶部状态栏显示 VM 状态、网络状态、磁盘活动，提供重启 / 全屏 / 设置按钮
- 模拟开机日志逐行显示，随后接入**真实的** bash（`ls`、`vim`、`python3`、`gcc` 等全部真实执行）
- 自定义 Debian 镜像：默认用户 `wangke`、主机名 `web-linux`、主目录 `/home/wangke`，预装 bash / coreutils / curl / wget / git / vim / nano / python3 / gcc / make / tree / htop / neofetch，预置 `README.txt`、`projects.txt`、`papers.txt`、`welcome.sh`，登录自动显示欢迎信息
- 支持 Ctrl+C / Ctrl+L / Tab 补全 / 命令历史 / 复制粘贴（Ctrl+Shift+C 复制选区，Ctrl+Shift+V 粘贴）
- 磁盘写入通过 IndexedDB 覆盖层持久化；刷新页面时浏览器会询问是否离开（即是否放弃本次 VM）；设置中有“恢复系统”可清除本地磁盘数据
- 手机端自动显示 Ctrl / Alt / Tab / Esc / 方向键辅助按键（触屏设备生效）
- 镜像加载阶段与 VM 启动状态实时显示；VM 加载失败、磁盘加载失败、浏览器不兼容、网络错误均有明确提示与重试入口
- 网络：通过 Tailscale relay 建立（设置 → 网络 → 登录），配合 exit node 可访问公网

## 技术栈

Svelte 4 + TypeScript + SvelteKit（纯静态输出）+ Vite 5 + xterm.js + Tailwind CSS + `@leaningtech/cheerpx` + Playwright（端到端测试）。

## 快速开始（本地）

要求 Node.js ≥ 18。

```sh
npm install
npm run dev
```

打开终端输出的地址（默认 http://localhost:5173/）。

说明：

- CheerpX 需要 `SharedArrayBuffer`，即跨源隔离（COOP/COEP 响应头）。本地开发时 Vite dev server 已自动带上这些响应头（见 `vite.config.ts` 与 `src/hooks.server.js`），无需任何配置。
- 默认使用 WebVM 官方云端 Debian 镜像（`wss://disks.webvm.io/...`），首次启动需要联网流式加载镜像，用户名是 `user`。要获得 `wangke@web-linux` 完整环境，请构建自定义镜像（见下文）。
- CheerpX 引擎本体在运行时从官方 CDN（`cxrtnc.leaningtech.com`）动态加载，首次运行需要联网。
- WSL 用户注意：在 `/mnt/...`（Windows 挂载盘）下，Vite 的文件监听（inotify）可能不可靠，修改代码后页面若不更新，请重启 `npm run dev`。把项目放在 WSL 原生文件系统（如 `~/...`）下可避免此问题。

## 构建自定义镜像（wangke@web-linux）

镜像由 `dockerfiles/wangke_debian`（i386 Debian）定义，预置文件在 `dockerfiles/home/`（构建前可按需修改 `projects.txt`、`papers.txt`）。

### 方式一：本地构建（需要 Docker + sudo + jq）

```sh
npm run image:build          # 产物：custom-disk-images/wangke.ext2
```

脚本结束后会打印一段 `.env` 内容，按提示创建 `.env` 文件，然后 `npm run dev`，即可以 `bytes` 模式从本地加载自定义镜像。

> WSL 用户：需要在 Docker Desktop 设置中启用 WSL 集成；`mount -o loop` 步骤需要 sudo。

### 方式二：GitHub Actions 自动构建（推荐，部署时自动完成）

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动：

1. 用 `docker build --platform=i386` 构建镜像；
2. 用 `mkfs.ext2 -r 0` + `docker cp` 导出为 `.ext2` 磁盘镜像；
3. 把镜像切分为 128k 小块（`*.ext2.c*.txt`）随站点一起部署——CheerpX 的 `GitHubDevice` 按需拉取小块，不需要一次性下载整个镜像；
4. 构建前端（自动注入 `BASE_PATH` 与镜像参数）并部署到 GitHub Pages。

## 部署到 GitHub Pages

1. 创建仓库（例如 `wangke-web-linux`），推送本项目到 `main` 分支；
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**；
3. 推送（或 Actions 页面手动 Run workflow）。完成后访问：

```
https://<用户名>.github.io/wangke-web-linux/
```

细节说明：

- **base path**：工作流通过 `BASE_PATH=/<仓库名>` 传给 SvelteKit（`svelte.config.js` 中 `kit.paths.base`），子路径部署无需改代码。
- **COOP/COEP 响应头**：GitHub Pages 不能自定义响应头。项目通过 `static/serviceWorker.js` 在浏览器侧注入 COOP/COEP 头（与上游 WebVM 相同的成熟方案）。首次访问会注册 Service Worker 并自动刷新一次页面，之后 `crossOriginIsolated` 生效。注意：必须通过 HTTPS 访问（GitHub Pages 默认提供）；Service Worker 在 HTTP（localhost 除外）下不可用。
- 仅前端改动想快速部署时，可手动触发工作流并勾选 `SKIP_IMAGE_BUILD`，将跳过镜像构建、使用官方云端镜像。
- 镜像大小上限约 950M（Pages 单文件/仓库容量限制），工作流默认分配 900M。

## 环境变量

构建/开发时可通过 `.env` 或 CI 环境覆盖（全部可选）：

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `VITE_DISK_IMAGE_TYPE` | `cloud` / `bytes` / `github` | `cloud` |
| `VITE_DISK_IMAGE_URL` | 镜像地址（github 模式下为镜像基础名） | 官方云端镜像 |
| `VITE_VM_CMD` | 启动命令 | `/bin/bash` |
| `VITE_VM_ARGS` | 参数（JSON 数组） | `["--login"]` |
| `VITE_VM_ENV` | 环境变量（JSON 数组） | 按镜像类型选择 |
| `VITE_VM_CWD` | 初始工作目录 | `/home/wangke` 或 `/home/user` |
| `BASE_PATH` | 部署子路径（仅构建时） | 空 |

## 测试与检查

```sh
npm run check        # svelte-check 全量类型检查（0 错误 0 警告）
npm run build        # 生产构建（输出 build/）
npm run preview      # 本地预览生产构建（自带 COI 响应头）
npm run test:e2e     # Playwright 端到端冒烟测试
```

端到端测试（`tests/e2e/vm.spec.ts`）会在无头 Chromium 中**真实启动 VM** 并执行 `echo $((40+2))`、`uname -s`、`python3 -c "print(6*7)"` 验证命令真实运行，同时验证触屏辅助按键。首次运行需下载 Chromium（`npx playwright install chromium`，装在用户目录，不动全局环境）。

## 已知限制

- `ping`（ICMP）不可用——CheerpX/Tailscale 网络栈限制，连通性请用 `curl`/`wget` 验证。
- 终端窗口大小在 VM 启动时固定；浏览器窗口缩放后 xterm 会自适应重排，但 PTY 尺寸不会随之改变（上游 WebVM 同样行为）。
- 自定义镜像无法在本仓库直接提交（体积大）；本地构建产物位于 `custom-disk-images/`（已被 gitignore）。
- CheerpX 许可：个人探索/使用免费，组织用途需商业授权（见 [CheerpX licensing](https://cheerpx.io/docs/licensing)）。本项目代码为 Apache-2.0。
- iOS Safari 对跨源隔离支持较弱，建议使用桌面版 Chrome / Edge / Firefox / Safari 或 Android Chrome。

## 项目结构

```
├── .github/workflows/deploy.yml   # push main → 构建镜像 → 部署 Pages
├── dockerfiles/
│   ├── wangke_debian              # 自定义 Debian 镜像定义（i386）
│   └── home/                      # 预置到 /home/wangke 的文件与欢迎脚本
├── scripts/build-image.sh         # 本地 docker → ext2 构建脚本
├── custom-disk-images/            # 本地产物目录（gitignore）
├── static/
│   ├── serviceWorker.js           # GitHub Pages 的 COOP/COEP 兼容方案
│   └── login.html                 # Tailscale 登录弹出页
├── src/
│   ├── app.html / app.css / hooks.server.js
│   ├── lib/
│   │   ├── config/vm.ts           # 类型化 VM 配置（cloud/bytes/github 三种模式）
│   │   ├── vm/                    # machine.ts（CheerpX 封装）/ network.ts / types.ts
│   │   ├── terminal/              # terminal.ts（xterm 封装）/ boot.ts（开机日志）
│   │   ├── stores.ts              # 全局状态
│   │   └── components/            # StatusBar / VmTerminal / SettingsDialog / MobileKeys
│   └── routes/                    # SvelteKit 静态路由
├── tests/e2e/vm.spec.ts           # 真实 VM 端到端测试
└── playwright.config.ts
```

## 许可与致谢

- 本项目派生自 [leaningtech/webvm](https://github.com/leaningtech/webvm)，沿用 Apache License 2.0（见 `LICENSE.txt`）。
- 虚拟化引擎：[CheerpX](https://cheerpx.io)（Leaning Technologies）。
- 终端：[xterm.js](https://xtermjs.org)；网络：[Tailscale](https://tailscale.com) relay + lwIP。
