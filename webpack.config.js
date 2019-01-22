const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    worker: './shells/lib/source/worker.js',
    firebase: './shells/lib/source/firebase.js',
    pouchdb: './shells/lib/source/pouchdb.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'shells/lib/build')
  },
  plugins: [
      // build/worker.js needs the node version of this file
      new webpack.NormalModuleReplacementPlugin(
      /sourcemapped-stacktrace-web.js/,
      resource =>  resource.request = resource.request.replace(/web/, `node`)
    )
  ]
};
