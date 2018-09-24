/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global browser */
/* eslint-disable no-invalid-this */

const assert = require('assert');
const seconds = 1000;

function openNewArc(testTitle, useSolo) {
  // clean up extra open tabs
  const openTabs = browser.getTabIds();
  browser.switchTab(openTabs[0]);
  openTabs.slice(1).forEach(tabToClose => {
    browser.close(tabToClose);
  });
  // setup url params
  let firebaseKey = new Date().toISOString() + testTitle;
  firebaseKey = firebaseKey.replace(/\W+/g, '-').replace(/\./g, '_');
  console.log(`running test "${testTitle}" with firebaseKey "${firebaseKey}"`);
  const urlParams = [
    `testFirebaseKey=${firebaseKey}`,
    `log`,
    'user=*selenium'
  ];
  if (useSolo) {
    urlParams.push(`solo=${browser.options.baseUrl}/artifacts/canonical.manifest`);
  }
  // note - baseUrl (currently specified on the command line) must end in a
  // trailing `/`, and this must not begin with a preceding `/`.
  // `browser.url()` will prefix its argument with baseUrl, and avoiding a
  // doubling `//` situation avoids some bugs.
  browser.url(`shell/apps/web/?${urlParams.join('&')}`);
}

describe('Smoke', function() {
  it('loads', async function() {
    openNewArc(this.test.fullTitle());
    const title = await browser.title();
    assert.equal(title.value, 'Arcs');
    //initTestWithNewArc(this.test.fullTitle());
    //wait(5*seconds);
    //assert.equal('Arcs', browser.getTitle());
  });
});
