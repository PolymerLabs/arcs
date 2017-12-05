/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import path from "path";

let sources = [
  "demo/demo.js",
  "vr-demo/vr-demo.js"
]

export default sources.map(s => new Object({
  entry: `./browser/${s}`,
  output: {
    path: path.join(__dirname, "/browser/build/", path.dirname(s)),
    filename: path.basename(s),
  },
  node: {
    fs: 'empty'
  },
  devtool: 'source-map',
  watch: true
}));
