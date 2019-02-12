const path = require('path');
//const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const lib = '.';

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          //ecma: undefined,
          //warnings: false,
          //parse: {},
          //compress: {},
          mangle: false, // Note `mangle.properties` is `false` by default.
          //module: false,
          //output: null,
          //toplevel: false,
          //nameCache: null,
          //ie8: false,
          //keep_classnames: undefined,
          //keep_fnames: false,
          //safari10: false,
        }
      }),
    ],
  },
  devtool: 'source-map',
  entry: {
    shell: `./depends.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `dist/`)
  }
};
