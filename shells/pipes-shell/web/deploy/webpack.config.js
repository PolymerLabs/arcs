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
//const Visualizer = require('webpack-visualizer-plugin');

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

const settings = performanceSettings;
//const settings = debugSettings;

module.exports = {
  ...settings,
  // all-purpose settings
  devtool: 'source-map',
  entry: {
    shell: `../web.js`,
    worker: '../../../lib/source/worker.js'
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
    excludeModules: true
  },
  plugins: [
    // new Visualizer({
    //   filename: '../webpack-stats.html'
    // })
    new webpack.NormalModuleReplacementPlugin(
      // use deployment configuration
      /paths.js/,
      resource =>  resource.request = './deploy/source/paths.js'
    ),
    new webpack.NormalModuleReplacementPlugin(
      // worker.js needs the node version of this file
      /sourcemapped-stacktrace-web.js/,
      resource =>  resource.request = resource.request.replace(/web/, `node`)
    )
  ]
};
