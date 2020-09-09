import url from 'url';
import path from 'path';

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

  // Prohibit importing from another module's internal directory.
  if (parent && parent.startsWith('file:///') && specifier.includes('/internal/')) {
    const parentFile = parent.substr(7);  // 7 == len('file://')
    const parentDir = path.dirname(parentFile);

    // If the parent is '<path>/src/module/tests/file.js', the root is '<path>/src/module';
    // otherwise the root is just the parent dir itself.
    const root = (path.basename(parentDir) === 'tests') ? path.dirname(parentDir) : parentDir;
    const target = path.resolve(parentDir, specifier);

    // Temporary logging to help debug Windows builds...
    console.log('parent     =', parent);
    console.log('specifier  =', specifier);
    console.log('parentFile =', parentFile);
    console.log('parentDir  =', parentDir);
    console.log('root       =', root);
    console.log('target     =', target);
    console.log();

    if (!target.startsWith(root)) {
      throw new Error(`cannot access internal file '${target}' from location '${parentFile}'`);
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
