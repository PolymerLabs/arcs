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
import {SlotDomConsumer} from '../../../runtime/ts-build/slot-dom-consumer.js';
import {ArcsEnvWeb} from '../../lib/web/arcs-env-web.js';
import {Xen} from '../../lib/xen.js';
import './web-config.js';
import './web-arc.js';
import './user-context.js';
import './ui/web-shell-ui.js';
import './web-launcher.js';

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
    web-launcher[hidden] {
      display: none;
    }
    web-arc[hidden] {
      display: none;
    }
  </style>
  <!-- manage configuration (read and persist) -->
  <web-config userid="{{userid}}" arckey="{{arckey}}" on-config="onState"></web-config>
  <!-- context bootstrap -->
  <web-arc env="{{env}}" storage="volatile://context" config="{{contextConfig}}" context="{{context}}"></web-arc>
  <!-- context feed -->
  <user-context env="{{env}}" storage="{{storage}}" userid="{{userid}}" context="{{context}}" arcstore="{{store}}"></user-context>
  <!-- ui chrome -->
  <web-shell-ui arc="{{arc}}" context="{{context}}">
    <!-- launcher -->
    <web-arc hidden="{{hideLauncher}}" Xstyle="display: none;" env="{{env}}" storage="{{storage}}" config="{{launcherConfig}}" on-arc="onLauncherArc" Xon-recipe="onState"></web-arc>
    <!-- <web-launcher hidden="{{hideLauncher}}" env="{{env}}" storage="{{storage}}" info="{{info}}"></web-launcher> -->
    <!-- other arcs -->
    <web-arc hidden="{{hideArc}}" env="{{env}}" storage="{{storage}}" config="{{arcConfig}}" context="{{context}}" on-arc="onState" manifest="{{manifest}}"></web-arc>
    <!-- suggestions -->
    <div slot="suggestions" slotid="suggestions"></div>
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
      if (!state.arcConfig || state.arcConfig.id !== state.arckey) {
        this.state = {
          arc: null,
          arckey: state.arckey,
          arcConfig: {
            id: state.arckey
          }
        };
      }
    }
    if (!state.launcherConfig && state.env && state.context) {
      // spin up launcher arc
      this.spawnLauncher();
    }
    this.state = {hideLauncher: Boolean(state.arckey)};
  }
  render(props, state) {
    state.hideArc = !state.hideLauncher;
    return [props, state];
  }
  async updateEnv({root}, state) {
    // capture anchor-clicks for SPA behavior
    linkJack(document, anchor => this.routeLink(anchor));
    // create arcs web-environment
    state.env = new ArcsEnvWeb(root);
    // map in 0_6_0 artifacts
    state.env.pathMap['https://$artifacts/'] = `${state.env.rootPath}/artifacts_0_6_0/`;
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
        store.on('change', info => this.state = {info}, this);
        this.state = {store};
      } else {
        setTimeout(() => this.waitForStore(), pollInterval);
      }
    }
  }
  async spawnContext() {
    const context = await this.state.env.parse(`
  import 'https://$artifacts/canonical.manifest'
  import 'https://$artifacts/Profile/Sharing.recipe'
    `);
    this.state = {
      context,
      contextConfig: {
        id: `${this.state.userid}-context`
      }
    };
  }
  spawnLauncher() {
    this.state = {
      launcherConfig: {
        id: `${this.state.userid}-launcher`,
        manifest: `import 'https://$artifacts/Arcs/Launcher.recipe'`
      }
    };
  }
  spawnSuggestions() {
    const suggestions = [
      `Arcs/Login.recipe`,
      `Music/Playlist.recipe`,
      `Profile/BasicProfile.recipe`,
      `Restaurants/Restaurants.recipes`,
      `Reservations/Reservations.recipes`,
      `Restaurants/RestaurantsDemo.recipes`
    ];
    const slot = this.host.querySelector(`[slotid="suggestions"]`);
    if (slot) {
      suggestions.forEach(suggestion => {
        slot.appendChild(Object.assign(document.createElement(`suggestion-element`), {
          suggestion,
          innerText: suggestion.split('/').pop().split('.').shift()
        }))
        .addEventListener('plan-choose', () => this.applySuggestion(suggestion));
      });
    }
  }
  applySuggestion(suggestion) {
    if (this.state.arc) {
      this.state = {manifest: `import 'https://$artifacts/${suggestion}'`};
    } else {
      this.spawnArc(suggestion);
    }
  }
  spawnArc(recipe) {
    const luid = generateId();
    const id = `${this.state.userid}-${luid}`;
    this.state = {
      arc: null,
      arckey: id,
      arcConfig: {
        id,
        manifest: `import 'https://$artifacts/${recipe}'`
      },
      manifest: null
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
  onLauncherArc(e, launcherArc) {
    this.state = {launcherArc};
  }
  onLauncherClick() {
    this.state = {arckey: ''};
  }
}

customElements.define('web-shell', WebShell);
