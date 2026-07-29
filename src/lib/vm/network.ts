import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Networking for the VM goes through a Tailscale relay (the same mechanism
 * used by WebVM): the emulated Linux gets a real TCP/IP stack (lwIP) and an
 * IP on your tailnet. With an exit node advertised on the tailnet, the VM can
 * also reach the public internet. ICMP (ping) is not supported; use curl/wget.
 */

export type NetState =
	| 'DISCONNECTED'
	| 'DOWNLOADING'
	| 'LOGINSTARTING'
	| 'LOGINREADY'
	| 'LOGINFAILED'
	| 'CONNECTED'
	| 'IPCOPIED';

export const connectionState = writable<NetState>('DISCONNECTED');
export const currentIp = writable<string | null>(null);
export const exitNode = writable(false);

let authKey: string | undefined;
let controlUrl: string | undefined;
if (browser) {
	const params = new URLSearchParams(window.location.hash.slice(1));
	authKey = params.get('authKey') || undefined;
	controlUrl = params.get('controlUrl') || undefined;
}

export const dashboardUrl: string | null = controlUrl
	? null
	: 'https://login.tailscale.com/admin/machines';

let resolveLogin: ((url: string) => void) | null = null;
let rejectLogin: ((reason: unknown) => void) | null = null;
let loginPromise = newLoginPromise();

function newLoginPromise(): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		resolveLogin = resolve;
		rejectLogin = reject;
	});
}

function loginUrlCb(url: string): void {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			throw new Error('Invalid Tailscale login URL scheme');
		}
		connectionState.set('LOGINREADY');
		resolveLogin?.(parsed.href);
	} catch (e) {
		connectionState.set('LOGINFAILED');
		rejectLogin?.(e);
		loginPromise = newLoginPromise();
	}
}

function stateUpdateCb(state: number): void {
	// 6 = Running in the Tailscale state machine.
	if (state === 6) connectionState.set('CONNECTED');
}

interface NetMap {
	self: { addresses: string[] };
	peers: Array<{ exitNode?: boolean }>;
}

function netmapUpdateCb(map: NetMap): void {
	currentIp.set(map.self.addresses[0] ?? null);
	if (map.peers.some((p) => p.exitNode)) exitNode.set(true);
}

/** Handed to CheerpX.Linux.create(); matches its NetworkInterface shape. */
export const networkInterface = {
	authKey,
	controlUrl,
	loginUrlCb,
	stateUpdateCb,
	netmapUpdateCb
};

/** Resolves with the Tailscale login URL once the VM requests a login. */
export async function startLogin(): Promise<string> {
	connectionState.set('LOGINSTARTING');
	return await loginPromise;
}

export async function copyIp(): Promise<void> {
	const ip = await new Promise<string | null>((resolve) => {
		const unsub = currentIp.subscribe(resolve);
		unsub();
	});
	if (!ip) return;
	await navigator.clipboard.writeText(ip);
	connectionState.set('IPCOPIED');
	setTimeout(() => connectionState.set('CONNECTED'), 2000);
}
