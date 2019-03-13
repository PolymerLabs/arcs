import '../deps/@polymer/app-route/app-location.js';
import '../deps/@polymer/app-route/app-route.js';
import '../deps/@polymer/iron-icons/iron-icons.js';
import '../deps/@polymer/iron-icons/device-icons.js';
import '../deps/@polymer/iron-icons/social-icons.js';
import '../deps/@polymer/iron-icons/communication-icons.js';
import '../deps/@polymer/iron-pages/iron-pages.js';
import '../deps/@polymer/iron-selector/iron-selector.js';
import {IronA11yKeysBehavior} from '../deps/@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js';
import {mixinBehaviors} from '../deps/@polymer/polymer/lib/legacy/class.js';
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import './arcs-overview.js';
import './arcs-stores.js';
import './arcs-planning.js';
import './arcs-communication-channel.js';
import {MessengerMixin} from './arcs-shared.js';
import './arcs-notifications.js';
import './arcs-tracing.js';
import './arcs-pec-log.js';
import './arcs-selector.js';
import './strategy-explorer/strategy-explorer.js';
import './arcs-recipe-editor.js';
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
        grid-template-columns: 1fr;
        grid-template-areas:
          "header"
          "main";
      }
      header {
        min-width: max-content;
        grid-area: header;
      }
      iron-selector {
        width: max-content;
        height: 27px;
      }
      iron-selector a {
        display: inline-block;
        height: 100%;
        color: #666;
        text-decoration: none;
        line-height: 24px;
        padding: 0 8px;
        box-sizing: border-box;
        vertical-align: bottom;
        border-bottom: 1px solid var(--mid-gray);
      }
      .header iron-selector a iron-icon {
        display: none;
      }
      iron-selector a.iron-selected {
        color: #444;
        border-color: #03a9f4;
      }
      iron-selector a:not(.iron-selected):hover {
        background-color: #eaeaea;
      }
      @media (max-width: 800px) {
        .header iron-selector a {
          font-size: 0;
          padding: 0;
        }
        .header iron-selector a iron-icon {
          display: inline-block;
          margin: 0;
        }
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
        margin: 0 6px 0 3px;
      }
      #search:hover {
        border-color: var(--mid-gray);
      }
      #search:focus {
        border-color: var(--focus-blue);
      }
      .invalidRegex {
        color: red;
      }
      arcs-notifications:not([visible])  + [divider] {
        display: none;
      }
    </style>
    <div id="container">
      <arcs-communication-channel></arcs-communication-channel>
      <app-location route="{{route}}" query-params="{{queryParams}}" use-hash-as-path="">
      </app-location>
      <app-route route="{{route}}" pattern=":page" data="{{routeData}}" tail="{{tail}}">
      </app-route>
      <header class="header">
        <div section>
          <arcs-notifications></arcs-notifications><div divider></div>
          <arcs-selector active-page="[[routeData.page]]"></arcs-selector>
          <div divider></div>
          <iron-selector selected="[[routeData.page]]" attr-for-selected="name" role="navigation">
            <a name="overview" href="#overview"><iron-icon icon="timeline" title="Overview"></iron-icon>Overview</a>
            <a name="stores" href="#stores"><iron-icon icon="device:sd-storage" title="Storage"></iron-icon>Storage</label></a>
            <a name="pecLog" href="#pecLog"><iron-icon icon="swap-horiz" title="Execution Log"></iron-icon>Execution Log</a>
            <a name="strategyExplorer" href="#strategyExplorer"><iron-icon icon="settings-applications" title="Strategizer"></iron-icon>Strategizer</a>
            <a name="planning" href="#planning"><iron-icon icon="line-weight" title="Planner"></iron-icon>Planner</a>
            <a name="traces" href="#traces"><iron-icon icon="communication:clear-all" title="Tracing"></iron-icon>Tracing</a>
            <a name="recipeEditor" href="#recipeEditor"><iron-icon icon="image:edit" title="Editor"></iron-icon>Editor</a>
          </iron-selector>
          <div divider></div>
          <input placeholder="Filter" id="search" value="{{searchTextInput::input}}" title="Focus: ctrl+f, Clear: ctrl+esc, Regex: ctrl+x">
          <input type="checkbox" id="regex" checked="{{searchRegexInput::change}}">
          <label for="regex">Regex</label>
        </div>
      </header>
      <iron-pages selected="[[routeData.page]]" attr-for-selected="name" selected-attribute="active" role="main" id="pages">
        <arcs-overview name="overview"></arcs-overview>
        <arcs-stores name="stores" search-params="[[searchParams]]"></arcs-stores>
        <arcs-tracing name="traces"></arcs-tracing>
        <arcs-pec-log name="pecLog" search-params="[[searchParams]]"></arcs-pec-log>
        <strategy-explorer name="strategyExplorer" search-params="[[searchParams]]"></strategy-explorer>
        <arcs-planning name="planning"></arcs-planning>
        <arcs-recipe-editor name="recipeEditor"></arcs-recipe-editor>
      </iron-pages>
    </div>
`;
  }

  static get is() { return 'arcs-devtools-app'; }

  static get properties() {
    return {
      searchTextInput: String,
      searchRegexInput: Boolean,
      searchParams: {
        type: Object,
        value: null,
      },
      keyEventTarget: {
        type: Object,
        value: function() {
          return document.body;
        }
      }
    };
  }

  static get observers() {
    return ['_onSearchChanged(searchTextInput, searchRegexInput)'];
  }

  ready() {
    super.ready();
    if (!this.routeData.page) {
      this.set('routeData.page', 'overview');
    }
  }

  // TODO: you can't enter '?' in the search field; it displays the console prefs page instead :-/
  // See https://bugs.chromium.org/p/chromium/issues/detail?id=923338
  _onSearchChanged(text, isRegex) {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.$.search.classList.remove('invalidRegex');
      if (!text) {
        this.searchParams = null;
      } else if (isRegex) {
        // Test that the regex is valid. Note that we don't pass the compiled RegExp in the params
        // because different receivers may use different flags for their searches.
        try {
          new RegExp(text);
        } catch (error) {
          this.$.search.classList.add('invalidRegex');
          return;
        }
        this.searchParams = {phrase: null, regex: text};
      } else {
        this.searchParams = {phrase: text.toLowerCase(), regex: null};
      }
    }, 100);
  }

  get keyBindings() {
    return {
      'ctrl+f': '_focus',
      // CTRL to avoid clashing with devtools toolbar showing/hiding, which I cannot supress.
      'ctrl+esc': '_clear',
      'ctrl+x': '_regex'
    };
  }

  _focus() {
    this.$.search.focus();
  }

  _clear() {
    this.$.search.value = '';
    this.searchTextInput = null;
    this.$.search.blur();
  }

  _regex() {
    this.$.regex.checked = !this.$.regex.checked;
    this.searchRegexInput = this.$.regex.checked;
  }
}

window.customElements.define(ArcsDevtoolsApp.is, ArcsDevtoolsApp);
