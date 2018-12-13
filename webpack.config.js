const path = require('path');

const config = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    arcslib: './shells/lib/source/arcslib.js',
    worker: './shells/lib/source/worker.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'shells/lib/build')
  }
};

module.exports = [config];
