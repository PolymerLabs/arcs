/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// Debugging is initialized either by /devtools/src/run-init-debug.js, which is
// injected by the devtools extension content script in the browser env,
// or used directly when debugging nodeJS.
// This is why data needs to be referenced via a global object.

let root = typeof window === 'object' ? window : global;

root._arcDebugRegistry = root._arcDebugRegistry || {
  arcList: [],
  debug: false
};

let registry = root._arcDebugRegistry;

function initDebug() {
  if (registry.debug) return {};
  let preExistingArcs = registry.arcList.length > 0;
  for (let arc of registry.arcList) {
    arc.initDebug();
  }
  delete registry.arcList;
  registry.debug = true;
  return {preExistingArcs};
}

function registerArc(arc) {
  if (registry.debug) {
    arc.initDebug();
  } else {
    registry.arcList.push(arc);
  }
}

export {initDebug, registerArc};
