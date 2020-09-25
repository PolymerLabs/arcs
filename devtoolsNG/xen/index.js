import './elements/inspector/data-explorer.js';

const {logElt, opsByStoreElt, de} = window; // extract DOM elements

de.object = {Raw: true, RawStoreMessage: true, StoreSyncMessage: true, StoreMessage: true};
de.addEventListener('object-change', e => {
  console.log(e);
});

const dom = (tag, props, parent) => parent.appendChild(Object.assign(document.createElement(tag), props));
const createUi = (object, container) => dom('data-explorer', {object, expand: true}, container || logElt);

const entries = [];

const addRawEntry = function(raw) {
  const entry = processRawEntry(raw);
  entries.push(entry);
  createUi({msg: entry}, logElt);
  populateCollatedStoreEntries();
}

const processRawEntry = (rawEntry) => {
  let data = rawEntry;
  try {
    data = JSON.parse(rawEntry);
  } catch(x) {
    //
  }
  return data;
}

const populateCollatedStoreEntries = () => {
  opsByStoreElt.object = collateStoreMessages(entries);
}

const collateStoreMessages = entries => {
  let data = entries.map(entry => entry.kind === 'StoreMessage' ? entry : null);
  data = data.filter(e => Boolean(e));
  const compare = (a, b) => a.message.id - b.message.id;
  data = data.sort(compare);
  data = data.map(entry => ({
    id: entry.message.id,
    operations: entry.message.operations
  }));
  let results = {};
  data.forEach(entry => {
    const id = `id[${entry.id}]`;
    const group = results[id] || (results[id] = []);
    delete entry.id;
    group.push(entry);
  });
  return results;
};

(async () => {
  const websocket = new WebSocket('ws://localhost:12345');
  websocket.onmessage = msg => {
    addRawEntry(msg.data);
  }
  websocket.onerror = e => {
    console.log('No connection found');
  };
  websocket.onclose = e => {
    console.log(`Websocket closing. ${e}`);
    addRawEntry(`Web Socket is Closed, try restarting the Arc.`);
  }
})();
