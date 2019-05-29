/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicScript} from '../platform/dynamic-script-web.js';
import {Reference, ResourceManager as rmgr} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';

const log = logFactory('tfjs-service');

const TF_VERSION = '1.1.2';
const tfUrl = `https://unpkg.com/@tensorflow/tfjs@${TF_VERSION}/dist/tf.min.js?module`;

/** Dynamically loads and returns the `tfjs` module. */
export const requireTf = async () => {
  if (!window['tf']) {
    await dynamicScript(tfUrl);
  }
  return window['tf'];
};

// Map some TF API to a Service
const dispose = ({reference}) => rmgr.dispose(reference);

Services.register('tfjs', {
  dispose,
});

