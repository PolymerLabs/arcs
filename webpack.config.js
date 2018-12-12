const webpack = require('webpack');
const path = require('path');
const glob = require('glob');

const config = {
  mode: 'development',
  devtool: 'sourcemap',

  entry: {
    'worker-entry': './shell/source/worker-entry.js',
    'ArcsLib': './shell/source/ArcsLib.js',
    'Tracelib': './shell/source/Tracelib.js',
  },
  output: {
    path: path.resolve(__dirname, 'shell/build'),
    filename: '[name].js'
  }
};

const configShells = {
  mode: 'development',
  devtool: 'sourcemap',

  entry: {
    'worker': './shells/env/source/worker.js',
    'arcs': './shells/env/source/arcs.js',
  },
  output: {
    path: path.resolve(__dirname, 'shells/env/build'),
    filename: '[name].js'
  }
};

module.exports = [config, configShells];
