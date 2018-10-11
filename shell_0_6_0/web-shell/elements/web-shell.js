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
import {generateId} from '../../components/generate-id.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {SlotDomConsumer} from '../../../runtime/ts-build/slot-dom-consumer.js';
import {ArcsEnvWeb} from '../../lib/web/arcs-env-web.js';
import {Xen} from '../../lib/xen.js';
import './web-config.js';
import './web-arc.js';
import './user-context.js';
import './ui/web-shell-ui.js';

// disable flushing template cache on dispose
SlotDomConsumer.multitenant = true;

// templates
const template = Xen.Template.html`
  <style>
    :host {
      display: block;
      padding-bottom: 128px;
    }
    button {
      padding: 4px;
      margin-bottom: 8px;
    }
  </style>

  <web-config userid="{{userid}}" arckey="{{arckey}}" on-config="onState"></web-config>
  <web-arc env="{{env}}" storage="{{storage}}" composer="{{launcherComposer}}" config="{{launcherConfig}}" on-arc="onLauncherArc" on-recipe="onState"></web-arc>
  <web-arc env="{{env}}" storage="volatile://context" composer="{{launcherComposer}}" config="{{contextConfig}}" context="{{contextContext}}" on-arc="onContextArc"></web-arc>
  <web-arc env="{{env}}" storage="{{storage}}" composer="{{arcComposer}}" config="{{arcConfig}}" context="{{context}}" on-arc="onState"></web-arc>
  <user-context env="{{env}}" storage="{{storage}}" userid="{{userid}}" context="{{context}}" arcstore="{{store}}"></user-context>

  <web-shell-ui arc="{{arc}}" context="{{context}}">
    <slot></slot>
    <!-- <div slot="suggestions" style="display: flex; flex-direction: column; padding: 16px; background: white;">
      <button on-click="onSpawnClick" recipe="Arcs/Login.recipe">Spawn Login</button>
      <button on-click="onSpawnClick" recipe="Music/Playlist.recipe">Spawn Playlist</button>
      <button on-click="onSpawnClick" recipe="Profile/BasicProfile.recipe">Spawn Profile</button>
      <button on-click="onSpawnClick" recipe="Profile/Geolocate.recipe">Spawn Geolocation</button>
    </div> -->
    <slot slot="suggestions" name="suggestions"></slot>
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
      this.spawnSuggestions();
    }
    if (!state.store && state.launcherArc) {
      this.waitForStore(10);
    }
    if (state.env && state.arckey && state.context) {
      if (state.arcConfig && state.arcConfig.id === state.arckey) {
        //this.showHideLauncher(false);
      } else {
        this.openArc(state.arckey);
      }
    }
    if (!state.launcherConfig && state.env && state.context) {
      // spin up launcher arc
      this.spawnLauncher();
    }
    this.showHideLauncher(!state.arckey);
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
    // TODO(sjmiles): composers own DOM, probably should be custom elements
    state.launcherComposer = new SlotComposer({affordance: 'dom', rootContainer: state.launcherNodes});
    state.arcComposer = new SlotComposer({affordance: 'dom', rootContainer: state.arcNodes});
    //state.contextComposer = new SlotComposer({affordance: 'dom', rootContainer: state.launcherNodes});
    // spin up context arc
    await this.spawnContext();
  }
  routeLink(anchor) {
    const url = new URL(anchor.href, document.location);
    const params = url.searchParams;
    log('routeLink:', /*url,*/ anchor.href, Array.from(params.keys()));
    const key = params.get('arc') || '';
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
  async spawnContext() {
    const contextContext = await this.state.env.parse(`
  import 'https://$artifacts/canonical.manifest'
  import 'https://$artifacts/Profile/Sharing.recipe'
    `);
    this.state = {
      contextContext,
      contextConfig: {
        id: `${this.state.userid}-context`
      }
    };
  }
  spawnLauncher() {
    //this.showHideLauncher(true);
    this.state = {
      launcherConfig: {
        id: `${this.state.userid}-launcher`,
        manifest: `import 'https://$artifacts/Arcs/Launcher.recipe'`
      }
    };
  }
  spawnArc(recipe) {
    const luid = generateId();
    //this.showHideLauncher(false);
    //const luid = Math.floor((Math.random()+1)*1e5);
    const id = `${this.state.userid}-${luid}`;
    this.state = {
      arc: null,
      arckey: id,
      arcConfig: {
        id,
        manifest: `import 'https://$artifacts/${recipe}'`
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
    //this.showHideLauncher(false);
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
    const {launcherNodes, arcNodes} = this.state;
    if (launcherNodes && arcNodes) {
      launcherNodes.hidden = !show;
      arcNodes.hidden = show;
    }
  }
  spawnSuggestions() {
    const suggestions = [
      `Arcs/Login.recipe`,
      `Music/Playlist.recipe`,
      `Profile/BasicProfile.recipe`,
      `Profile/Geolocate.recipe`
    ];
    const slot = document.querySelector(`[slotid="suggestions"]`);
    if (slot) {
      suggestions.forEach(suggestion => {
        const elt = slot.appendChild(
          Object.assign(document.createElement(`suggestion-element`), {
            recipe: suggestion,
            innerText: suggestion.split('.').shift()
          }
        ));
        elt.addEventListener('plan-choose', () => {
          this.spawnArc(suggestion);
        });
      });
    }
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
    //this.showHideLauncher(true);
  }
}

customElements.define('web-shell', WebShell);
