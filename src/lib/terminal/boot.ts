import type { Terminal } from '@xterm/xterm';

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

let bootStart = 0;

export function resetBootClock(): void {
	bootStart = performance.now();
}

/** dmesg-style timestamp using the real elapsed time since boot started. */
export function bootStamp(): string {
	const seconds = (performance.now() - bootStart) / 1000;
	return `[${seconds.toFixed(6).padStart(11, ' ')}]`;
}

/** Types the simulated boot log line by line. */
export async function playBootLog(
	term: Terminal,
	lines: string[],
	lineDelayMs = 200
): Promise<void> {
	resetBootClock();
	for (const line of lines) {
		term.writeln(line);
		await sleep(lineDelayMs + Math.random() * 150);
	}
}

/** Writes a real status line (actual elapsed time) while the VM loads. */
export function writeStatus(term: Terminal, message: string): void {
	term.writeln(`${bootStamp()} ${message}`);
}
