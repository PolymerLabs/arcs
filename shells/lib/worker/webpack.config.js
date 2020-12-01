/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const debugSettings = {
  // debug settings
  mode: 'none',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        sourceMap: true,
        parallel: true,
        extractComments: true,
        terserOptions: {
          mangle: false
        }
      })
    ]
  }
};

const performanceSettings = {
  mode: 'production',
  performance: {
    hints: false
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        sourceMap: true,
        parallel: true,
        extractComments: true,
        terserOptions: {
          mangle: false
        }
      })
    ]
  }
};

//const settings = performanceSettings;
const settings = debugSettings;

module.exports = {
  ...settings,
  // all-purpose settings
  devtool: 'source-map',
  entry: {
    worker: `./src/worker.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `./dist`)
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // worker.js needs the node version of this file
      /sourcemapped-stacktrace-web.js/,
      resource =>  resource.request = resource.request.replace(/web/, `node`)
    ),
    new webpack.NormalModuleReplacementPlugin(
       // worker.js needs the stub version of this file
       /devtools-channel-web.js/,
       resource =>  resource.request = resource.request.replace(/web/, `stub`)
    )
  ]
};
