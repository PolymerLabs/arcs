let logLevel = 0;
let g;
if (typeof window !== 'undefined') {
  g = window;
  const params = (new URL(document.location)).searchParams;
  if (params.has('log')) {
    const log = params.get('log');
    logLevel = log === '' ? 2 : (Number(log) || 0);
    console.log(`setting logLevel = ${logLevel}`);
  }
} else if (typeof global !== 'undefined') {
  g = global;
} else {
  g = {};
}
g.logLevel = logLevel;
