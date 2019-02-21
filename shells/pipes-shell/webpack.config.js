const path = require('path');
//const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const Visualizer = require('webpack-visualizer-plugin');

module.exports = {
  //target: 'node',
  mode: 'none',
  optimization: {
     minimize: true,
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
    shell: `./web.js`
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
  stats: {
    modulesSort: '!size'
  },
  plugins: [
    new Visualizer({
      filename: '../webpack-stats.html'
    }),
  //   new webpack.NormalModuleReplacementPlugin(
  //     // build/worker.js needs the node version of this file
  //     /platform/,
  //     resource =>  resource.request = resource.request.replace(/-web/, `-node`)
  //   )
  ],
  // externals: [
  //   //'fs'
  // ]
};
