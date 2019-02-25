import '../../lib/build/pouchdb.js';
import '../../../build/runtime/storage/pouchdb/pouchdb-provider.js';
import '../../lib/build/firebase.js';
import '../../../build/runtime/storage/firebase/firebase-provider.js';
//import '../../configuration/whitelisted.js';

import {Xen} from '../../lib/xen.js';
const params = (new URL(document.location)).searchParams;
const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);
window.debugLevel = Xen.Debug.level = logLevel;

import {Utils} from '../../lib/utils.js';
//import {RamSlotComposer} from '../../lib/ram-slot-composer.js';
import {App} from './app.js';

const elt = (container, tag, props) => container.appendChild(Object.assign(document.createElement(tag), props));

const msg = msg => elt(document.body, 'div', {innerHTML: msg});

const addRow = (tableId, key, cols) => {
  const table = document.querySelector(`#${tableId} tbody`);
  const html = cols.map(msg => `<td>${msg}</td>`).join('');
  const node = elt(table, 'tr', {innerHTML: html});
  node.id = key;
};

const callback = (change, dt) => {
  console.log(change, `${dt}ms`);
  if (change.add) {
    const data = change.add.rawData;
    addRow('arcs', data.key, [data.key, data.description]);
    //msg(`add: ${change.add.rawData.description}`);
  } else if (change.remove) {
    const data = change.remove.rawData;
    const node = document.querySelector(`#${data.key}`);
    node.style.backgroundColor = '#FFC8C8';
    //msg(`remove: ${change.remove.rawData.description}`);
  }
};

// run
(async () => {
  try {
    // configure arcs environment
    Utils.init('../../..');
    // create a composer configured for node
    //const composer = new RamSlotComposer();
    // run app
    //window.arc = await App(composer);
    await App(callback);
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
})();
