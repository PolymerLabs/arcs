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

const lib = '.';

module.exports = {
  mode: 'none',
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  entry: {
    firebase: `${lib}/source/firebase.js`,
    pouchdb: `${lib}/source/pouchdb.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `${lib}/build`)
  }
};
