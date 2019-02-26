const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
//const Visualizer = require('webpack-visualizer-plugin');

module.exports = {
  mode: 'none',
  //target: 'node',
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
    shell: `../web.js`
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
    //modulesSort: '!size',
    maxModules: 300,
    exclude: false,
    excludeModules: false
  },
  plugins: [
    // new Visualizer({
    //   filename: '../webpack-stats.html'
    // })
  ]
};
