/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/chai-web.js';

export async function assertThrowsAsync(fn: Function, msg?: string);
export async function assertThrowsAsync(fn: Function, errType: Function | RegExp, msg?: string);
export async function assertThrowsAsync(fn: Function, errType: RegExp, regExp: RegExp);

export async function assertThrowsAsync(fn: Function, ...args): Promise<void> {
  try {
    await fn();
    assert.throws(() => undefined, ...args);
  } catch (e) {
    assert.throws(() => {throw e;}, ...args);
  }
}

/**
 * Capture or disable console logging.
 *
 * To capture expected console output and verify that specific phrases were logged:
 *
 *   const cc = ConCap.capture(() => testAnErrorCase('parse failure'));
 *   assert.equals(cc.result, 'this holds whatever testAnErrorCase returned');
 *   assert.match(cc.log[0][0], /Error parsing/);
 *
 * To simply discard all console logging:
 *
 *   const testObject = ConCap.silence(() => new NoisyTestObject(...));
 *
 * Both sync and async functions can be wrapped; in the latter case you just need to
 * await the capture/silence call.
 */
// tslint:disable: no-any
export class ConCap {
  result: any;
  log: any[][] = [];
  warn: any[][] = [];
  error: any[][] = [];
  dir: any[][] = [];
  private save: (() => void)[];

  /**
   * Captures the arguments for any calls to console.log and its friends while fn is being executed.
   * If fn is synchronous, returns a ConCap with `result` holding fn's return value.
   * If fn is asynchronous, returns a Promise with a ConCap whose `result` holds the awaited fn return.
   * In both cases, the log/warn/etc fields hold whatever `fn` wrote to the corresponding console function.
   */
  static capture(fn: () => any): any {
    const cc = new ConCap();
    console.log   = (...args) => cc.log.push([...args]);
    console.warn  = (...args) => cc.warn.push([...args]);
    console.error = (...args) => cc.error.push([...args]);
    console.dir   = (...args) => cc.dir.push([...args]);
    return cc.go(true, fn);
  }

  /** Discards all calls to console.log and its friends. Returns the result of fn. */
  static silence(fn: () => any): any {
    const cc = new ConCap();
    console.log = console.warn = console.error = console.dir = () => {};
    return cc.go(false, fn);
  }

  /** Returns a function that will invoke `fn` and capture anything logged to the console. */
  static wrapCaptured<T, Args extends any[]>(fn: (...args: Args) => any): (...args: Args) => any {
    return (...args: Args) => ConCap.capture(() => fn(...args));
  }

  /** Returns a function that will invoke `fn` without logging anything to the console. */
  static wrapSilent<T, Args extends any[]>(fn: (...args: Args) => any): (...args: Args) => any {
    return (...args: Args) => ConCap.silence(() => fn(...args));
  }

  private constructor() {
    this.save = [console.log, console.warn, console.error, console.dir];
  }

  private restore() {
    [console.log, console.warn, console.error, console.dir] = this.save;
  }

  private go(capture: boolean, fn: () => any): any {
    const result = fn();
    if (result && typeof result.then === 'function') {
      let resolve;
      let reject;
      const wrap = new Promise((rs, rj) => [resolve, reject] = [rs, rj]);
      result.then(value => {
        this.result = value;
        this.restore();
        resolve(capture ? this : value);
      }, err => {
        this.restore();
        reject(err);
      });
      return wrap;
    } else {
      this.result = result;
      this.restore();
      return capture ? this : result;
    }
  }
}
// tslint:enable: no-any
