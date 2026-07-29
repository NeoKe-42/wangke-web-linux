/// <reference types="@sveltejs/kit" />

declare namespace App {}

interface ImportMetaEnv {
	/** Disk image URL or (in github mode) the image base name hosted next to the app. */
	readonly VITE_DISK_IMAGE_URL?: string;
	/** One of: cloud | bytes | github. Defaults to cloud. */
	readonly VITE_DISK_IMAGE_TYPE?: string;
	/** Executable to run, e.g. /bin/bash. */
	readonly VITE_VM_CMD?: string;
	/** JSON array of arguments, e.g. ["--login"]. */
	readonly VITE_VM_ARGS?: string;
	/** JSON array of environment variables, e.g. ["HOME=/home/wangke","TERM=xterm"]. */
	readonly VITE_VM_ENV?: string;
	/** Initial working directory inside the VM. */
	readonly VITE_VM_CWD?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
