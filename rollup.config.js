import resolve from 'rollup-plugin-node-resolve';
import multiEntry from 'rollup-plugin-multi-entry';
import ignore from 'rollup-plugin-ignore';

import pkg from './package.json';
import path from 'path';

export default {
  input: ['runtime/ts-build/runtime.js', 'runtime/handle.js'],
  output: [
    {
      file: pkg.module,
      format: 'es',
    }
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    ignore(['whatwg-fetch']),
    {
      resolveId: (importee, importer) => {
        if (importee.includes('-web.js')) {
          return path.resolve(path.dirname(importer), importee.replace('-web.js', '-node.js'));
        }
        // if nothing is returned, we fall back to default resolution
      }
    },
    resolve({jsnext: true, modulesOnly: true}),
    multiEntry()
  ]
};
