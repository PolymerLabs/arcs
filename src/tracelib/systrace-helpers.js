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

/** Gets current global execution context */
const getGlobalScope = () => {
  if (self !== 'undefined') return self;
  if (window !== 'undefined') return window;
  if (global !== 'undefined') return global;
  return {};
};

/** Gets external Trace APIs i.e. Android Trace.* */
export const getExternalTraceApis = () => {
  return getGlobalScope().externalTraceApis || {};
};

/**
 * Delegates the location of the external Trace APIs to ${externalTraceApis}
 * property in the current global execution context.
 *
 * In main renderer context, ${externalTraceApis} is delegated by external
 * implementations i.e. addJavascriptInterface at Android Webview.
 * In worker context, ${externalTraceApis} is delegated by PECInnerPort.
 *
 * The contract of ${externalTraceApis}:
 *   asyncTraceBegin(...args): start a new asynchronous tracing
 *   asyncTraceEnd(...args): stop the asynchronous tracing
 *
 * @param {string} port The port/location to talk to external APIs
 */
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

/**
 * Gets the system tracing channel if specified.
 * The url parameter ${CHANNEL_URL_PARAMETER} is used in the main renderer
 * context while the ${systemTraceChannel} in current global execution
 * context is used at dedicated workers.
 */
export const getSystemTraceChannel = () => {
  const params = new URLSearchParams(location.search);
  return params.get(CHANNEL_URL_PARAMETER) ||
      getGlobalScope().systemTraceChannel ||
      '';
};
