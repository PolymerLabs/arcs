// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import ArcsUtils from '../../app-shell/lib/arcs-utils.js';
import AppShell from '../../app-shell/app-shell.js';

import Xen from '../../components/xen/xen.js';

import '../../apps/chrome-extension/chrome-data.js';

class ExtensionAppShell extends AppShell {
  /*
  constructor() {
    super();

    this._attachListener();
  }
  */

  get template() {
    return `${super.template}
        <chrome-data arc='{{arc}}' on-data="_onData"></chrome-data>
      `;
  }

  _onConfig(e, config) {
    super._onConfig(e, config);

    // TODO(smalls) is this the right? a better one might be to key off of
    // how this shell was invoked (new-tab, popup, etc) to decide what to do.
    if (config.key == 'launcher') {
      config.soloPath = '../web/launcher.manifest';
    }

    this._setState({config});
  }

  _onData(e, data) {
    ExtensionAppShell.log('received browserData', data);
    this._setState({browserData: data});
  }

  _onPlans(e, plans) {
    super._onPlans(e, plans);

    if (this._state.extensionConfig && this._state.extensionConfig.manifestsNeedLoading &&
    !this._state.extensionConfig.manifestsLoaded) {
      // receiving plans is our trigger that the manifests have been loaded.
      this._state.extensionConfig.manifestsLoaded = true;
    }
  }

  /* Probably not needed
  _update(props, state, lastProps, lastState) {
    super._update(props, state, lastProps, lastState);
    // first time through, make the callout

    
    // when that returns, process the data
  }
  */



  _render(props, state) {
    // to delay loading of the arc-host, remove state.hostConfig until all the
    // extension data is loaded
    if (!state.browserData && state.hostConfig
        && state.extensionConfig && state.extensionConfig.ready) {
      // no need to save this - it'll be restored.
      delete state.hostConfig;

      ExtensionAppShell.log('stalling until browserData is present',
        state.browserData);
    }

    if (state.browserData) {
      // If this is our first time through, set some parameters about what
      // we're loading in this session.
      if (!state.extensionConfig) {
        const manifestsNeedLoading = state.browserData.manifests &&
          !state.browserData.manifests.every(
            manifest => state.manifests.indexOf(manifest)>=0);

        const extensionConfig = {manifestsNeedLoading};

        this._setState({extensionConfig});
      }

      if (state.extensionConfig.manifestsNeedLoading
         && !state.extensionConfig.manifestsLoaded) {
          let manifests = state.manifests.slice();
          state.browserData.manifests.forEach(manifest => {
            if (manifests.indexOf(manifest)<0) {
              manifests.push(manifest);
              ExtensionAppShell.log(`appending manifest ${manifest}`);
            }
          });
          state.manifests = manifests;
      }

      if (
        (!state.extensionConfig.manifestsNeedLoading || state.extensionConfig.manifestsLoaded)
          && state.browserData.entities) {
        // let's load some handle data
        const agents = document.querySelector('extension-app-shell agents');

        Object.entries(state.browserData.entities).forEach(entry => {
          const fqTypeName = entry[0];
          const shortTypeName = (fqTypeName.startsWith('http') && fqTypeName.includes('/'))
                            ? fqTypeName.split('/').slice(-1)[0] : fqTypeName;

          const dataKey = `browserData${shortTypeName}Data`;
          const optionsKey = `browserData${shortTypeName}Options`;
          if (!state[dataKey]) {
            const arcHandle = document.createElement('arc-handle');
            arcHandle.arc = '{{arc}}';
            arcHandle.data = `{{${dataKey}}}`;
            arcHandle.options = `{{${optionsKey}}}`;

            state[dataKey] = entry[1];

            // XXX does options need schemas (others do) and how would I get
            // that?
            // Can I work back from let schema = arc._context.findSchemaByName(shortTypeName); ?
            state[optionsKey] = {
              type: entry[0],
              name: dataKey,
              tags: [ shortTypeName=='Product' ? '#shortlist' : `#${shortTypeName}` ]
            };

            agents.appendChild(arcHandle);
          }
        });

        state.extensionConfig.ready = true;
      }
    }

    /* handled above with ready? 
    // XXX need to check to make sure we haven't already run this. Unless it can
    // be made idempotent?
    if (state.browserData && state.browserData.entities) {
      ExtensionAppShell.log('resuming now that browserData is present',
        state.browserData);
      //debugger;
    }
    */



    return super._render(props, state);
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
  */

  /*
  _attachListener() {
    var appshell = this;

    window.addEventListener('message', event => {
      ExtensionAppShell.log(`received event ${event.data.method} from ${event.source}`,
          event.data);
      if (event.source != window || event.data.method != 'injectArcsData') {
        return;
      }

      let dataByType = deduplicate(flatten(filter(event.data.entities)));

      if (dataByType['text/x-arcs-manifest']) {
        // XXX
        //config.additionalManifests = dataByType['text/x-arcs-manifest'].map(m => m.url);
        //ExtensionAppShell.log('loading additional manifests', config.additionalManifests);
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
            ExtensionAppShell.log('skipping unknown type '+fqTypeName);
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
          ExtensionAppShell.log(`stored entities of type ${fqTypeName}`, filteredEntities);
        });
      });
    }, false);
  }
  */
}
ExtensionAppShell.log = Xen.Base.logFactory('ExtensionAppShell', '#2277a8');
customElements.define('extension-app-shell', ExtensionAppShell);
