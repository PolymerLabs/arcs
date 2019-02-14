const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  target: 'node',
  mode: 'none',
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false, // Note `mangle.properties` is `false` by default.
        }
      }),
    ],
  },
  //devtool: 'source-map',
  entry: {
    shell: `./node.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `dist/`)
  },
  module: {
    rules: [{
      test: /\.mjs$/,
      type: 'javascript/auto',
    }]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // build/worker.js needs the node version of this file
      /platform/,
      resource =>  resource.request = resource.request.replace(/-web/, `-node`)
    )
  ],
  externals: {
    leveldown: 'require("leveldown")'
  }
};
