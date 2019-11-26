/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const SELECTOR_URL_PARAMETER = 'systrace';
const CONSOLE_CLIENT_NAME = 'console';
const ANDROID_CLIENT_NAME = 'android';

abstract class Client {
  asyncTraceBegin(tag: string, cookie: number): void {}
  asyncTraceEnd(tag: string, cookie: number): void {}
}

class ConsoleClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    console.log(`S|${tag}|${cookie}`);
  }

  asyncTraceEnd(tag: string, cookie: number) {
    console.log(`F|${tag}|${cookie}`);
  }
}

// TODO: Client: using Android Arcs Tracing APIs

/**
 * System Trace Client Selector
 * Query the target class of system tracing client by ${SELECTOR_URL_PARAMETER}
 * ${SELECTOR_URL_PARAMETER}:
 *   ${CONSOLE_CLIENT_NAME}: using console.log
 *   ${ANDROID_CLIENT_NAME}: using Android Arcs Tracing APIs
 */
export const clientClass: typeof Client = (() => {
  const params = new URLSearchParams(location.search);
  let clz = class extends Client {};
  switch (params.get(SELECTOR_URL_PARAMETER)) {
    case CONSOLE_CLIENT_NAME:
      clz = ConsoleClient;
      break;
    default:
      break;
  }
  return clz;
})();
