import '../deps/@polymer/app-route/app-location.js';
import '../deps/@polymer/app-route/app-route.js';
import '../deps/@polymer/iron-icons/iron-icons.js';
import '../deps/@polymer/iron-icons/device-icons.js';
import '../deps/@polymer/iron-icons/social-icons.js';
import '../deps/@polymer/iron-icons/communication-icons.js';
import '../deps/@polymer/iron-pages/iron-pages.js';
import '../deps/@polymer/iron-selector/iron-selector.js';
import '../deps/@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../deps/@polymer/paper-item/paper-item.js';
import '../deps/@polymer/paper-listbox/paper-listbox.js';
import {IronA11yKeysBehavior} from '../deps/@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js';
import {mixinBehaviors} from '../deps/@polymer/polymer/lib/legacy/class.js';
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import './arcs-overview.js';
import './arcs-stores.js';
import './arcs-communication-channel.js';
import {MessengerMixin} from './arcs-shared.js';
import './arcs-notifications.js';
import './arcs-tracing.js';
import './arcs-pec-log.js';
import './arcs-selector.js';
import './strategy-explorer/strategy-explorer.js';
import './arcs-strategy-runner.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsDevtoolsApp extends mixinBehaviors([IronA11yKeysBehavior], MessengerMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
      }
      #container {
        height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr;
        grid-template-columns: 200px 1fr;
        grid-template-areas:
          "header header"
          "sidebar main";
      }
      #container[nav-narrow] {
        grid-template-columns: 36px 1fr;
      }
      header {
        grid-area: header;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: var(--light-gray);
        border-bottom: 1px solid var(--mid-gray);
        padding: 1px;
        line-height: 0;
      }
      header > div {
        display: flex;
        align-items: center;
      }
      .nav-toggle {
        -webkit-mask-position: -112px 192px;
      }
      #container[nav-narrow] .nav-toggle {
        -webkit-mask-position: -167px 120px;
      }
      header iron-icon {
        display: inline-block;
        width: 28px;
        height: 24px;
        vertical-align: unset;
        color: rgb(110, 110, 110);
      }
      header iron-icon[active] {
        color: var(--highlight-blue);
      }
      header [divider] {
        background-color: #ccc;
        width: 1px;
        margin: 4px 5px;
        height: 16px;
      }
      nav {
        grid-area: sidebar;
        background-color: var(--light-gray);
        border-right: 1px solid var(--mid-gray);
        box-sizing: border-box;
      }
      iron-pages {
        grid-area: main;
        position: relative;
      }
      iron-pages > * {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
      }
      #search {
        outline: 0;
        border: 1px solid white;
        padding: 2px;
        margin: 0 3px;
      }
      #search:hover {
        border-color: var(--mid-gray);
      }
      #search:focus {
        border-color: var(--focus-blue);
      }
    </style>
    <div id="container" nav-narrow="">
      <arcs-communication-channel></arcs-communication-channel>
      <app-location route="{{route}}" query-params="{{queryParams}}" use-hash-as-path="">
      </app-location>
      <app-route route="{{route}}" pattern=":page" data="{{routeData}}" tail="{{tail}}">
      </app-route>
      <header>
        <div><!--
          --><div class="devtools-icon nav-toggle" on-click="toggleNav"></div><!--
          --><iron-icon id="illuminateToggle" title="Illuminate Particles" icon="select-all" on-click="toggleIlluminate"></iron-icon><!--
         --><div divider></div><!--
         --><arcs-selector></arcs-selector><!--
         --><div divider></div><!--
         --><input placeholder="Filter" id="search" value="{{searchInputPhrase::input}}" title="Focus: ctrl+f, Clear: ctrl+esc">
        </div>
        <div>
          <arcs-notifications id="notifications"></arcs-notifications>
        </div>
      </header>
      <nav>
        <iron-selector selected="[[routeData.page]]" attr-for-selected="name" class="nav-list" role="navigation">
          <a name="overview" href="#overview"><iron-icon icon="timeline"></iron-icon><label>Overview</label></a>
          <a name="stores" href="#stores"><iron-icon icon="device:sd-storage"></iron-icon><label>Stores Explorer</label></a>
          <a name="traces" href="#traces"><iron-icon icon="communication:clear-all"></iron-icon><label>Traces</label></a>
          <a name="pecLog" href="#pecLog"><iron-icon icon="swap-horiz"></iron-icon><label>PEC Channel Log</label></a>
          <a name="strategyExplorer" href="#strategyExplorer"><iron-icon icon="settings-applications"></iron-icon><label>Strategy Explorer</label></a>
          <!-- Not working for now. New version coming at some point.
          <a name="strategyRunner" href="#strategyRunner"><iron-icon icon="av:repeat-one"></iron-icon><label>Strategy Runner</label></a>-->
        </iron-selector>
      </nav>
      <iron-pages selected="[[routeData.page]]" attr-for-selected="name" selected-attribute="active" role="main" id="pages">
        <arcs-overview name="overview"></arcs-overview>
        <arcs-stores name="stores" search-phrase="[[searchPhrase]]"></arcs-stores>
        <arcs-tracing name="traces"></arcs-tracing>
        <arcs-pec-log name="pecLog" search-phrase="[[searchPhrase]]"></arcs-pec-log>
        <strategy-explorer name="strategyExplorer" search-phrase="[[searchPhrase]]"></strategy-explorer>
        <!-- Not working for now. New version coming at some point.
        <arcs-strategy-runner name="strategyRunner"></arcs-strategy-runner>-->
      </iron-pages>
    </div>
`;
  }

  static get is() { return 'arcs-devtools-app'; }

  static get properties() {
    return {
      searchPhrase: String,
      searchInputPhrase: {
        type: String,
        observer: '_onSearchPhraseChanged'
      },
      keyEventTarget: {
        type: Object,
        value: function() {
          return document.body;
        }
      }
    };
  }

  ready() {
    super.ready();
    if (!chrome.devtools || !chrome.devtools.inspectedWindow || !chrome.devtools.inspectedWindow.tabId) {
      // Illuminate doesn't make sense if working with Arcs in NodeJS.
      this.$.illuminateToggle.style.display = 'none';
    }
    if (!this.routeData.page) {
      this.set('routeData.page', 'overview');
    }
  }

  toggleNav() {
    if (this.$.container.hasAttribute('nav-narrow')) {
      this.$.container.removeAttribute('nav-narrow');
    } else {
      this.$.container.setAttribute('nav-narrow', '');
    }
  }

  toggleIlluminate() {
    if (this.$.illuminateToggle.hasAttribute('active')) {
      this.$.illuminateToggle.removeAttribute('active');
      this.send({messageType: 'illuminate', messageBody: 'off'});
    } else {
      this.$.illuminateToggle.setAttribute('active', '');
      this.send({messageType: 'illuminate', messageBody: 'on'});
    }
  }

  _onSearchPhraseChanged(phrase) {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.searchPhrase = phrase || null;
      this.searchDebounce = null;
    }, 100);
  }

  get keyBindings() {
    return {
      'ctrl+f': '_focus',
      // CTRL to avoid clashing with devtools toolbar showing/hiding, which I cannot supress.
      'ctrl+esc': '_clear'
    };
  }

  _focus() {
    this.$.search.focus();
  }

  _clear(e) {
    this.$.search.value = '';
    this.searchPhrase = null;
    this.$.search.blur();
  }
}

window.customElements.define(ArcsDevtoolsApp.is, ArcsDevtoolsApp);
