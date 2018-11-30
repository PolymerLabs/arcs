export const logFactory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
