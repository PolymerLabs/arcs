/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Client} from './systrace-clients.js';

const getGlobalScope = () => {
  return [self, window, global, {}].find(
      element => typeof element !== 'undefined');
};

export const getExternalTraceApis = () => {
  return getGlobalScope().ExternalTraceApis;
};

export const delegateExternalTraceApis = port => {
  const gs = getGlobalScope();
  if (!gs.ExternalTraceApis && port) {
    gs.SystemTraceApis = new class extends Client {
      asyncTraceBegin(...args) {
        port.asyncTraceBegin(...args);
      }
      asyncTraceEnd(...args) {
        port.asyncTraceEnd(...args);
      }
    }();
  }
};
