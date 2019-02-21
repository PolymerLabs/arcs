let g;
if (typeof window !== 'undefined') {
  g = window;
} else if (typeof global !== 'undefined') {
  g = global;
} else {
  g = {};
}

//const params = (new URL(document.location)).searchParams;
//const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);

g.logLevel = 2;
