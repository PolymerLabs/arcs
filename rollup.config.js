import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import {resolve} from 'path';

export default {
  input: 'runtime/ts-build/runtime.js',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      file: pkg.module,
      format: 'es',
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript({
      typescript: require('typescript'),
    }),
    {
      resolveId: (importee, importer) => {
        if (importee.includes('-web.js')) {
          return resolve('src', importee.replace('-web.js', '-node.js'));
        }
        // if nothing is returned, we fall back to default resolution
      }
    }
  ]
};
