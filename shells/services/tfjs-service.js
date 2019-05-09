/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicImport} from './dynamic-import.js';
import {Services} from '../../build/runtime/services.js';

import {requireTfjs} from './tfjs.js';
requireTfjs().then(tfjs => console.warn(tfjs));

const requireMl5 = async () => {
  if (!window.tfjs) {
    await dynamicImport('./tfjs.js');
  }
};
