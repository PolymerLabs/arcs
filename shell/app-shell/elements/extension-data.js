// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import './extension-data-receiver.js';
import '../../app-shell/elements/arc-handle.js';

import ArcsUtils from '../../app-shell/lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';

const template = Xen.html`
  <extension-data-receiver on-data="_onBrowserData"></extension-data-receiver>
`;

class ExtensionData extends Xen.Base {
  static get observedAttributes() {
    return ['arc'];
  }

  get template() {
    return template;
  }

  _render({arc}, state) {
    if (arc && state.browserData) {
      this._consumeBrowserData(arc, state);
    }
    if (state.manifests) {
      this._fire('manifests', state.manifests);
    }
  }

  _onBrowserData(e, browserData) {
    log('received browserData', browserData);
    this._setState({browserData});
  }

  _onPlans(e, plans) {
    super._onPlans(e, plans);
    const {extensionConfig} = this._state;
    if (extensionConfig && extensionConfig.manifestsNeedLoading && !extensionConfig.manifestsLoaded) {
      // receiving plans is our trigger that the manifests have been loaded.
      extensionConfig.manifestsLoaded = true;
      log(`manifests are loaded`);
    }
  }

  _consumeBrowserData(arc, state) {
    const {browserData} = state;

    // If this is our first time through, set some parameters about what
    // we're loading in this session.
    if (!('manifestsNeedLoading' in state)) {
      state.manifestsNeedLoading =
          Boolean(browserData.manifests);
            // TODO(sjmiles): checks for duplicates in an input list that no longer exists
            /* && !browserData.manifests.every(
              manifest => manifests.indexOf(manifest) >= 0
          );*/
    }

    const {manifestsNeedLoading, manifestsLoaded} = state;

    // set additional manifests up for loading
    if (manifestsNeedLoading && !manifestsLoaded) {
      // TODO(sjmiles): this is a lie
      state.manifestsLoaded = true;
      /*
      const manifests = []; //manifests.slice();
      browserData.manifests.forEach(manifest => {
        if (manifests.indexOf(manifest) < 0) {
          manifests.push(manifest);
          log(`appending manifest ${manifest}`);
        }
      });
      */
      state.manifests = browserData.manifests;
    }

    // after manifests are loaded (if needed), create handles and indicate
    // readiness.
    if (!manifestsNeedLoading || manifestsLoaded) {
      if (browserData.entities) {
        this._consumeEntities(browserData.entities, arc);
        browserData.entities = null;
      }
    }
  }

  _consumeEntities(entities, arc) {
    // let's load some handle data
    Object.entries(entities).forEach(entity => this._consumeEntity(entity, arc));
  }

  _consumeEntity(entity, arc, container) {
    const fqTypeName = entity[0];
    const shortTypeName =
        (fqTypeName.startsWith('http') && fqTypeName.includes('/')) ?
        fqTypeName.split('/').slice(-1)[0] :
        fqTypeName;

    // compute the schema name to use based on what we can find
    let foundSchemaName;
    if (arc._context.findSchemaByName(fqTypeName)) {
      foundSchemaName = fqTypeName;
    } else if (arc._context.findSchemaByName(shortTypeName)) {
      foundSchemaName = shortTypeName;
    } else {
      log(`didn't find a schema for type ${
          fqTypeName} or ${shortTypeName}, skipping`);
      return;
    }

    const schema = arc._context.findSchemaByName(foundSchemaName);
    const data = this._filterBySchema(entity[1], schema);

    // see if we've already made a handle
    const handleName = `browserData${shortTypeName}Data`;
    if (arc._context._handles.find(handle => handle.name == handleName)) {
      log(
          `we've already created a handle with name ${handleName}`);
      return;
    }

    this._createArcHandle(arc, schema, handleName, shortTypeName, data);
  }

  /**
   * Filter the data down to the fields present in schema, and perform some
   * basic transformations.
   * TODO(smalls) pull this all out into something more maintainable.
   */
  _filterBySchema(entities, schema) {
    const validSchemaKeys = Object.keys(schema.fields);
    const someFilter = entry => validSchemaKeys.includes(entry[0]);
    const someReducer = (result, current) => {
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
    };
    const entityMapper = entity => Object.entries(entity).filter(someFilter).reduce(someReducer, {});
    const filteredEntities = entities.map(entityMapper);
    // For Products, populate shipDays if it's not already done.
    if (schema.name === 'Product') {
      let shipDays = 5 + Math.floor(Math.random() * 5);
      filteredEntities.forEach(entity => {
        if (!(shipDays in entity)) {
          entity.shipDays = shipDays++;
        }
      });
    }
    return filteredEntities;
  }

  _createArcHandle(arc, schema, handleName, shortTypeName, data) {
    log(`creating ArcHandle with name ${handleName}`);
    let typeDescription = schema.description && schema.description.plural ?
      schema.description.plural :
      shortTypeName;
    typeDescription =
        typeDescription.charAt(0).toUpperCase() + typeDescription.slice(1);
    Object.assign(document.createElement('arc-handle'), {
      arc,
      data,
      options: {
        manifest: arc._context,
        type: `[${schema.name}]`,
        name: handleName,
        id: handleName,
        tags:
            [`#${typeDescription}`, '#browser'],
        asContext: true,
        description: `${typeDescription} from your browsing context`
      }
    });
  }

}
const log = Xen.Base.logFactory('ExtensionData', '#2277a8');
customElements.define('extension-data', ExtensionData);
