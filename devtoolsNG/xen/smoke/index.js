import '../elements/inspector/data-explorer.js';

const {logElt, opsByStoreElt, de} = window; // extract DOM elements

de.object = {Raw: true, RawStoreMessage: true, StoreSyncMessage: true, StoreMessage: true};
de.addEventListener('object-change', e => {
  console.log(e);
});

const dom = (tag, props, parent) => parent.appendChild(Object.assign(document.createElement(tag), props));
const entry = (object, container) => dom('data-explorer', {object, expand: true}, container || logElt);

let entries;

let i = 0;
const receive = () => {
  const raw = entries[i];
  let data = raw;
  try {
    data = JSON.parse(raw);
  } catch(x) {
    //
  }
  if (typeof data === 'object') {
    data.timestamp = Date.now();
  }
  const kind = data.kind || 'Message';
  delete data.kind;
  entry({[kind]: data});
  //
  if (++i < entries.length) {
    setTimeout(receive, 200 + Math.floor(Math.random()*200));
  }
};

const load = async () => {
  const res = await fetch('./messages_9_10_2020.json');
  const json = await res.json();
  return json;
};

const process = (rawEntries) => {
  return rawEntries.map(raw => {
    // let kind = 'Message';
    let data = raw;
    try {
      data = JSON.parse(raw);
    } catch(x) {
      //
    }
    // if (typeof data === 'object') {
    //   data.timestamp = Date.now();
    //   kind = data.kind;
    //   delete data.kind;
    // }
    //return {[kind || 'Message']: data};
    return data;
  });
};

const collateStoreMessages = entries => {
  let data = entries.map(entry => {
    if (entry.kind === 'StoreMessage') {
      return entry;
    }
    return null;
  });
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
  const raw = await load();
  //
  const entries = process(raw);
  entry(entries, logElt);
  //
  const store = collateStoreMessages(entries);
  entry(store, opsByStoreElt);
  //
  //const display = store;
  //display.forEach(e => entry(e));
  //receive();
})();
