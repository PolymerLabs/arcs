/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicScript} from '../platform/dynamic-script-web.js';

const modelUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@1.0.0';

export const requireMobilenet = async () => {
  if (!window['mobilenet']) {
    await dynamicScript(modelUrl);
  }
  return window['mobilenet'];
};
