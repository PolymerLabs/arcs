const path = require('path');
const webpack = require('webpack');

const lib = './shells/lib';

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    worker: `${lib}/source/worker.js`,
    firebase: `${lib}/source/firebase.js`,
    pouchdb: `${lib}/source/pouchdb.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `${lib}/build`)
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // build/worker.js needs the node version of this file
      /sourcemapped-stacktrace-web.js/,
      resource =>  resource.request = resource.request.replace(/web/, `node`)
    ),
    new webpack.NormalModuleReplacementPlugin(
       // build/worker.js needs the stub version of this file
       /devtools-channel-web.js/,
       resource =>  resource.request = resource.request.replace(/web/, `stub`)
    )
  ]
};
