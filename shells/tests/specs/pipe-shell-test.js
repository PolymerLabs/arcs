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

const {waitForServer, waitFor, marshalPersona} = require('../utils.js');

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

