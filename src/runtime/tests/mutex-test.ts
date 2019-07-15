/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Mutex} from '../mutex.js';

describe('Mutex', () => {
  const delay = async (ms: number) => new Promise(r => setTimeout(r, ms));

  it('correctly calculates lock status', async () => {
    const mutex = new Mutex();

    assert.isFalse(mutex.locked, 'unlocked before beginning');
    
    // Simulate two simultaneous sections
    const lock1 = mutex.acquire();
    assert.isFalse(mutex.locked, 'unlocked after acquiring lock1');
    
    const lock2 = mutex.acquire();
    assert.isFalse(mutex.locked, 'unlocked after acquiring lock2');

    const release1 = await lock1;
    assert.isTrue(mutex.locked, 'locked after acquiring release1');

    release1();
    assert.isFalse(mutex.locked, 'unlocked releasing lock1');

    const release2 = await lock2;
    assert.isTrue(mutex.locked, 'locked after acquiring release2');

    release2();
    assert.isFalse(mutex.locked, 'unlocked after releasing all locks');
  });

  it('correctly executes many concurrent tasks', async () => {
    const mutex = new Mutex();
    const results: string[] = [];
    
    const runTask = async (name: string, startDelay: number, critDelay: number) => {
      results.push(name + ' begin');
      await delay(startDelay);
      results.push(name + ' requesting mutex');

      const release = await mutex.acquire();
      try {
        results.push(name + ' acquired mutex');
        await delay(critDelay);
      } finally {
        release();
        results.push(name + ' released mutex');
      }
    };

    await Promise.all([runTask('a', 10, 100),
                       runTask('b', 10, 100),
                       runTask('c', 5, 200),
                       runTask('d', 10, 100)]);

    assert.isFalse(mutex.locked, 'is not locked upon completion');
    assert.sameOrderedMembers(results, [
      'a begin',
      'b begin',
      'c begin',
      'd begin',
      'c requesting mutex',
      'c acquired mutex',
      'a requesting mutex',
      'b requesting mutex',
      'd requesting mutex',
      'c released mutex',
      'a acquired mutex',
      'a released mutex',
      'b acquired mutex',
      'b released mutex',
      'd acquired mutex',
      'd released mutex'
    ]);
  });
});

    
