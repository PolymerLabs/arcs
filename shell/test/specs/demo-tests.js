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

function queryShellUi(selector) {
  return browser.execute(function(selector) {
    const host = document.querySelector('app-shell').shadowRoot.querySelector('shell-ui').shadowRoot;
    return host.querySelector(selector);
  }, selector);
}

async function openNewArc(testTitle, useSolo) {
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
  await browser.pause(2000);
}

describe('demo', function() {
  it('smoke', async function() {
    openNewArc(this.test.fullTitle());
    const title = await browser.title();
    assert.equal(title.value, 'Arcs');
  });
  it.skip('restaurants', async function() {
    const search = `restaurants`;
    const suggestion1 = `[title^="Find restaurants"]`;
    const particle1 = `#webtest-title`;
    const suggestion2 = `[title*="ou are free"]`;
    const particle2 = `[particle-host="Calendar::action"]`;
    //
    openNewArc(this.test.fullTitle());
    browser.waitForVisible('app-shell');
    queryShellUi('input[search]').click().keys(search);
    await browser.waitForExist(suggestion1, 20000);
    browser.click(suggestion1);
    await browser.waitForExist(particle1, 10000);
    browser.click(particle1);
    await browser.waitForExist(suggestion2, 30000);
    browser.click(suggestion2);
    await browser.waitForExist(particle2, 5000);
  });
  it.skip('gifts', async function() {
    const search = `products`;
    const suggestion1 = `[title^="Show products"]`;
    const particle1 = `[particle-host="ItemMultiplexer::item"]`;
    const suggestion2 = `[title^="Check shipping"]`;
    const particle2 = `[particle-host="Multiplexer::annotation"]`;
    const suggestion3= `[title^="Check manufacturer"]`;
    const suggestion4= `[title^="Find out"]`;
    //
    openNewArc(this.test.fullTitle());
    browser.waitForVisible('app-shell');
    queryShellUi('input[search]').click().keys(search);
    await browser.waitForExist(suggestion1, 20000);
    browser.click(suggestion1);
    await browser.waitForExist(particle1, 10000);
    await browser.waitForExist(suggestion2, 15000);
    browser.click(suggestion2);
    await browser.waitForExist(particle2, 5000);
    await browser.waitForExist(suggestion3, 15000);
    browser.click(suggestion3);
    await browser.waitForExist(suggestion4, 15000);
    browser.click(suggestion4);
  });
});
