/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FirebaseDriver, FirebaseStorageKey, FirebaseAppCache} from '../storageNG/drivers/firebase.js';
import {firebase} from '../../platform/firebase-web.js';
import {Exists} from '../storageNG/drivers/driver-factory.js';
import {assert} from '../../platform/chai-web.js';

const testUrl = 'arcs-storage-test.firebaseio.com';
const testKey = 'AIzaSyBLqThan3QCOICj0JZ-nEwk27H4gmnADP8';
const testProject = 'firebase-storage-test';

async function resetStorageKeyForTesting(key: FirebaseStorageKey) {
  const app = firebase.initializeApp(key);

  const reference = firebase.database(app).ref(key.location);
  await new Promise(resolve => {
    reference.remove(resolve);
  });

  app.delete();
}

describe('firebase-ng-driver', function() {
  this.timeout(10000);

  it('can write to a new location', async () => {
    const storageKey = new FirebaseStorageKey(testUrl, testProject, testKey, 'foo');
    await resetStorageKeyForTesting(storageKey);
    const driver = new FirebaseDriver<number>(storageKey, Exists.ShouldCreate);
    await driver.init();
    driver.registerReceiver((model: number, version: number) => { assert.fail(); });
    await driver.send(24, 1);

    const output = new FirebaseDriver<number>(storageKey, Exists.ShouldExist);
    await output.init();


    return new Promise((resolve, reject) => {
      output.registerReceiver((model: number, version: number) => {
        assert.equal(model, 24);
        assert.equal(version, 1);
        FirebaseAppCache.stop();
        resolve();
      });
    });
  });

  it('will reject one of two synchronous writes', async () => {
    const storageKey = new FirebaseStorageKey(testUrl, testProject, testKey, 'foo');
    await resetStorageKeyForTesting(storageKey);
    const driver1 = new FirebaseDriver<number>(storageKey, Exists.ShouldCreate);
    await driver1.init();

    const driver2 = new FirebaseDriver<number>(storageKey, Exists.ShouldExist);
    await driver2.init();

    const receivedData = new Promise(async (resolve, reject) => {
      driver2.registerReceiver((model: number, version: number) => {
        assert.equal(model, 13);
        assert.equal(version, 1);
        resolve(); 
      });
    });

    const result = await Promise.all([driver1.send(13, 1), driver2.send(18, 1), receivedData]);
    assert.isTrue(result[0]);
    assert.isFalse(result[1]);
    FirebaseAppCache.stop(); 
  });
 });
