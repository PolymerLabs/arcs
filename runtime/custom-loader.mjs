import url from 'url';

export function resolve(specifier, parent, resolve) {
  if (!/^[.\/]/.test(specifier)) {
    if (!parent.includes('-node.js') && !parent.includes('node_modules')) {
      throw new Error(`cannot load ${specifier} from ${parent}`);
    }
    return resolve(specifier, parent);
  }
  if (specifier.includes('-web.js')) {
    specifier = specifier.replace('-web.js', '-node.js');
  }
  const resolved = new url.URL(specifier, parent);
  return {
    url: resolved.href,
    format: 'esm'
  };
}
