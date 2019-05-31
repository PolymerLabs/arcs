/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {dynamicScript} from './dynamic-script-web.js';
import * as tf from '../../node_modules/@tensorflow/tfjs';

const TF_VERSION = '1.1.2';

/** Dynamically loads and returns the `tfjs` module. */
export const requireTf = async () => {
  if (!window['tf']) {
    await dynamicScript(`https://unpkg.com/@tensorflow/tfjs@${TF_VERSION}/dist/tf.min.js?module`);
  }
  return window['tf'];
};

export {tf};
