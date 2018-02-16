// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

//import ArcsUtils from '../../app-shell/lib/arcs-utils.js';
import AppShell from '../../app-shell/app-shell.js';

import Xen from '../../components/xen/xen.js';

class ExtensionAppShell extends AppShell {
  _onConfig(e, config) {
    super._onConfig(e, config);

    if (config.key == 'launcher') {
      config.soloPath = '../web/launcher.manifest';
    }

    this._setState({config});
  }

  /*
  async _fetchManifestList() {
    let manifests = await ManifestTools.fetchManifestList();
    if (this._config.additionalManifests) {
      this._config.additionalManifests.forEach(manifest => {
        manifests.includes(manifest) || manifests.push(manifest);
        manifests.remotes.includes(manifest) || manifests.remotes.push(manifest);
      });
    }

    this._setState({
      remotes: manifests.remotes,
      exclusions: manifests.exclusions
    });
    return manifests;
  }

  async _start(config) {
    await super._start(config);
    var appshell = this;

    window.addEventListener('message', event => {
      easLog(`received event ${event.data.method} from ${event.source}`,
          event.data, config);
      if (event.source != window || event.data.method != 'injectArcsData') {
        return;
      }

      // TODO(smalls) Should these be replaced with Transformation
      // particles?
      let dataByType = deduplicate(flatten(filter(event.data.entities)));

      if (dataByType['text/x-arcs-manifest']) {
        config.additionalManifests = dataByType['text/x-arcs-manifest'].map(m => m.url);
        easLog('loading additional manifests', config.additionalManifests);
      }

      appshell.reloadManifests().then(() => {
        // gather Arcs schemas for all known types
        var schemas = new Map(Object.entries(dataByType).map( ([fqTypeName, unused]) => {
          let shortTypeName = (fqTypeName.startsWith('http') && fqTypeName.includes('/'))
              ? fqTypeName.split('/').slice(-1)[0] : fqTypeName;
          let schema = arc._context.findSchemaByName(shortTypeName);
          return [fqTypeName, schema];
        }));

        // the meat - create handles, store entities in those.
        Object.entries(dataByType).forEach( ([fqTypeName, entities]) => {
          if (!schemas.has(fqTypeName) || !schemas.get(fqTypeName)) {
            easLog('skipping unknown type '+fqTypeName);
            return;
          }

          const schema = schemas.get(fqTypeName);
          const validSchemaKeys = Object.keys(schema.optional).concat(Object.keys(schema.normative));
          const shortTypeName = schema.name;
          const entityClass = schemas.get(fqTypeName).entityClass();

          // tag product handles with shortlist
          let handleTag = shortTypeName=='Product' ? '#shortlist' : '#'+shortTypeName;

          var handle = arc._context.newView(
            schema.type.viewOf(),
            'Browser/'+shortTypeName,
            arc.generateID(),
            [handleTag]);

          // There are some fields that don't make sense in arcs, and
          // there are some values that aren't in the right format. Let's
          // fix all that up.
          let filteredEntities = entities.map(entity => Object.entries(entity)
              .filter(entry => validSchemaKeys.includes(entry[0]))
              .reduce((result,current) => {
                let key = current[0];

                // do some basic filtering on values.
                // TODO(smalls) as we discover more cases that need this,
                // let's pull this out into something more maintanable.
                let value;
                if (key=='name' && Array.isArray(current[1])) {
                  value = current[1][0];
                } else {
                  value = current[1];
                }

                result[key] = value;
                return result;
              }, {})
          );

          // For Products, populate shipDays if it's not already done.
          if (shortTypeName=='Product') {
            let shipDays = 5 + Math.floor(Math.random()*5);
            filteredEntities.forEach(entity => {
              if (!entity.hasOwnProperty('shipDays')) {
                  entity['shipDays']=shipDays++;
              }
            });
          }

          filteredEntities.forEach(entity => handle.store({id: arc.generateID(), rawData: entity}));
          easLog(`stored entities of type ${fqTypeName}`, filteredEntities);
        });
      });
    }, false);

    // Request injection of data from the extension.
    // This must be after the reloadManifests() call above - before then
    // we end up in race conditions (lots of errors about uninitialized
    // handles) because the callback is called before Arcs is initialized
    // (after this method, _start() returns).
    window.postMessage({method: 'pleaseInjectArcsData'}, '*');
  }
  */
}
ExtensionAppShell.log = Xen.Base.logFactory('ExtensionAppShell', '#2277a8');
customElements.define('extension-app-shell', ExtensionAppShell);
