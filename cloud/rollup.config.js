/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import resolve from 'rollup-plugin-node-resolve';
import multiEntry from 'rollup-plugin-multi-entry';
import ignore from 'rollup-plugin-ignore';

import pkg from './package.json';
import path from 'path';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';

const defaults = {compilerOptions: {declaration: true}};

export default [{
  input: ['../build/runtime/runtime.js',
    '../build/runtime/keymgmt/manager.js',
    '../shells/planner-shell/planner-shell.js'],
  output: [
    {
      file: pkg.main,
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
    resolve({jsnext: true, module: false, modulesOnly: true}),
    commonjs(),
    multiEntry()
  ]
},
  {
    input: ['../src/runtime/webmain.ts'],
    output: [
      {
        file: pkg.browser,
        format: 'esm',
      }
    ],
    plugins: [
      typescript(
        {
          tsConfigDefaults: defaults,
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
      resolve({browser: true}),
      commonjs(),
      multiEntry()
    ]
  }];
