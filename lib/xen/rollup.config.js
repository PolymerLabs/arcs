import {terser} from 'rollup-plugin-terser';

export default {
  input: 'xen-async.js',
  treeshake: false,
  output: {
    name: 'Xen',
    file: 'dist/xen.js',
    format: 'umd',
    plugins: [terser({output: {comments: false}})]
  }
};
