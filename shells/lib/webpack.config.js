const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    //arcslib: './source/arcslib.js',
    worker: './source/worker.js',
    firebase: './source/firebase.js',
    pouchdb: './source/pouchdb.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build')
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // build/worker.js needs the node version of this file
      /sourcemapped-stacktrace-web.js/,
      resource =>  resource.request = resource.request.replace(/web/, `node`)
    )
  ]
};
