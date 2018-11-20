import resolve from 'rollup-plugin-node-resolve';
import multiEntry from 'rollup-plugin-multi-entry';
import ignore from 'rollup-plugin-ignore';

import pkg from './package.json';
import path from 'path';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';

export default [{
  input: ['runtime/ts-build/runtime.js', 'runtime/ts-build/keymgmt/manager.js', 'shell/apps/remote-planning/interface.js'],
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
},
  {
    input: ['runtime/ts/keymgmt/manager.ts'],
    output: [
      {
        file: pkg.browser,
        format: 'esm',
      }
    ],
    plugins: [
      typescript(
        {
          tsconfig: 'tsconfig.json'
        }),
      ignore(['whatwg-fetch']),
      {
        resolveId: (importee, importer) => {
          if (importee.includes('-node.js')) {
            return path.resolve(path.dirname(importer), importee.replace('-node.js', '-web.js'));
          }
          // if nothing is returned, we fall back to default resolution
        }
      }, 
      resolve(),
      commonjs(),
      multiEntry()
    ]
  }];
