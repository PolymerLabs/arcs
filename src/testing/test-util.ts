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
 *   assert.match(cc.log[0], /Error parsing/);
 *
 * To simply discard all console logging:
 *
 *   const testObject = ConCap.silence(() => new NoisyTestObject(...));
 *
 * Both sync and async functions can be wrapped; in the latter case you just need to
 * await the capture/silence call.
 */
export class ConCap {
  // tslint:disable: no-any
  result: any;
  log: any[][] = [];
  warn: any[][] = [];
  error: any[][] = [];
  dir: any[][] = [];
  private save: (() => void)[];
  private restore: () => void;
  // tslint:enable: no-any

  private constructor() {
    this.save = [console.log, console.warn, console.error, console.dir];
    this.restore = () => [console.log, console.warn, console.error, console.dir] = this.save;
  }

  /**
   * Captures the arguments for any calls to console.log and its friends while fn is being executed.
   * If fn is synchronous, returns a ConCap with `result` holding fn's return value.
   * If fn is asynchronous, returns a Promise with a ConCap whose `result` holds the awaited fn return.
   * In both cases, the log/warn/etc fields hold whatever `fn` wrote to the corresponding console function.
   */
  // tslint:disable-next-line: no-any
  static capture(fn: () => any): any {
    const cc = new ConCap();
    console.log   = (...args) => cc.log.push([...args]);
    console.warn  = (...args) => cc.warn.push([...args]);
    console.error = (...args) => cc.error.push([...args]);
    console.dir   = (...args) => cc.dir.push([...args]);

    const result = fn();
    if (result && typeof result.then === 'function') {
      let resolve;
      const wrap = new Promise(r => resolve = r);
      result.then(value => {
        cc.result = value;
        cc.restore();
        resolve(cc);
      });
      return wrap;
    } else {
      cc.result = result;
      cc.restore();
      return cc;
    }
  }

  /** Discards all calls to console.log and its friends. Returns the result of fn. */
  static silence<T>(fn: () => T): T {
    const cc = new ConCap();
    console.log = console.warn = console.error = console.dir = () => {};

    const result = fn();
    cc.restore();
    return result;
  }

  /** Returns a function that will invoke `fn` and capture anything logged to the console. */
  // tslint:disable-next-line: no-any
  static wrapCaptured<T, Args extends any[]>(fn: (...args: Args) => any): (...args: Args) => any {
    return (...args: Args) => ConCap.capture(() => fn(...args));
  }

  /** Returns a function that will invoke `fn` without logging anything to the console. */
  // tslint:disable-next-line: no-any
  static wrapSilent<T, Args extends any[]>(fn: (...args: Args) => any): (...args: Args) => any {
    return (...args: Args) => ConCap.silence(() => fn(...args));
  }
}
