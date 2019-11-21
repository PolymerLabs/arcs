/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global browser */

const {waitForServer, seconds, waitFor, click, keys, openNewArc, marshalPersona, openArc} = require('../utils.js');

const sleep = s => browser.pause(seconds(s));
const searchFor = text => keys('input[search]', text);
const chooseSuggestion = async name => {
  await click(`[title*="${name}"]`);
};

// TODO(sjmiles): replace this with some WDIO work to
// poll the server until it's up
// TODO(sjmiles): this should not be a faux-test, there must
// be a proper way to make mocha wait for a condition
describe('wait for server', () => {
  it('is not a test', async function() {
    // wait for ALDS to finish init ...
    console.log('waiting for ALDS to spin up...');
    await waitForServer();
    console.log('...done');
  });
});

const persona = `${marshalPersona('volatile')}`;

const client = {
  receive(json) {
    console.log(`\nclient.receive::${json}\n`);
  }
};

const startPipeShell = async () => {
  const pipesShellUrl = `shells/pipes-shell/web`;
  const urlParams = [`test`, `log`];
  const url = `${pipesShellUrl}/?${urlParams.join('&')}`;
  await browser.url(url);
  console.warn('installing DeviceClient')
  return browser.execute(client => {
    console.warn('installing DeviceClient')
    window.DeviceClient = client;
  }, client);
}

const waitForPipeMessage = async msg => {
  return await waitFor(`[title="${msg}"]`);
}

describe(`pipes-shell (${persona})`, () => {
  it('pipes-shell starts', async function() {
    console.log(`running "${this.test.fullTitle()}"`);
    await startPipeShell(persona);
    await waitForPipeMessage(`{'message':'ready'}`);
  });
});

describe.skip(`WASM (${persona})`, () => {
  it('loads Wasm Particle', async function() {
    console.log(`running "${this.test.fullTitle()}"`);
    await openArc(persona);
    await searchFor('Integration');
    await chooseSuggestion('Wasm Integration Test');
    // TODO(sjmiles): allowing time to settle, we should prefer explicit signal
    await sleep(5);
    await waitFor(`[particle="HelloWorldParticle"]`);
  });
});

['pouchdb', 'firebase'].forEach(async storageType => {
  describe.skip('demo ' + storageType, () => {
    it('restaurants', async function() {
      await openNewArc(this.test.fullTitle(), storageType);
      await searchFor(`restaurants`);
      await chooseSuggestion('Find restaurants');
      //
      // TODO(sjmiles): disabling this bit for now for KISS
      // TODO(sjmiles): rendering tiles takes forever to stabilize
      //await browser.pause(seconds(10));
      //const restaurantItem = `#webtest-title`;
      //await click(restaurantItem);
      //
      // TODO(sjmiles): bug in description generator means we don't know
      // if first letter is "Y" or "y", also you could be "free" or "busy"
      await chooseSuggestion('ou are');
      const calendarNode = `[particle="Calendar"]`;
      await waitFor(calendarNode);
    });
    it('gifts', async function() {
      await openNewArc(this.test.fullTitle(), storageType);
      await searchFor(`products`);
      await chooseSuggestion('Create shopping list');
      await chooseSuggestion('Buy gifts');
      await chooseSuggestion('Check manufacturer');
      await chooseSuggestion('Find out');
    });
  });

  const persona = `${marshalPersona(storageType)}-persistence`;
  describe.skip(`persistence (${persona})`, () => {
    it('persists BasicProfile arc', async function() {
      console.log(`running "${this.test.fullTitle()}"`);
      await openArc(persona);
      await searchFor('profile');
      await chooseSuggestion('Edit user profile');
      // TODO(sjmiles): allowing time to settle, we should prefer explicit signal
      await sleep(5);
      await openArc(persona);
      // TODO(sjmiles): put something more obvious on this node
      const arcTileNode = 'div[chip]';
      await waitFor(arcTileNode);
    });
  });

});

