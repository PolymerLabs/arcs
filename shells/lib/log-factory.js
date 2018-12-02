import {Debug} from '../../modalities/dom/components/xen/xen-debug.js';
export const logFactory = Debug.level < 1 ? () => () => {} : (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
