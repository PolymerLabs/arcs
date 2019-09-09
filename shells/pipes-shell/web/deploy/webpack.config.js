/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
//const Visualizer = require('webpack-visualizer-plugin');

module.exports = {
  mode: 'none',
  //target: 'node',
  //devtool: 'source-map',
  optimization: {
     minimize: false,
     //minimize: true,
     minimizer: [
       new TerserPlugin({
         terserOptions: {
          mangle: false, // Note `mangle.properties` is `false` by default.
        }
      })
    ]
  },
  entry: {
    shell: `../web.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `dist/`)
  },
  module: {
    rules: [{
      test: /\.mjs$/,
      type: 'javascript/auto'
    }]
  },
  stats: {
    modulesSort: '!size',
    //maxModules: 300,
    //exclude: false,
    //excludeModules: false
  },
  plugins: [
    // new Visualizer({
    //   filename: '../webpack-stats.html'
    // })
    new webpack.NormalModuleReplacementPlugin(
      // use deployment configuration
      /paths.js/,
      resource =>  resource.request = './deploy/source/paths.js'
    )
  ]
};
