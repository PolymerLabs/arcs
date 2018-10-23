import '../deps/@polymer/app-route/app-location.js';
import '../deps/@polymer/app-route/app-route.js';
import '../deps/@polymer/iron-icons/iron-icons.js';
import '../deps/@polymer/iron-icons/social-icons.js';
import '../deps/@polymer/iron-icons/communication-icons.js';
import '../deps/@polymer/iron-pages/iron-pages.js';
import '../deps/@polymer/iron-selector/iron-selector.js';
import '../deps/@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../deps/@polymer/paper-item/paper-item.js';
import '../deps/@polymer/paper-listbox/paper-listbox.js';
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import './arcs-overview.js';
import './arcs-dataflow.js';
import './arcs-communication-channel.js';
import {MessengerMixin} from './arcs-shared.js';
import './arcs-notifications.js';
import './arcs-tracing.js';
import './arcs-pec-log.js';
import './strategy-explorer/strategy-explorer.js';
import './arcs-strategy-runner.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsDevtoolsApp extends MessengerMixin(PolymerElement) {
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
     --></div>
        <div><arcs-notifications id="notifications"></arcs-notifications></div>
      </header>
      <nav>
        <iron-selector selected="[[routeData.page]]" attr-for-selected="name" class="nav-list" role="navigation">
          <a name="overview" href="#overview"><iron-icon icon="timeline"></iron-icon><label>Overview</label></a>
          <a name="traces" href="#traces"><iron-icon icon="communication:clear-all"></iron-icon><label>Traces</label></a>
          <a name="dataflow" href="#dataflow"><iron-icon icon="swap-horiz"></iron-icon><label>Dataflow</label></a>
          <a name="pecLog" href="#pecLog"><iron-icon icon="group-work"></iron-icon><label>PEC Channel Log</label></a>
          <a name="strategyExplorer" href="#strategyExplorer"><iron-icon icon="settings-applications"></iron-icon><label>Strategy Explorer</label></a>
          <a name="strategyRunner" href="#strategyRunner"><iron-icon icon="av:repeat-one"></iron-icon><label>Strategy Runner</label></a>
        </iron-selector>
      </nav>
      <iron-pages selected="[[routeData.page]]" attr-for-selected="name" selected-attribute="active" role="main" id="pages">
        <arcs-overview name="overview"></arcs-overview>
        <arcs-tracing name="traces"></arcs-tracing>
        <arcs-dataflow id="dataflow" name="dataflow" query-params="{{queryParams}}"></arcs-dataflow>
        <arcs-pec-log name="pecLog"></arcs-pec-log>
        <strategy-explorer name="strategyExplorer"></strategy-explorer>
        <arcs-strategy-runner name="strategyRunner"></arcs-strategy-runner>
      </iron-pages>
    </div>
`;
  }

  static get is() { return 'arcs-devtools-app'; }

  ready() {
    super.ready();
    if (!chrome.devtools || !chrome.devtools.inspectedWindow || !chrome.devtools.inspectedWindow.tabId) {
      // Illuminate doesn't make sense if working with Arcs in NodeJS.
      this.$.illuminateToggle.style.display = 'none';
    }
    if (!this.routeData.page) {
      this.set('routeData.page', 'strategyExplorer');
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
}

window.customElements.define(ArcsDevtoolsApp.is, ArcsDevtoolsApp);
