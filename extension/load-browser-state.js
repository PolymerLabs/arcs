// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


async function populateManifestViews(manifest, dataLoader) {

  let views = {}
  for (let k of ['Answer', 'WebPage', 'Question', 'VideoObject', 'Product']) {
    klass = manifest.findSchemaByName(k).entityClass();
    view = manifest.newView(klass.type.viewOf(), k+'View');

    views[k] = view;
  }

  let entities = await dataLoader();
  console.log('data from browser', entities);

  dumpEntities(views, entities);
}

function dumpEntities(views, entityData) {
  
  for (let ei of entityData) {
    let type = ei['@type'].replace(/http[s]?:\/\/schema.org\//, '');
    let view = views[type];
    if (! type in views || ! view) {
      console.log('missing type '+type+'; unable to instantiate entity');
      continue;
    }

    let data = Object.assign({}, ei);
    delete data['@type'];

    // TODO(smalls) - the view should generate these ids
    let id = faux_gid++;

    view.store({
      id,
      rawData: data
    });
  }
}

async function fetchEntities(tab) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(null, {
      method: 'extractEntities',
      args: [
        tab,
      ],
    }, null, resolve);
  });
}
