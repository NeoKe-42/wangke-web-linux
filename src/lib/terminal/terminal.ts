import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export const MONO_FONT =
	'ui-monospace, "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';

export interface TerminalHandle {
	term: Terminal;
	fit: () => void;
	destroy: () => void;
}

export function defaultFontSize(): number {
	return window.innerWidth < 640 ? 12 : 14;
}

export function createTerminal(el: HTMLElement): TerminalHandle {
	const term = new Terminal({
		cursorBlink: true,
		convertEol: true,
		fontFamily: MONO_FONT,
		fontSize: defaultFontSize(),
		fontWeight: 400,
		fontWeightBold: 700,
		scrollback: 5000,
		theme: {
			background: '#0c0c0c',
			foreground: '#e6e6e6',
			cursor: '#4ade80',
			selectionBackground: '#3f3f46'
		}
	});

	const fitAddon = new FitAddon();
	term.loadAddon(fitAddon);
	term.loadAddon(new WebLinksAddon());
	term.open(el);
	fitAddon.fit();

	// Ctrl+Shift+C copies the current selection (paste is handled natively by
	// the browser through xterm's hidden textarea: Ctrl+Shift+V / right-click).
	term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
		if (e.type === 'keydown' && e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
			const selection = term.getSelection();
			if (selection) {
				void navigator.clipboard?.writeText(selection).catch(() => undefined);
			}
			e.preventDefault();
			return false;
		}
		return true;
	});

	return {
		term,
		fit: () => {
			try {
				fitAddon.fit();
			} catch {
				// fitting can throw while the element is detached; safe to ignore
			}
		},
		destroy: () => term.dispose()
	};
}
