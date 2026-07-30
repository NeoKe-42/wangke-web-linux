import type { Terminal } from '@xterm/xterm';

let bootStart = 0;

export function resetBootClock(): void {
	bootStart = performance.now();
}

/** dmesg-style timestamp using the real elapsed time since boot started. */
export function bootStamp(): string {
	const seconds = (performance.now() - bootStart) / 1000;
	return `[${seconds.toFixed(6).padStart(11, ' ')}]`;
}

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const BRIGHT = '\x1b[1;37m';
const RESET = '\x1b[0m';

/** Cyan timestamp + bright message, like a colored dmesg line. */
function colorize(line: string): string {
	const m = line.match(/^(\[[^\]]*\])(.*)$/);
	if (!m) return line;
	return `${CYAN}${m[1]}${RESET}${BRIGHT}${m[2]}${RESET}`;
}

/**
 * Writes the simulated boot summary without delaying the real VM startup.
 * Actual elapsed-time status lines are emitted by writeStatus() below.
 */
export function playBootLog(term: Terminal, lines: string[]): void {
	resetBootClock();
	for (const line of lines) term.writeln(colorize(line));
}

/** Writes a real status line (actual elapsed time) while the VM loads. */
export function writeStatus(term: Terminal, message: string): void {
	term.writeln(`${CYAN}${bootStamp()}${RESET} ${GREEN}${message}${RESET}`);
}
