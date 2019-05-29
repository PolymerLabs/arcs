/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {linkJack} from '../../../modalities/dom/components/link-jack.js';
import {generateId} from '../../../modalities/dom/components/generate-id.js';
import {Const} from '../../configuration/constants.js';
import {Xen} from '../../lib/components/xen.js';
import {Utils} from '../../lib/runtime/utils.js';
import '../../lib/elements/launcher-arc.js';
import './web-config.js';
import './web-arc.js';
import './web-context.js';
import './web-launcher.js';
import './web-planner.js';
import './ui/web-shell-ui.js';
//import './pipes/device-client-pipe.js';

const manifests = {
  context: `
    import 'https://$particles/canonical.manifest'
    import 'https://$particles/Profile/Sharing.recipe'
  `,
  launcher: `
    import 'https://$particles/Arcs/Launcher.recipe'
  `,
  pipes: `
    import 'https://$particles/Pipes/BackgroundPipes.recipes'
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
  <web-config arckey="{{arckey}}" on-config="onState"></web-config>
  <!-- ui chrome -->
  <web-shell-ui arc="{{arc}}" launcherarc="{{launcherArc}}" context="{{context}}" nullarc="{{nullArc}}" pipesarc="{{pipesArc}}" search="{{search}}" on-search="onState" showhint="{{showHint}}">
    <!-- launcher -->
    <launcher-arc id="launcher" hidden="{{hideLauncher}}" storage="{{storage}}" context="{{context}}" config="{{launcherConfig}}" on-arc="onLauncherArc"></launcher-arc>
    <!-- <web-arc id="launcher" hidden="{{hideLauncher}}" storage="{{storage}}" context="{{context}}" config="{{launcherConfig}}" on-arc="onLauncherArc"></web-arc> -->
    <!-- <web-launcher hidden="{{hideLauncher}}" storage="{{storage}}" context="{{context}}" info="{{info}}"></web-launcher> -->
    <!-- user arc -->
    <web-arc id="arc" hidden="{{hideArc}}" storage="{{storage}}" context="{{context}}" config="{{arcConfig}}" manifest="{{manifest}}" plan="{{plan}}" on-arc="onState"></web-arc>
    <!-- suggestions -->
    <div slot="suggestions" suggestions>
      <div slotid="suggestions" on-plan-choose="onChooseSuggestion"></div>
    </div>
  </web-shell-ui>
  <!-- user context -->
  <web-context storage="{{storage}}" context="{{precontext}}" on-context="onState"></web-context>
  <!-- web planner -->
  <web-planner config="{{config}}" arc="{{plannerArc}}" search="{{search}}" on-metaplans="onState" on-suggestions="onSuggestions"></web-planner>
  <!-- background arcs -->
  <web-arc id="nullArc" hidden storage="{{storage}}" config="{{nullConfig}}" context="{{context}}" on-arc="onNullArc"></web-arc>
  <!-- <web-arc id="folksArc" hidden storage="{{storage}}" config="{{folksConfig}}" context="{{context}}" on-arc="onFolksArc"></web-arc> -->
  <!-- <web-arc id="pipesArc" hidden storage="{{storage}}" config="{{pipesConfig}}" context="{{context}}" on-arc="onPipesArc"></web-arc> -->
  <!-- data pipes -->
  <device-client-pipe context="{{context}}" storage="{{storage}}" arc="{{arc}}" pipearc="{{pipesArc}}" suggestions="{{suggestions}}" on-search="onState" on-client-arc="onPipeClientArc" on-suggestion="onChooseSuggestion" on-spawn="onSpawn" on-reset="onReset"></device-client-pipe>
`;

const log = Xen.logFactory('WebShell', '#6660ac');

export class WebShell extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['root'];
  }
  get template() {
    return template;
  }
  get host() {
    return this;
  }
  attributeChangedCallback(n, old, value) {
    this[n] = value;
  }
  // TODO(sjmiles): only debug stuff in this override
  async _update(props, state, oldProps, oldState) {
    // globals stored for easy console access
    window.shell = this;
    window.arc = state.arc;
    window.context = state.context;
    super._update(props, state, oldProps, oldState);
  }
  async update(props, state) {
    // new config?
    if (state.config !== state._config) {
      const {config} = state;
      state._config = config;
      if (config) {
        state.storage = config.storage;
        state.arckey = config.arc;
        state.ready = true;
      }
    }
    if (state.ready) {
      this.readyUpdate(props, state);
    }
  }
  readyUpdate({root}, state) {
    // setup environment once we have a root and a user
    if (!state.env && root) {
      this.updateEnv({root}, state);
      this.spawnContext();
    }
    // spin up launcher arc
    if (!state.launcherConfig && state.env) {
      this.spawnLauncher();
    }
    // poll for arcs-store
    if (!state.store && state.launcherArc) {
      this.waitForStore(10);
    }
    // spin up nullArc
    if (!state.nullConfig && state.context && state.store) {
      this.spawnNullArc();
    }
    // spin up pipesArc
    // if (!state.pipesConfig && state.context) {
    //   this.spawnPipesArc();
    // }
    // consume a suggestion
    if (state.suggestion && state.context) {
      if (!this.state.arckey) {
        // spin up new arc
        this.spawnSuggestion(state.suggestion);
      } else {
        // add plan to existing arc
        this.state = {plan: state.suggestion.plan};
      }
      state.suggestion = null;
    }
    // consume an arckey
    if (state.env && state.arckey && state.context) {
      if (!state.arcConfig || state.arcConfig.id !== state.arckey) {
        // spin up arc from key
        this.spawnSerialization(state.arckey);
      }
    }
    // flush arc metadata to storage
    if (state.arc && state.arcMeta) {
      if (state.writtenArcMeta !== state.arcMeta) {
        state.writtenArcMeta = state.arcMeta;
        this.recordArcMeta(state.arcMeta);
      }
    }
    this.state = {hideLauncher: Boolean(state.arckey)};
  }
  render(props, state) {
    const {hideLauncher, showLogin, arc, nullArc} = state;
    const renderModel = {
      plannerArc: hideLauncher ? arc : nullArc,
      hideArc: showLogin ? true : !hideLauncher,
      hideLauncher: showLogin ? true : hideLauncher,
    };
    return [props, state, renderModel];
  }
  async updateEnv({root}, state) {
    // capture anchor-clicks for SPA behavior
    linkJack(document, anchor => this.routeLink(anchor));
    // configure arcs environment
    Utils.init(root);
    state.env = Utils.env;
  }
  routeLink(anchor) {
    const url = new URL(anchor.href, document.location);
    const params = url.searchParams;
    log('routeLink:', /*url,*/ anchor.href, Array.from(params.keys()));
    const arckey = params.get('arc') || '';
    // loopback not supported
    if (arckey !== this.state.arckey) {
      this.state = {arckey, search: ''};
    }
  }
  // TODO(sjmiles): use SyntheticStore instead, see web-context.js
  waitForStore(pollInterval) {
    const {launcherArc, store} = this.state;
    if (launcherArc && !store) {
      if (launcherArc._stores.length) {
        const store = launcherArc._stores.find(store => store.originalId === 'SYSTEM_arcs');
        //const store = launcherArc._stores.pop();
        if (store) {
          this.state = {store: store};
          store.on('change', info => this.state = {info}, this);
          return;
        }
      }
    }
    setTimeout(() => this.waitForStore(), pollInterval);
  }
  applySuggestion(suggestion) {
    if (!this.state.arckey) {
      this.spawnSuggestion(suggestion);
    } else {
      this.state = {plan: suggestion.plan};
    }
  }
  async spawnContext() {
    const precontext = await Utils.parse(manifests.context);
    this.state = {
      precontext,
      contextConfig: {
        id: `${Const.DEFAULT.userId}-context`
      }
    };
  }
  spawnLauncher() {
    this.state = {
      launcherConfig: {
        id: `${Const.DEFAULT.userId}${Const.DEFAULT.launcherSuffix}`,
        manifest: manifests.launcher
      }
    };
  }
  spawnNullArc() {
    this.state = {
      nullConfig: this.configureBgArc('planning')
    };
  }
  // spawnPipesArc() {
  //   const pipesConfig = this.configureBgArc('pipes');
  //   pipesConfig.manifest = manifests.pipes;
  //   this.state = {
  //     pipesConfig
  //   };
  // }
  spawnSerialization(key) {
    this.state = {
      search: '',
      arc: null,
      arckey: key,
      arcConfig: {
        id: key,
        suggestionContainer: this.getSuggestionSlot()
      }
    };
  }
  spawnSuggestion(suggestion) {
    const luid = generateId();
    const id = `${Const.DEFAULT.userId}-${luid}`;
    const description = suggestion.descriptionText;
    this.spawnArc({id, manifest: null, description});
    this.state = {plan: suggestion.plan};
  }
  spawnArc({id, manifest, description}) {
    //log(id, manifest);
    const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    this.state = {
      search: '',
      arc: null,
      arckey: id,
      arcMeta: {
        key: id,
        href: `?arc=${id}`,
        description,
        color,
        touched: Date.now()
      },
      // TODO(sjmiles): see web-arc.js for why there are two things called `manifest`
      arcConfig: {
        id,
        manifest,
        suggestionContainer: this.getSuggestionSlot()
      },
      manifest: null
    };
  }
  configureBgArc(name)  {
    const key = `${Const.DEFAULT.userId}-${name.toLowerCase()}`;
    // this.recordArcMeta({
    //   key: key,
    //   href: `?arc=${key}`,
    //   description: `${name} arc`,
    //   color: 'silver',
    //   touched: 0
    // });
    return {
      id: key,
      suggestionContainer: this.getSuggestionSlot()
    };
  }
  getSuggestionSlot() {
    return this._dom.$('[slotid="suggestions"]');
  }
  async recordArcMeta(meta) {
    if (this.state.store) {
      await this.state.store.store({id: meta.key, rawData: meta}, [generateId()]);
    } else {
      log('failed to record arc metadata: no store');
    }
  }
  openLauncher() {
    this.state = {
      search: '',
      arckey: ''
    };
  }
  onLauncherArc(e, launcherArc) {
    this.state = {launcherArc};
  }
  onNullArc(e, nullArc) {
    this.state = {nullArc};
  }
  // onPipesArc(e, pipesArc) {
  //   this.state = {pipesArc};
  // }
  onSuggestions(e, suggestions) {
    const showHint = Boolean(suggestions.length);
    this.state = {suggestions, showHint};
    if (showHint) {
      // latch showHint
      // TODO(sjmiles): needs debouncing
      // TODO(sjmiles): logic in handler is a bad practice
      setTimeout(() => this.state = {showHint: false}, 0);
    }
  }
  onChooseSuggestion(e, suggestion) {
    log('onChooseSuggestion', suggestion);
    this.state = {suggestion};
  }
  onPipeClientArc(e, arc) {
    // TODO(sjmiles): `arc.key` is ad-hoc data from device-client-pipe
    const key = arc.key;
    this.recordArcMeta({
      key: key,
      href: `?arc=${key}`,
      description: `Piped Data Arc`,
      color: 'purple',
      touched: Date.now()
    });
  }
  onSpawn(e, {id, manifest, description}) {
    const color = ['purple', 'blue', 'green', 'orange', 'brown'][Math.floor(Math.random()*5)];
    this.state = {
      search: '',
      arc: null,
      arckey: id,
      arcMeta: {
        key: id,
        href: `?arc=${id}`,
        description,
        color,
        touched: Date.now()
      },
      // TODO(sjmiles): see web-arc.js for why there are two things called `manifest`
      arcConfig: {
        id: id,
        manifest,
        suggestionContainer: this.getSuggestionSlot()
      },
      manifest: null
    };
  }
  onReset() {
    this.openLauncher();
  }
}

customElements.define('web-shell', WebShell);
