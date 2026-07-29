import { writable } from 'svelte/store';
import type { VmPhase } from '$lib/vm/types';

export const vmPhase = writable<VmPhase>('idle');
export const vmDetail = writable<string | null>(null);
export const vmError = writable<string | null>(null);
export const diskActive = writable(false);
export const settingsOpen = writable(false);

/** One-shot modifier state driven by the on-screen mobile keys. */
export const stickyCtrl = writable(false);
export const stickyAlt = writable(false);
