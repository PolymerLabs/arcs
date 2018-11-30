const path = require('path');

module.exports = {
  mode: 'none',
  optimization: {
    minimize: true
  },
  devtool: 'source-map',
  entry: {
    arcs: './source/arcs.js',
    worker: './source/worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
  }
};
