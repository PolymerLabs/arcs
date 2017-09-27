// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let arc;
let ams;
let amKey;
let manifest;
async function init() {
  manifest = Arcs.Manifest.parse(`
    import 'https://polymerlabs.github.io/arcs-cdn/dev/entities/Thing.manifest'
    import 'https://polymerlabs.github.io/arcs-cdn/dev/entities/Product.manifest'`,
    {fileName: 'inline',  path: 'inline', loader: new Arcs.BrowserLoader(chrome.runtime.getURL('/'))});
  arc = new Arcs.Arc({id: 'browser/'+chrome.runtime.id, context: manifest});
  ams = new ArcMetadataStorage({arc: arc});
  await ams.init().then(values => {
    amKey = values;
    console.log('initialized extension connection with amkey '+amKey, arc);
  });
}

init();

async function localExtractEntities(tab) {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tab.id, {file: 'page-extractor.js'}, result => {
      if (chrome.runtime.lastError) {
        // Can't access chrome: or other extension pages.
        reject(chrome.runtime.lastError);
      } else {
        chrome.tabs.sendMessage(tab.id, {method: 'extractEntities', args: []}, null, resolve);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
      }
    });
  });
}

async function remoteExtractEntities(tab) {
  let pageEntity = {
    '@type': 'http://schema.org/WebPage',
    url: tab.url,
  };
  if (tab.title) {
    pageEntity.name = tab.title;
  }
  if (tab.favIconUrl) {
    pageEntity.image = tab.favIconUrl;
  }
  return [pageEntity];
}

async function extractEntities(tab) {
  try {
    if (tab.local) {
      return await localExtractEntities(tab);
    } else {
      return await remoteExtractEntities(tab);
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method == 'extractEntities') {
    extractEntities(...request.args).then(x => sendResponse(x));
    return true;
  }
});



function updateBadge(tabId, response) {
  
  // TODO(smalls) - currently, we're using the presence of entities from the
  // page as a proxy for an interesting arc being available. In the future we
  // should run the suggestinator for a more comprehensive view.

  chrome.browserAction.setBadgeBackgroundColor({
    color: response ? '#aedfff' : [0,0,0,0],
    tabId: tabId
  });
  chrome.browserAction.setBadgeText({
    text: response ? 'arc' : '',
    tabId: tabId
  });
}

function filterResponse(response) {

  if (!response) return response;

  let ret = response.filter(entity => /^https?:\/\/schema.org\/(Product|Event)$/.test(entity['@type']));
  return ret;
}

function updateArc(tabId, response) {

  if (!response) return;
  console.log('updating tab '+tabId+' with response', response);

  let entities = {};


  manifest.then(m => {
    response.forEach(r => {
      fqTypeName = r['@type'];
      shortTypeName = fqTypeName.split('/')[3];
      delete r['@type'];

      // TODO(smalls) - we need more schema in our Things.manifest
      delete r['offers']; 
      delete r['brand'];

      schema = m.findSchemaByName(shortTypeName);
      if (!schema) {
        console.log('skipping unknown type '+fqTypeName, r);
        return;
      }
      entityClass = schema.entityClass();
      entity = new entityClass(r);

      viewType = new Arcs.Type('list', entityClass.type);

      viewId = 'Browser/'+tabId+'/'+shortTypeName;
      view = arc.createView(viewType, 'Browser tab '+tabId+' type '+shortTypeName,
        viewId, ['wishlist']);

      // need to push entity
      arc.commit([entity]);

      console.log('stored entity in view', view, entity);

      /*
       * TODO(smalls) - either investigate or delete this code.
       
      console.log('commit for entity with id '+entity.id+', identified? '+entity.isIdentified(),
        entity);

      if (!entity.id) {
        console.log('TODO - entities shouldn\'t be identified and missing an id');
        return;
      }

      // This call seems to be optional - entities are getting to firebase,
      // with an id, based on the code above.
      view.store(entity);
      */
    });
  }).then(() => {
    ams.sync({key: amKey});
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  
  if (changeInfo.status && 'complete'==changeInfo.status) {
    // fire a message to content-script.js
    chrome.tabs.sendMessage(tabId, {method: 'extractEntities'}, response => {
      let filteredResponse = filterResponse(response);

      updateArc(tabId, filteredResponse);
      updateBadge(tabId, filteredResponse);
    });
  } else {
    // clear out our flair
    updateBadge(tabId, null);

    // for now, we're letting tabs age out of firebase (rather than
    // proactively clearing them).
  }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    if (request.method!='entitiesFromFullPage') {
      return;
    }

    updateArc(request.args.tabId, request.args.entities);
    sendResponse({});

    return true;
  }
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    if (request.method!='reInitArcs') {
      return;
    }

    init();
  }
);

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {

    if (request.method!='getAmKey') {
      return;
    }

    sendResponse(amKey);
    return true;
  }

);
