const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'none',
  target: 'node',
  //devtool: 'source-map',
  optimization: {
     minimize: true,
     minimizer: [
       new TerserPlugin({
         terserOptions: {
          mangle: false, // Note `mangle.properties` is `false` by default.
        }
      }),
    ],
  },
  entry: {
    shell: `../node.js`
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, `dist/`)
  },
  module: {
    rules: [{
      test: /\.mjs$/,
      type: 'javascript/auto',
    }]
  },
  stats: {
    modulesSort: '!size',
    //maxModules: 300,
    //exclude: false,
    //excludeModules: false
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      // use -node versions from platform/*
      /platform/,
      resource =>  resource.request = resource.request.replace(/-web/, `-node`)
    ),
    new webpack.NormalModuleReplacementPlugin(
      // use deployment configuration
      /paths.js/,
      resource =>  resource.request = './deploy/source/paths.js'
    )
  ],
};
