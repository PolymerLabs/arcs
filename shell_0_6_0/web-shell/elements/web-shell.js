/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {linkJack} from '../../components/link-jack.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {SlotDomConsumer} from '../../../runtime/ts-build/slot-dom-consumer.js';
import {ArcsEnvWeb} from '../../lib/web/arcs-env-web.js';
import {Xen} from '../../lib/xen.js';
import './web-config.js';
import './arc-host.js';
import './web-shell-ui.js';
import './user-context.js';

// disable flushing template cache on dispose
SlotDomConsumer.multitenant = true;

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
      padding-bottom: 128px;
    }
  </style>

  <web-config userid="{{userid}}" arckey="{{arckey}}" on-config="onState"></web-config>

  <user-context env="{{env}}" storage="{{storage}}" userid="{{userid}}" context="{{context}}" arcstore="{{store}}"><user-context>

  <web-shell-ui arc="{{arc}}" context="{{context}}">
    <arc-host env="{{env}}" storage="{{storage}}" config="{{launcherConfig}}" on-arc="onLauncherArc" on-recipe="onState"></arc-host>
    <arc-host env="{{env}}" storage="volatile://context" config="{{contextConfig}}" context="{{contextContext}}" on-arc="onContextArc"></arc-host>
    <arc-host env="{{env}}" storage="{{storage}}" config="{{arcConfig}}" context="{{context}}" on-arc="onState"></arc-host>

    <slot></slot>

    <div style="position: fixed; right: 0; bottom: 0; left: 0; height: 64px; border-top: 1px solid silver; padding: 16px; background: white;">
      <button on-click="onLauncherClick">Back To Launcher</button>
      &nbsp;&nbsp;&nbsp;
      <button on-click="onSpawnClick" recipe="Arcs/Login.recipe">Spawn Login</button>
      <button on-click="onSpawnClick" recipe="Music/Playlist.recipe">Spawn Playlist</button>
      <button on-click="onSpawnClick" recipe="Profile/BasicProfile.recipe">Spawn Profile</button>
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
    // for debugging only
    window.shell = this;
    window.arc = state.arc;
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
    if (state.env && state.arckey && state.context) {
      if (state.arcConfig && state.arcConfig.id === state.arckey) {
        this.showHideLauncher(false);
      } else {
        this.openArc(state.arckey);
      }
    }
  }
  render(props, state) {
    return [props, state];
  }
  async updateEnv({root}, state) {
    // capture anchor-clicks for SPA behavior
    linkJack(document, anchor => this.routeLink(anchor));
    // create arcs web-environment
    state.env = new ArcsEnvWeb(root);
    // map in 0_6_0 artifacts
    state.env.pathMap['https://$artifacts/'] = `${state.env.rootPath}/artifacts_0_6_0/`;
    // marshal nodes from light-dom
    state.launcherNodes = document.body.querySelector('[launcherNodes]');
    state.arcNodes = document.body.querySelector('[arcNodes]');
    // configure composers
    // TODO(sjmiles): composers own DOM, should be custom elements, but need to be able to re-use them
    state.launcherComposer = {affordance: 'dom', kind: SlotComposer, container: state.launcherNodes};
    state.arcComposer = {affordance: 'dom', kind: SlotComposer, container: state.arcNodes};
    state.contextComposer = {affordance: 'dom', kind: SlotComposer, container: state.launcherNodes};
    // spin up context arc
    this.spawnContext();
    // spin up launcher arc
    this.spawnLauncher();
  }
  routeLink(anchor) {
    const url = new URL(anchor.href, document.location);
    const params = url.searchParams;
    log(/*url,*/ anchor.href, Array.from(params.keys()));
    const key = params.get('arc');
    // loopback not supported
    if (key !== this.state.arckey) {
      this.state = {arckey: key};
    }
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
  spawnContext() {
    const contextContext = this.state.env.parse(`
  import 'https://$artifacts/canonical.manifest'
  import 'https://$artifacts/Profile/Sharing.recipe'
    `);
    this.state = {
      contextContext,
      contextConfig: {
        id: `${this.state.userid}-context`,
        //manifest: `import 'https://$artifacts/Arcs/Sharing.recipe'`,
        //serialization: sharingArc,
        composer: this.state.contextComposer
      }
    };
  }
  spawnLauncher() {
    this.showHideLauncher(true);
    this.state = {
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
      arc: null,
      arckey: id,
      arcConfig: {
        id,
        manifest: `import 'https://$artifacts/${recipe}'`,
        composer: this.state.arcComposer
      }
    };
    const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    this.recordArcMeta({
      key: id,
      href: `?arc=${id}`,
      description: `${recipe.split('/').pop().split('.').shift()} [${luid}]`,
      color,
      touched: Date.now(),
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
      arcConfig: {
        id,
        composer: this.state.arcComposer
      }
    };
  }
  showHideLauncher(show) {
    this.state.launcherNodes.hidden = !show;
    this.state.arcNodes.hidden = show;
  }
  onLauncherArc(e, launcherArc) {
    this.state = {launcherArc};
  }
  async onContextArc(e, contextArc) {
    this.state = {context: contextArc.context};
  }
  onSpawnClick(e) {
    const recipe = e.target.getAttribute('recipe');
    this.spawnArc(recipe);
  }
  onLauncherClick() {
    this.state = {arckey: ''};
    this.showHideLauncher(true);
  }
}

customElements.define('web-shell', WebShell);
