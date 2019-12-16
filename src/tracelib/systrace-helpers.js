/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const CHANNEL_URL_PARAMETER = 'systrace';

const getGlobalScope = () => {
  if (self !== 'undefined') return self;
  if (window !== 'undefined') return window;
  if (global !== 'undefined') return global;
  return {};
};

export const getExternalTraceApis = () => {
  return getGlobalScope().externalTraceApis || {};
};

export const delegateExternalTraceApis = port => {
  const gs = getGlobalScope();
  if (!gs.externalTraceApis && port) {
    gs.externalTraceApis = new class {
      asyncTraceBegin(...args) {
        port.ExternalTraceBegin(...args);
      }
      asyncTraceEnd(...args) {
        port.ExternalTraceEnd(...args);
      }
    }();
  }
};

export const getSystemTraceChannel = () => {
  const params = new URLSearchParams(location.search);
  return params.get(CHANNEL_URL_PARAMETER) ||
      getGlobalScope().systemTraceChannel ||
      '';
};
