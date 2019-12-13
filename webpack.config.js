/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const path = require('path');
const webpack = require('webpack');
const CircularDependencyPlugin = require('circular-dependency-plugin');

const lib = './shells/lib';

// Decrease MAX_CYCLES every time you eliminate circular dependencies from the codebase.
const MAX_CYCLES = 0;
let numCyclesDetected = 0;

module.exports = {
  mode: 'none',
  optimization: {
    minimize: false
  },
  devtool: 'source-map',
  entry: {
    worker: `${lib}/source/worker.js`
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
    ),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      onStart() {
        numCyclesDetected = 0;
      },
      onDetected({module, paths, compilation}) {
        numCyclesDetected++;
        compilation.warnings.push(new Error(paths.join(' -> ')));
      },
      onEnd({compilation}) {
        if (numCyclesDetected > MAX_CYCLES) {
          compilation.errors.push(new Error(
            `cycle detection: ${numCyclesDetected} cycles exceeds configured limit of ${MAX_CYCLES}`
          ));
        } else if (numCyclesDetected > 0) {
          compilation.warnings.unshift(new Error(
            `cycle detection: ${numCyclesDetected} cycles found (configured limit is ${MAX_CYCLES})`
          ));
        }
      },
      allowAsyncCycles: false,
      // failOnError should replace the onStart(), onDetected() and onEnd() methods
      // once we we eliminate circular dependencies.
      // failOnError: true,
    })
  ]
};
