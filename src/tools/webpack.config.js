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

const buildDir = './build/tools';

// Package Tools CLIs into self contained .js files to be used with plain node.
module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    'bundle-cli': `${buildDir}/bundle-cli.js`
  },
  optimization: {
    minimize: true
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `../../dist/tools`)
  },
  externals: ['bufferutil', 'utf-8-validate'],
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // Replace all the web variants with node ones.
      /\/platform\/.*-web.js$/,
      resource =>  resource.request = resource.request.replace(/-web.js$/, '-node.js')
    )
  ]
};
