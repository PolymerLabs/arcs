/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {getGlobalScope, getSystemTraceApis, getSystemTraceChannel} from './systrace-helpers.js';

/** Outputs trace messages to JS console */
export const CONSOLE_CLIENT_NAME = 'console';
/** Outputs trace messages to [android.os.Trace]{@link https://developer.android.com/reference/android/os/Trace} */
export const ANDROID_CLIENT_NAME = 'android';
/** Outputs trace messages to DevTools timeline */
export const DEVTOOLS_TIMELINE_CLIENT_NAME = 'devtools_timeline';

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
    console.log(`${Date.now()}: S|${tag}|${cookie}`);
  }

  asyncTraceEnd(tag: string, cookie: number) {
    console.log(`${Date.now()}: F|${tag}|${cookie}`);
  }
}

/**
 * Client: DevTools Timeline marking
 *
 * This client implements more precise performance/latency measurement
 * at both of the main renderer and dedicated workers.
 */
class DevToolsTimelineClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    console.timeStamp(`S|${tag}`);
  }

  asyncTraceEnd(tag: string, cookie: number) {
    console.timeStamp(`F|${tag}`);
  }
}

/**
 * Client: Android Arcs Tracing
 *
 * This client implement more vague performance/latency measurement
 * at dedicated workers due to the overhead of passing messages from workers
 * to the main renderer and also at the main renderer as there is only single
 * JavaBridge thread handling all trace messages in a fifo queue at the browser
 * process.
 */
class AndroidClient extends Client {
  asyncTraceBegin(tag: string, cookie: number) {
    // Don't assign getSystemTraceApis().XXX to a local object due to the error:
    // java bridge method can't be invoked on a non injected object
    if (getSystemTraceApis().asyncTraceBegin) {
      ((...args) => getSystemTraceApis().asyncTraceBegin(...args))(
          tag, cookie);
    }
  }

  asyncTraceEnd(tag: string, cookie: number) {
    if (getSystemTraceApis().asyncTraceEnd) {
      ((...args) => getSystemTraceApis().asyncTraceEnd(...args))(
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
    (): (typeof Client & {new (...args): Client}) | undefined => {
      let clientClass = undefined;
      switch (getSystemTraceChannel()) {
        case CONSOLE_CLIENT_NAME:
          clientClass = ConsoleClient;
          break;
        case DEVTOOLS_TIMELINE_CLIENT_NAME:
          clientClass = DevToolsTimelineClient;
          break;
        case ANDROID_CLIENT_NAME:
          clientClass = AndroidClient;
          break;
        default:
          break;
      }
      // Allows overriding client for testing if specified.
      return getGlobalScope().systemTraceClientClassOverride || clientClass;
    };
