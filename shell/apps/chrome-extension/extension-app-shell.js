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


// Uhg. This is is a straight copy of the template from app-shell with the
// addition of chrome-data.
const template = ArcsUtils.html`
<style>
  body {
    background-color: gray;
  }
  app-shell, [app-shell] {
    display: block;
    max-width: 640px;
    margin: 0 auto;
    background-color: white;
  }
  app-main {
    display: block;
    min-height: 100vh;
  }
  app-tools {
    display: none;
    background-color: white;
  }
  toolbar {
    display: block;
    height: 56px;
  }
  .material-icons, toolbar i {
    font-family: 'Material Icons';
    font-size: 24px;
    font-style: normal;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
  }
  app-toolbar {
    position: fixed;
    top: 0;
    width: 100%;
    max-width: 640px;
    height: 56px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    padding-left: 16px;
    box-sizing: border-box;
    background-color: white;
    z-index: 1000;
  }
  app-toolbar > *, app-toolbar > [buttons] > * {
    margin-right: 16px;
  }
  app-toolbar > [arc-title] {
    flex: 1;
    min-height: 0.6em;
    padding-top: 0.1em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  app-toolbar > [avatar] {
    height: 32px;
    width: 32px;
    min-width: 32px;
    border-radius: 100%;
  }
  [launcher] app-toolbar > [buttons] {
    display: none;
  }
  app-toolbar > [buttons] {
    display: flex;
    white-space: nowrap;
    align-items: center;
    padding-right: 0;
  }
  app-toolbar > [buttons] > a {
    color: inherit;
    text-decoration: none;
  }
  footer {
    display: block;
    position: relative;
    height: 40px;
  }
  arc-footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    max-width: 640px;
    background-color: white;
  }
  [hidden] {
    display: none;
  }
  [illuminate] [particle-host] {
    border: 1px solid #ea80fc;
    border-top: 18px solid #ea80fc;
    border-radius: 8px 8px 0 0;
  }
  [illuminate] [particle-host]::before {
    content: attr(particle-host);
    position: relative;
    top: -18px;
    left: 4px;
    font-size: 12px;
    font-family: monospace;
  }
  [slotid=suggestions] {
    max-height: 356px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  [slotid=modal] {
    position: fixed;
    top: 56px;
    bottom: 0;
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    box-sizing: border-box;
    pointer-events: none;
    color: black;
  }
  /* wider-than-mobile */
  @media (min-width: 500px) {
    app-shell[expanded], [expanded] app-main, [expanded] app-toolbar, [expanded] arc-footer {
      margin: 0;
      width: 424px;
      max-width: 424px;
    }
    [expanded] app-tools {
      display: block;
      position: fixed;
      left: 424px;
      right: 0;
      top: 0;
      bottom: 0;
      overflow: auto;
      border-left: 1px solid silver;
    }
  }
</style>

<app-main launcher$='{{launcher}}' style='{{shellThemeStyle}}'>
  <agents>
    <!--<arc-auth on-auth='_onAuth'></arc-auth>-->
    <arc-config rootpath='{{cdnPath}}' on-config='_onConfig'></arc-config>
    <persistent-arc key='{{suggestKey}}' on-key='_onKey' metadata='{{metadata}}' on-metadata='_onMetadata'></persistent-arc>
    <chrome-data arc='{{arc}}' on-data="_onData"></chrome-data>
    <persistent-users on-users='_onUsers'></persistent-users>
    <persistent-user id='{{userId}}' user='{{user}}' key='{{key}}' on-user='_onUser'></persistent-user>
    <persistent-manifests manifests='{{manifests}}' on-manifests='_onManifests' exclusions='{{exclusions}}' on-exclusions='_onExclusions'></persistent-manifests>
    <persistent-handles arc='{{arc}}' key='{{key}}'></persistent-handles>
    <remote-profile-handles arc='{{arc}}' user='{{user}}' on-profile='_onProfile'></remote-profile-handles>
    <remote-shared-handles arc='{{arc}}' user='{{user}}' friends='{{friends}}'></remote-shared-handles>
    <remote-friends-profiles-handles arc='{{arc}}' friends='{{friends}}' user='{{user}}'></remote-friends-profiles-handles>
    <arc-handle arc='{{arc}}' data='{{arcsHandleData}}' options='{{arcsHandleOptions}}' on-change='_onArcsHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{identityHandleData}}' options='{{identityHandleOptions}}' on-change='_onIdentityHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{identitiesHandleData}}' options='{{identitiesHandleOptions}}' on-change='_onIdentitiesHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{friendsAvatarData}}' options='{{friendsAvatarHandleOptions}}'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{themeData}}' options='{{themeHandleOptions}}' on-change='_onShellThemeChange'></arc-handle>
    <arc-steps plans='{{plans}}' plan='{{plan}}' steps='{{steps}}' step='{{step}}' on-step='_onStep' on-steps='_onSteps'></arc-steps>
    <!-- only for launcher -->
    <remote-visited-arcs user='{{launcherUser}}' arcs='{{visitedArcs}}' on-arcs='_onVisitedArcs'></remote-visited-arcs>
  </agents>

  <!-- toolbar is here only to reserve space in the static flow, the app-toolbar is position-fixed -->
  <toolbar>
    <app-toolbar style='{{shellThemeStyle}}'>
      <img title='Arcs' on-click='_onNavClick' src='../logo_24x24.svg' style='cursor: pointer;'>
      <span arc-title style='{{titleStatic}}' on-click='_onStartEditingTitle' unsafe-html='{{description}}'></span>
      <span avatar style='{{avatarStyle}}'></span>
      <select on-change='_onUserSelected'>{{usersOptions}}</select>
      <template users-options>
        <option value='{{value}}' selected='{{selected}}'>{{user}}</option>
      </template>
      <div buttons>
        <toggle-button title='Arc Contains Profile Data' state='{{profileState}}' on-state='_onProfileState' icons='person_outline person'></toggle-button>
        <toggle-button title='Share this Arc' state='{{sharedState}}' on-state='_onSharedState' icons='link supervisor_account'></toggle-button>
        <toggle-button title='Cast' on-state='_onCastState' icons='cast cast_connected'></toggle-button>
        <a href='{{launcherUrl}}'><i>apps</i></a>
      </div>
    </app-toolbar>
  </toolbar>

  <arc-host config='{{hostConfig}}' manifests='{{manifests}}' exclusions='{{exclusions}}' plans='{{plans}}' plan='{{plan}}' suggestions='{{suggestions}}' on-arc='_onArc' on-plans='_onPlans' on-applied='_onApplied'>
    <div slotid='toproot'></div>
    <div slotid='root'></div>
    <div slotid='modal'></div>
  </arc-host>

  <footer>
    <arc-footer dots='{{dots}}' on-suggest='_onStep' on-search='_onSearch'>
      <div slotid='suggestions'></div>
    </arc-footer>
  </footer>
</app-main>

<app-tools>
  <simple-tabs>
    <div tab='Manifests'>
      <local-data manifest='{{manifest}}' on-update-manifest='_onUpdateManifest' on-promote-manifest='_onPromoteManifest'></local-data>
      <manifest-data manifests='{{manifests}}' exclusions='{{exclusions}}' on-exclusions='_onExclusions'></manifest-data>
    </div>
    <div tab='Handle Explorer'>
      <handle-explorer arc='{{arc}}'></handle-explorer>
    </div>
    <!-- <div tab='App State'>
      <data-explorer style='font-size: 0.6em;' object='{{appState}}'></data-explorer>
    </div> -->
  </simple-tabs>
  <shell-particles arc='{{arc}}'></shell-particles>
</app-tools>
`;
class ExtensionAppShell extends AppShell {
  /*
  constructor() {
    super();

    this._attachListener();
  }
  */

  get template() {
    return Xen.Template.createTemplate(template);
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
    console.log('XXX huzzah!');

    // XXX is this a good spot to split out the data?
    ExtensionAppShell.log('received browserData', data);
    this._setState({browserData: data});
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
    if (!state.browserData && state.hostConfig) {
      // no need to save this - it'll be restored.
      delete state.hostConfig;

      ExtensionAppShell.log('stalling until browserData is present',
        state.browserData);
    }

    // if we have manifests, cram them in and short-circuit to yield
    if (state.browserData
        && state.browserData.manifests
        && !state.browserData.manifests.every(
            manifest => state.manifests.indexOf(manifest)>=0)) {
      state.manifests.push(...state.browserData.manifests);
      return super._render(props, state);
    }

    // need to check to make sure we haven't already run this. Unless it can
    // be made idempotent?
    if (state.browserData) {
      ExtensionAppShell.log('resuming now that browserData is present',
        state.browserData);
    }



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
