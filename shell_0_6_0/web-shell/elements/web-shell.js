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
import './web-launcher.js';
import './web-planner.js';
import './ui/web-shell-ui.js';
import './pipes/device-client-pipe.js';

// disable flushing template cache on dispose
SlotDomConsumer.multitenant = true;

const manifests = {
  context: `
    import 'https://$artifacts/canonical.manifest'
    import 'https://$artifacts/Profile/Sharing.recipe'
  `,
  launcher: `
    import 'https://$artifacts/Arcs/Launcher.recipe'
  `
};

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
    [hidden] {
      display: none;
    }
    [suggestions] {
      background-color: silver;
    }
    [slotid=suggestions] {
      background-color: white;
    }
  </style>
  <!-- manage configuration (read and persist) -->
  <web-config userid="{{userid}}" arckey="{{arckey}}" on-config="onState"></web-config>
  <!-- context bootstrap -->
  <web-arc id="context" env="{{env}}" storage="volatile://context" config="{{contextConfig}}" context="{{precontext}}"></web-arc>
  <!-- context feed -->
  <user-context env="{{env}}" storage="{{storage}}" userid="{{userid}}" context="{{precontext}}" arcstore="{{store}}" on-context="onState"></user-context>
  <!-- web planner -->
  <web-planner env="{{env}}" config="{{config}}" userid="{{userid}}" arc="{{plannerArc}}" search="{{search}}"></web-planner>
  <!-- ui chrome -->
  <web-shell-ui arc="{{arc}}" context="{{context}}" on-search="onState">
    <!-- launcher -->
    <web-arc id="launcher" hidden="{{hideLauncher}}" env="{{env}}" storage="{{storage}}" context="{{context}}" config="{{launcherConfig}}" on-arc="onLauncherArc"></web-arc>
    <!-- <web-launcher hidden="{{hideLauncher}}" env="{{env}}" storage="{{storage}}" context="{{context}}" info="{{info}}"></web-launcher> -->
    <!-- other arcs -->
    <web-arc id="nullArc" hidden env="{{env}}" storage="{{storage}}" config="{{nullConfig}}" context="{{context}}" on-arc="onNullArc"></web-arc>
    <web-arc id="arc" hidden="{{hideArc}}" env="{{env}}" storage="{{storage}}" context="{{context}}" config="{{arcConfig}}" manifest="{{manifest}}" plan="{{plan}}" on-arc="onState"></web-arc>
    <!-- suggestions -->
    <div slot="suggestions" suggestions>
      <div slotid="suggestions" on-plan-choose="onChooseSuggestion"></div>
    </div>
  </web-shell-ui>
  <!-- data pipes -->
  <device-client-pipe env="{{env}}" userid="{{userid}}" context="{{context}}" storage="{{storage}}"></device-client-pipe>
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
    // globals stored for easy console access
    window.shell = this;
    window.arc = state.arc;
    //
    if (state.config !== state._config) {
      state._config = state.config;
      if (state.config) {
        state.userid = state.config.userid;
        state.arckey = state.config.arckey;
      }
    }
    if (!state.env && root) {
      this.updateEnv({root}, state);
      this.spawnContext();
      //this.handrollSuggestions();
    }
    if (!state.store && state.launcherArc) {
      this.waitForStore(10);
    }
    if (state.store && !state.pipesInit) {
      state.pipesInit = true;
      this.recordPipesArc(state.userid);
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
    if (!state.launcherConfig && state.env) {
      // spin up launcher arc
      this.spawnLauncher();
    }
    if (!state.nullConfig && state.context) {
      // spin up nullArc
      this.spawnNullArc();
    }
    // if (state.arc && state.pendingSuggestion) {
    //   const plan = state.pendingSuggestion.plan;
    //   state.pendingSuggestion = null;
    //   state.arc.instantiate(plan);
    // }
    this.state = {hideLauncher: Boolean(state.arckey)};
  }
  render(props, state) {
    state.plannerArc = state.hideLauncher ? state.arc : state.nullArc;
    state.hideArc = !state.hideLauncher;
    return [props, state];
  }
  async updateEnv({root}, state) {
    // capture anchor-clicks for SPA behavior
    linkJack(document, anchor => this.routeLink(anchor));
    // create arcs web-environment
    state.env = new ArcsEnvWeb(root);
    // map in 0_6_0 paths
    Object.assign(state.env.pathMap, {
      'https://$shell/': `${root}/shell_0_6_0/`,
      'https://$artifacts/': `${root}/artifacts_0_6_0/`,
      'https://$shell/build/': `${root}/shell/build/`
    });
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
    const precontext = await this.state.env.parse(manifests.context);
    this.state = {
      precontext,
      contextConfig: {
        id: `${this.state.userid}-context`
      }
    };
  }
  spawnLauncher() {
    this.state = {
      launcherConfig: {
        id: `${this.state.userid}-launcher`,
        manifest: manifests.launcher
      }
    };
  }
  spawnNullArc() {
    this.state = {
      nullConfig: {
        id: `${this.state.userid}-null`,
        suggestionContainer: this._dom.$('[slotid="suggestions"]')
      }
    };
  }
  // handrollSuggestions() {
  //   const suggestions = [
  //     //`Arcs/Login.recipe`,
  //     //`Profile/EchoUser.recipe`
  //     `Demo/ProductsDemo.recipe`,
  //     `Demo/RestaurantsDemo.recipes`,
  //     `Demo/TVMazeDemo.recipes`,
  //     `Music/Playlist.recipe`,
  //     `Profile/BasicProfile.recipe`,
  //     `Restaurants/Restaurants.recipes`,
  //     `Reservations/Reservations.recipes`
  //   ];
  //   const slot = this.host.querySelector(`[suggestions]`);
  //   if (slot) {
  //     suggestions.forEach(suggestion => {
  //       slot.appendChild(Object.assign(document.createElement(`suggestion-element`), {
  //         suggestion,
  //         innerText: suggestion.split('/').pop().split('.').shift()
  //       }))
  //       .addEventListener('plan-choose', () => this.applyHandrolledSuggestion(suggestion));
  //     });
  //   }
  // }
  // applyHandrolledSuggestion(suggestion) {
  //   if (this.state.arckey) {
  //     this.state = {manifest: `import 'https://$artifacts/${suggestion}'`};
  //   } else {
  //     this.spawnHandrolledArc(suggestion);
  //   }
  // }
  // spawnHandrolledArc(recipeName) {
  //   const luid = generateId();
  //   //const id = `${this.state.userid}-${luid}`;
  //   const id = `${this.state.userid}/${luid}`;
  //   const manifest = `import 'https://$artifacts/${recipeName}'`;
  //   this.state = {
  //     arc: null,
  //     arckey: id,
  //     // TODO(sjmiles): see web-arc.js for explanation of manifest confusion
  //     arcConfig: {id, manifest},
  //     manifest: null
  //   };
  //   const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
  //   this.recordArcMeta({
  //     key: id,
  //     href: `?arc=${id}`,
  //     description: `${recipeName.split('/').pop().split('.').shift()}`,
  //     color,
  //     touched: Date.now()
  //   });
  // }
  applySuggestion(suggestion) {
    if (!this.state.arckey) {
      this.spawnArc(suggestion);
    }
    this.state = {plan: suggestion.plan};
  }
  spawnArc(suggestion) {
    const luid = generateId();
    const key = `${this.state.userid}-${luid}`;
    //const id = `${this.state.userid}/${luid}`;
    const manifest = null; //`import 'https://$artifacts/${recipe}'`;
    this.state = {
      arc: null,
      arckey: key,
      // TODO(sjmiles): see web-arc.js for explanation of manifest confusion
      arcConfig: {id: key, manifest},
      manifest: null
    };
    const description = suggestion.descriptionText;
    const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    this.recordArcMeta({
      key,
      href: `?arc=${key}`,
      description,
      color,
      touched: Date.now()
    });
  }
  async recordArcMeta(meta) {
    const {store} = this._state;
    if (store) {
      await store.store({id: meta.key, rawData: meta}, [generateId()]);
    }
  }
  recordPipesArc(userid) {
    const pipesKey = `${userid}-pipes`;
    this.recordArcMeta({
      key: pipesKey,
      href: `?arc=${pipesKey}`,
      description: `Pipes!`,
      color: 'silver',
      touched: Date.now()
    });
  }
  onLauncherClick() {
    this.state = {arckey: ''};
  }
  onLauncherArc(e, launcherArc) {
    this.state = {launcherArc};
  }
  onNullArc(e, nullArc) {
    this.state = {nullArc};
  }
  onChooseSuggestion(e, suggestion) {
    log('onChooseSuggestion', suggestion);
    this.applySuggestion(suggestion);
  }
}

customElements.define('web-shell', WebShell);
