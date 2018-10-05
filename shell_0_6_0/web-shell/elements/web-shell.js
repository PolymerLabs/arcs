/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {SlotComposer} from '../../../runtime/slot-composer.js';
import {ArcsEnvWeb} from '../../lib/web/arcs-env-web.js';
import {Xen} from '../../lib/xen.js';
import './web-config.js';
import './arc-host.js';
import './web-shell-ui.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
      padding-bottom: 128px;
    }
  </style>
  <web-config userid="{{userid}}" arckey="{{arckey}}" on-config="onState"></web-config>
  <web-shell-ui arc="{{arc}}" context="{{context}}">
    <arc-host env="{{env}}" storage="{{storage}}" config="{{launcherConfig}}" on-arc="onLauncherArc" on-recipe="onState"></arc-host>
    <arc-host env="{{env}}" context="{{context}}" storage="{{storage}}" config="{{arcConfig}}" on-arc="onState"></arc-host>
    <!-- -->
    <slot></slot>
    <!-- -->
    <div style="position: fixed; right: 0; bottom: 0; left: 0; height: 64px; border-top: 1px solid silver; padding: 16px; background: white;">
      <button on-click="onLauncherClick">Back To Launcher</button>
      &nbsp;&nbsp;&nbsp;
      <button on-click="onSpawnClick" recipe="Arcs/Login.recipe">Spawn Login</button>
      <button on-click="onSpawnClick" recipe="Music/Playlist.recipes">Spawn Playlist</button>
    </div>
  </web-shell-ui>
`;

const log = Xen.logFactory('WebShell', '#6660ac');

export class WebShell extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['root', 'storage'];
  }
  get template() {
    return template;
  }
  async update({root}, state) {
    if (state.config !== state._config) {
      state._config = state.config;
      if (state.config) {
        state.userid = state.config.userid;
        state.arckey = state.config.arckey;
      }
    }
    if (!state.env && root) {
      this.updateEnv({root}, state);
    }
    if (!state.store && state.launcherArc) {
      this.waitForStore(10);
    }
    if (state.env && state.arckey) {
      this.openArc(state.arckey);
    }
  }
  render(props, state) {
    return [props, state];
  }
  async updateEnv({root}, state) {
    document.onclick = e => {
      log(e.target.localName);
    };
    // create arcs web-environment
    state.env = new ArcsEnvWeb(root);
    // map in 0_6_0 artifacts
    state.env.pathMap['https://$artifacts/'] = `${state.env.rootPath}/artifacts_0_6_0/`;
    // hardcode userid
    //state.userid = 'cletus';
    // marshal nodes from light-dom
    state.launcherNodes = document.body.querySelector('[launcherNodes]');
    state.arcNodes = document.body.querySelector('[arcNodes]');
    // configure composers
    // TODO(sjmiles): composers own DOM, should be custom elements, but need to be able to re-use them
    state.launcherComposer = {
      affordance: 'dom',
      kind: SlotComposer,
      container: state.launcherNodes
    };
    state.arcComposer = {
      affordance: 'dom',
      kind: SlotComposer,
      container: state.arcNodes
    };
    // start with launcher
    this.spawnLauncher();
    // simple context
    state.context = await state.env.parse(`import 'https://$artifacts/canonical.manifest'`);
  }
  waitForStore(pollInterval) {
    const {launcherArc, store} = this.state;
    if (launcherArc && !store) {
      if (launcherArc._stores.length) {
        const store = launcherArc._stores.pop();
        //store.on('change', info => log('changes', info), this);
        this.state = {store};
      } else {
        setTimeout(() => this.waitForStore(), pollInterval);
      }
    }
  }
  spawnLauncher() {
    this.showHideLauncher(true);
    this.state = {
      arc: null,
      store: null,
      launcherConfig: {
        id: `${this.state.userid}-launcher`,
        manifest: `import 'https://$artifacts/Arcs/Launcher.recipe'`,
        composer: this.state.launcherComposer
      }
    };
  }
  spawnArc(recipe) {
    this.showHideLauncher(false);
    const luid = Math.floor((Math.random()+1)*1e5);
    const id = `${this.state.userid}-${luid}`;
    this.state = {
      arckey: id,
      arc: null,
      store: null,
      arcConfig: {
        id,
        manifest: `import 'https://$artifacts/${recipe}'`,
        composer: this.state.arcComposer
      }
    };
    const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    this.recordArcMeta({
      key: id,
      description: `${recipe.split('.').shift()} ${luid}`,
      color,
      touched: Date.now()
    });
  }
  async recordArcMeta(meta) {
    const {store} = this._state;
    if (store) {
      const metaEntity = {
        id: meta.key,
        rawData: meta
      };
      await store.store(metaEntity, [String(Math.random())]);
    }
  }
  openArc(id) {
    this.showHideLauncher(false);
    this.state = {
      arckey: id,
      arc: null,
      store: null,
      arcConfig: {
        id,
        composer: this.state.arcComposer
      }
    };
    // const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    // this.recordArcMeta({
    //   key: id,
    //   description: `${recipe.split('.').shift()} ${luid}`,
    //   color,
    //   touched: Date.now()
    // });
  }
  showHideLauncher(show) {
    this.state.launcherNodes.hidden = !show;
    this.state.arcNodes.hidden = show;
  }
  onLauncherArc(e, arc) {
    this.state = {launcherArc: arc};
  }
  onSpawnClick(e) {
    const recipe = e.target.getAttribute('recipe');
    this.spawnArc(recipe);
  }
  onLauncherClick() {
    this.showHideLauncher(true);
  }
}

customElements.define('web-shell', WebShell);
