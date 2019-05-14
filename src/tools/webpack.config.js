const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

const buildDir = './build/tools';

// Package Tools CLIs into self contained .js files to be used with plain node.
module.exports = {
  target: 'node',
  mode: 'production',
  entry: {
    'bundle-cli': `${buildDir}/bundle-cli.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `../../dist/tools`)
  },
  externals: [nodeExternals()],
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // Replace all the web variants with node ones.
      /\/platform\/.*-web.js$/,
      resource =>  resource.request = resource.request.replace(/-web.js$/, '-node.js')
    )
  ]
};
