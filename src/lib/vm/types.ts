/** How the root filesystem image is delivered to the VM. */
export type DiskImageType = 'cloud' | 'bytes' | 'github';

/** Which user environment the configured image provides. */
export type VmIdentity = 'wangke' | 'official';

export interface VmOpts {
	env: string[];
	cwd: string;
	uid: number;
	gid: number;
}

export interface VmConfig {
	diskImageUrl: string;
	diskImageType: DiskImageType;
	cmd: string;
	args: string[];
	opts: VmOpts;
	/** IndexedDB name used for the persistent write-overlay cache. */
	cacheId: string;
	identity: VmIdentity;
}

export type VmPhase =
	| 'idle'
	| 'booting'
	| 'loading-disk'
	| 'starting-kernel'
	| 'running'
	| 'error';
