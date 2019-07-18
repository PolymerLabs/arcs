/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const smokeTest = async bus => {
  const enqueue = (tests, delay) => {
    if (tests.length) {
      console.warn(`bus(ish): starting new task...(remaining ${tests.length})`);
      (tests.shift())();
      // wait a bit before starting the test,
      // to simulate (more) serial task requests
      // and make it possible to read the console.
      // (should work in parallel also)
      setTimeout(() => enqueue(tests, delay), delay);
    }
  };
  //
  enqueue([
    // nothing to do
  ], 500);
};
