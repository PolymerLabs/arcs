import url from 'url';

export function resolve(specifier, parent, resolve) {
  if (!/^[./]/.test(specifier)) {
    try {
      return resolve(specifier, parent);
    } catch (e) {
      if (!parent.includes('-node.js') && !parent.includes('node_modules')) {
        throw new Error(`cannot load ${specifier} from ${parent}. Only node_modules can be loaded using non-filesystem paths.`);
      } else {
        throw e;
      }
    }
  }
  if (!/\.(js|mjs)$/.test(specifier)) {
    if (/build/.test(parent)) {
      const resolved = new url.URL(specifier, parent || 'file:///');
      return {
        url: resolved.href + '.js',
        format: 'esm'
      };
    }
    const resolved = new url.URL(specifier, parent);
    return {
      url: resolved.href,
      format: 'cjs'
    };
  }
  if (specifier.includes('-web.js')) {
    specifier = specifier.replace('-web.js', '-node.js');
  }
  const resolved = new url.URL(specifier, parent || 'file:///');
  let result = {
    url: resolved.href,
    format: 'esm'
  };
  return result;
}
