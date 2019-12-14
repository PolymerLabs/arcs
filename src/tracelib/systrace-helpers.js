/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const getGlobalScope = () => {
  if (self !== 'undefined') return self;
  if (window !== 'undefined') return window;
  if (global !== 'undefined') return global;
  return {};
};

export const getExternalTraceApis = () => {
  return getGlobalScope().ExternalTraceApis || {};
};

export const delegateExternalTraceApis = port => {
  const gs = getGlobalScope();
  if (!gs.ExternalTraceApis && port) {
    gs.ExternalTraceApis = new class {
      asyncTraceBegin(...args) {
        port.ExternalTraceBegin(...args);
      }
      asyncTraceEnd(...args) {
        port.ExternalTraceEnd(...args);
      }
    }();
  }
};
