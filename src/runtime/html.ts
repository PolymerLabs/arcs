// no-op html tagged template literal useful for hinting code-tools (e.g. highlighters)
// that a string is html e.g html`<span>text</span>`
export const html = (strings, ...values) => (strings[0] + values.map((v, i) => v + strings[i + 1]).join('')).trim();
