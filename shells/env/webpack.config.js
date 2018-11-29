const path = require('path');

module.exports = {
  mode: 'none', //'production',
  optimization: {
    minimize: true
  },
  //devtool: 'source-map',
  entry: {
    arcs: './source/arcs.js',
    worker: './source/worker.js'
  },
  output: {
    //libraryTarget: 'commonjs',
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
  }
};
