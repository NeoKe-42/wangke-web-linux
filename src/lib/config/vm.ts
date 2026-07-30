import type { VmConfig } from '$lib/vm/types';

const env = import.meta.env;

function parseStringArray(raw: string | undefined, fallback: string[]): string[] {
	if (!raw) return fallback;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (Array.isArray(parsed)) return parsed.map(String);
	} catch {
		// keep the fallback
	}
	return fallback;
}

const WANGKE_ENV = [
	'HOME=/home/wangke',
	'TERM=xterm-256color',
	'USER=wangke',
	'SHELL=/bin/bash',
	'EDITOR=vim',
	'LANG=C.UTF-8',
	'LC_ALL=C'
];

const OFFICIAL_ENV = [
	'HOME=/home/user',
	'TERM=xterm-256color',
	'USER=user',
	'SHELL=/bin/bash',
	'EDITOR=vim',
	'LANG=en_US.UTF-8',
	'LC_ALL=C'
];

/** Official WebVM Debian image, used when no custom image is configured. */
const OFFICIAL_IMAGE_URL = 'wss://disks.webvm.io/debian_buster_large_permis_fixed_01-06-2026.ext2';

function resolveConfig(): VmConfig {
	const type = env.VITE_DISK_IMAGE_TYPE ?? 'cloud';

	if (type === 'github') {
		// Produced by .github/workflows/deploy.yml from dockerfiles/wangke_debian:
		// the image is split into chunks and hosted next to the app on GitHub Pages.
		return {
			diskImageUrl: env.VITE_DISK_IMAGE_URL || '',
			diskImageType: 'github',
			cmd: env.VITE_VM_CMD || '/bin/bash',
			args: parseStringArray(env.VITE_VM_ARGS, ['--login']),
			opts: {
				env: parseStringArray(env.VITE_VM_ENV, WANGKE_ENV),
				cwd: env.VITE_VM_CWD || '/home/wangke',
				uid: 1000,
				gid: 1000
			},
			cacheId: 'wangke-web-linux-blocks',
			identity: 'wangke'
		};
	}

	if (type === 'bytes') {
		// Locally built image served by the dev/preview server (scripts/build-image.sh).
		return {
			diskImageUrl: env.VITE_DISK_IMAGE_URL || '/custom-disk-images/wangke.ext2',
			diskImageType: 'bytes',
			cmd: env.VITE_VM_CMD || '/bin/bash',
			args: parseStringArray(env.VITE_VM_ARGS, ['--login']),
			opts: {
				env: parseStringArray(env.VITE_VM_ENV, WANGKE_ENV),
				cwd: env.VITE_VM_CWD || '/home/wangke',
				uid: 1000,
				gid: 1000
			},
			cacheId: 'wangke-web-linux-blocks',
			identity: 'wangke'
		};
	}

	// Default: official cloud image. Real Linux, but the user is "user", not "wangke".
	return {
		diskImageUrl: env.VITE_DISK_IMAGE_URL || OFFICIAL_IMAGE_URL,
		diskImageType: 'cloud',
		cmd: '/bin/bash',
		args: ['--login'],
		opts: { env: OFFICIAL_ENV, cwd: '/home/user', uid: 1000, gid: 1000 },
		cacheId: 'wangke-web-linux-blocks',
		identity: 'official'
	};
}

export const vmConfig: VmConfig = resolveConfig();

/** Simulated boot log shown while the real VM is being prepared. */
export const bootLines: string[] = [
	'[    0.000000] Booting WangKe Web Linux',
	'[    0.021381] Initializing WebAssembly runtime',
	'[    0.182734] Loading virtual disk image',
	'[    0.463921] Mounting root filesystem',
	'[    0.812742] Starting terminal service',
	'[    1.025125] System ready'
];

/**
 * Printed only when running on the official fallback image. With the custom
 * wangke image the welcome message is printed by the system itself
 * (/etc/profile.d/00-wangke-welcome.sh inside the image).
 */
export const fallbackIntro: string[] = [
	'',
	'\x1b[1;32mWelcome to WangKe Web Linux\x1b[0m',
	'',
	'This Linux environment runs entirely inside your browser.',
	'No remote SSH server is being used.',
	'',
	'\x1b[33mNote:\x1b[0m no custom image configured - running the official WebVM Debian',
	'image, so you are logged in as "user" instead of "wangke@web-linux".',
	'Build the custom image (see README.md) to get the full wangke',
	'environment with README.txt / projects.txt / papers.txt.',
	'',
	'\x1b[36mTry:\x1b[0m',
	'  ls',
	'  python3',
	'  gcc --version',
	'  vim',
	''
];
