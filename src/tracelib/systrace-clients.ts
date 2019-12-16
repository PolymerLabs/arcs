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

/**
 * Client: JS Console Logging
 *
 * This client implements more precise performance/latency measurement
 * at both of the main renderer and dedicated workers.
 */
class ConsoleClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    console.log(`S|${tag}|${cookie}|${Date.now()}`);
  }

  asyncTraceEnd(tag: string, cookie: number) {
    console.log(`F|${tag}|${cookie}|${Date.now()}`);
  }
}

/**
 * Client: Android Arcs Tracing
 *
 * This client implement more coarse performance/latency measurement
 * at dedicated workers due to the overhead of passing messages from workers
 * to the main renderer and also at the main renderer due to the singleton
 * JavaBridge thread waiting for messages at the browser process.
 */
class AndroidClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    if (getExternalTraceApis().asyncTraceBegin) {
      ((...args) => getExternalTraceApis().asyncTraceBegin(...args))(
          tag, cookie);
    }
  }

  asyncTraceEnd(tag: string, cookie: number) {
    if (getExternalTraceApis().asyncTraceEnd) {
      ((...args) => getExternalTraceApis().asyncTraceEnd(...args))(
          tag, cookie);
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
