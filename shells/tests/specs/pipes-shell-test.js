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

const persona = marshalPersona('volatile');

describe(`pipes-shell (${persona})`, () => {
  console.log(`running "pipes-shell"`);
  // TODO(sjmiles): replace this with some WDIO work to
  // poll the server until it's up
  // TODO(sjmiles): this should not be a faux-test, there must
  // be a proper way to make mocha wait for a condition
  it('waits for ALDS', async function() {
    console.log('waiting for ALDS to spin up...');
    await waitForServer();
    console.log('...done');
  });
  it('passes smoke test', async function() {
    await startPipeShell(persona);
  });
  it('passes notification test', async function() {
    await waitForPipeOutput(`dinner reservations`);
  });
  it('passes WASM test', async function() {
    await waitForPipeOutput(`'template':'<b>Hello, world!</b>'`);
  });
});

const startPipeShell = async () => {
  const pipesShellUrl = `shells/pipes-shell/web`;
  const urlParams = [`test`];
  const url = `${pipesShellUrl}/?${urlParams.join('&')}`;
  await browser.url(url);
  console.warn('installing DeviceClient');
  return browser.execute(client => {
    console.warn('installing DeviceClient');
    window.DeviceClient = client;
  }, client);
};

const client = {
  receive(json) {
    console.log(`\nclient.receive::${json}\n`);
  }
};

const waitForPipeOutput = async msg => {
  return await waitFor(`[title*="${msg}"]`);
};
