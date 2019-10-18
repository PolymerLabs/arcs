/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// This file is intended to hold elements
// to be customized to your environment.
// Someday it may turn into a config file.

// This function is structured to someday be
// refactored into a config file with regexes.
export const requestPathRewriter = (path: string) => [
  // Serve wasm modules from /bazel-bin/
  (path: string) => path.replace(/^(?!\/bazel-bin\/)\/(.*\.wasm)$/, '/bazel-bin/$1'),
  // Add new path rewriters here.
  // ...
].reduce((path, rewriter) => rewriter(path), path);
