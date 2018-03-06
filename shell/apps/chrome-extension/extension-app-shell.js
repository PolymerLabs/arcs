// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import '../../app-shell/elements/arc-handle.js';
import '../../apps/chrome-extension/browser-data.js';

import AppShell from '../../app-shell/app-shell.js';
import ArcsUtils from '../../app-shell/lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';

class ExtensionAppShell extends AppShell {
  get template() {
    return `
${super.template}
<browser-data-receiver arc='{{arc}}' on-data="_onBrowserData"></browser-data-receiver>
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

  _onBrowserData(e, data) {
    ExtensionAppShell.log('received browserData', data);
    this._setState({browserData: data});
  }

  _onPlans(e, plans) {
    super._onPlans(e, plans);

    if (this._state.extensionConfig &&
        this._state.extensionConfig.manifestsNeedLoading &&
        !this._state.extensionConfig.manifestsLoaded) {
      // receiving plans is our trigger that the manifests have been loaded.
      this._state.extensionConfig.manifestsLoaded = true;
      ExtensionAppShell.log(`manifests are loaded`);
    }
  }

  /**
   * Filter the data down to the fields present in schema, and perform some
   * basic transformations.
   * TODO(smalls) pull this all out into something more maintainable.
   */
  _filterBySchema(entities, schema) {
    const validSchemaKeys =
        Object.keys(schema.optional).concat(Object.keys(schema.normative));

    let filteredEntities = entities.map(
        entity => Object.entries(entity)
                      .filter(entry => validSchemaKeys.includes(entry[0]))
                      .reduce((result, current) => {
                        let key = current[0];

                        // do some basic filtering on values.
                        let value;
                        if (key == 'name' && Array.isArray(current[1])) {
                          value = current[1][0];
                        } else {
                          value = current[1];
                        }

                        result[key] = value;
                        return result;
                      }, {}));

    // For Products, populate shipDays if it's not already done.
    if (schema.name == 'Product') {
      let shipDays = 5 + Math.floor(Math.random() * 5);
      filteredEntities.forEach(entity => {
        if (!entity.hasOwnProperty('shipDays')) {
          entity['shipDays'] = shipDays++;
        }
      });
    }

    return filteredEntities;
  }

  _render(props, state) {
    if (state.browserData) {
      // If this is our first time through, set some parameters about what
      // we're loading in this session.
      if (!state.extensionConfig) {
        const manifestsNeedLoading = state.browserData.manifests &&
            !state.browserData.manifests.every(
                manifest => state.manifests.indexOf(manifest) >= 0);

        const extensionConfig = {manifestsNeedLoading};

        this._setState({extensionConfig});
      }

      // set additional manifests up for loading
      if (state.extensionConfig.manifestsNeedLoading &&
          !state.extensionConfig.manifestsLoaded) {
        let manifests = state.manifests.slice();
        state.browserData.manifests.forEach(manifest => {
          if (manifests.indexOf(manifest) < 0) {
            manifests.push(manifest);
            ExtensionAppShell.log(`appending manifest ${manifest}`);
          }
        });
        state.manifests = manifests;
        this._setState({plans: null});
      }

      // after manifests are loaded (if needed), create handles and indicate
      // readiness.
      if (!state.extensionConfig.manifestsNeedLoading ||
          state.extensionConfig.manifestsLoaded) {
        if (state.browserData.entities) {
          // let's load some handle data
          const agents = document.querySelector('extension-app-shell agents');

          Object.entries(state.browserData.entities).forEach(entry => {
            const fqTypeName = entry[0];
            const shortTypeName =
                (fqTypeName.startsWith('http') && fqTypeName.includes('/')) ?
                fqTypeName.split('/').slice(-1)[0] :
                fqTypeName;

            // compute the schema name to use based on what we can find
            let foundSchemaName;
            if (state.arc._context.findSchemaByName(fqTypeName)) {
              foundSchemaName = fqTypeName;
            } else if (state.arc._context.findSchemaByName(shortTypeName)) {
              foundSchemaName = shortTypeName;
            } else {
              ExtensionAppShell.log(`didn't find a schema for type ${
                  fqTypeName} or ${shortTypeName}, skipping`);
              return;
            }
            const schema = state.arc._context.findSchemaByName(foundSchemaName);
            const data = this._filterBySchema(entry[1], schema);

            const handleName = `browserData${shortTypeName}Data`;

            // see if we've already made a handle
            if (state.arc._context._handles.find(
                    handle => handle.name == handleName)) {
              ExtensionAppShell.log(
                  `we've already created a handle with name ${handleName}`);
              return;
            }

            ExtensionAppShell.log(`creating ArcHandle with name ${handleName}`);
            const arcHandle = document.createElement('arc-handle');
            const handleProps = {
              arc: state.arc,
              options: {
                type: `[${foundSchemaName}]`,
                name: handleName,
                id: handleName,
                tags:
                    [shortTypeName == 'Product' ? '#shortlist' :
                                                  `#${shortTypeName}`],
                description: `${shortTypeName} from your browsing context`,
                asContext: true
              },
              data: data
            };
            const handleState = {manifest: state.arc._context};

            arcHandle._update(handleProps, handleState, {});
            this._setState({plans: null});
          });
        }

        state.extensionReady = true;
      }
    }

    return super._render(props, state);
  }
}
ExtensionAppShell.log = Xen.Base.logFactory('ExtensionAppShell', '#2277a8');
customElements.define('extension-app-shell', ExtensionAppShell);
