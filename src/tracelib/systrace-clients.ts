/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {getExternalTraceApis, getSystemTraceChannel} from './systrace-helpers.js';

const CONSOLE_CLIENT_NAME = 'console';
const ANDROID_CLIENT_NAME = 'android';

/** Abstraction of System Trace Client */
export abstract class Client {
  asyncTraceBegin(tag: string, cookie: number): void {}
  asyncTraceEnd(tag: string, cookie: number): void {}
}

/** Client: JS Console Logging */
class ConsoleClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    console.log(`S|${tag}|${cookie}`);
  }

  asyncTraceEnd(tag: string, cookie: number) {
    console.log(`F|${tag}|${cookie}`);
  }
}

/** Client: Android Arcs Tracing */
class AndroidClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    const api = getExternalTraceApis().asyncTraceBegin;
    if (api) {
      api(tag, cookie);
    }
  }

  asyncTraceEnd(tag: string, cookie: number) {
    const api = getExternalTraceApis().asyncTraceEnd;
    if (api) {
      api(tag, cookie);
    }
  }
}

/**
 * System Trace Client Selector
 * Options:
 *   ${CONSOLE_CLIENT_NAME}: using console.log
 *   ${ANDROID_CLIENT_NAME}: using Android Arcs Tracing APIs
 */
export const getClientClass =
    (): (typeof Client & {new(...args): Client}) | undefined => {
      let clientClass = undefined;
      switch (getSystemTraceChannel()) {
        case CONSOLE_CLIENT_NAME:
          clientClass = ConsoleClient;
          break;
        case ANDROID_CLIENT_NAME:
          clientClass = AndroidClient;
          break;
        default:
          break;
      }
      return clientClass;
    };
