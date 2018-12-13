const path = require('path');

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    arcslib: './source/arcslib.js',
    worker: './source/worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
  }
};
