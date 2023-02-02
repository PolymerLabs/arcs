/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const CHANNEL_URL_PARAMETER = 'systrace';

/** Gets current global execution context */
export const getGlobalScope = () => {
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  // tslint:disable-next-line:no-any
  return {} as any;
};

/** Gets System Trace APIs i.e. android.os.Trace.* */
export const getSystemTraceApis = () => {
  return getGlobalScope().SystemTraceApis || {};
};

/**
 * Delegates the location of the System Trace APIs to ${SystemTraceApis}
 * property in the current global execution context.
 *
 * In main renderer context, ${SystemTraceApis} is delegated by external
 * implementations i.e. addJavascriptInterface at Android Webview.
 * In worker context, ${SystemTraceApis} is delegated by PECInnerPort.
 *
 * The contract of ${SystemTraceApis}:
 *   asyncTraceBegin(...args): start a new asynchronous system tracing
 *   asyncTraceEnd(...args): stop the asynchronous system tracing
 *
 * @param {string} port The port/location to talk to System Trace APIs
 */
export const delegateSystemTraceApis = port => {
  const gs = getGlobalScope();
  if (!gs.SystemTraceApis && port) {
    gs.SystemTraceApis = new class {
      asyncTraceBegin(...args) {
        port.SystemTraceBegin(...args);
      }
      asyncTraceEnd(...args) {
        port.SystemTraceEnd(...args);
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
  const location = getGlobalScope().location;
  let urlChannel;
  if (location) {
    const params = new URLSearchParams(location.search);
    urlChannel = params.get(CHANNEL_URL_PARAMETER);
  }
  return urlChannel || getGlobalScope().systemTraceChannel || '';
};
