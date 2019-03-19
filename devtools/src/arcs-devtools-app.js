import '../deps/@polymer/app-route/app-location.js';
import '../deps/@polymer/app-route/app-route.js';
import '../deps/@polymer/iron-icons/iron-icons.js';
import '../deps/@polymer/iron-icons/device-icons.js';
import '../deps/@polymer/iron-icons/social-icons.js';
import '../deps/@polymer/iron-icons/communication-icons.js';
import '../deps/@polymer/iron-pages/iron-pages.js';
import '../deps/@polymer/iron-selector/iron-selector.js';
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
      @media (max-width: 600px) {
        .header iron-selector a {
          font-size: 0;
          padding: 0;
        }
        .header iron-selector a iron-icon {
          display: inline-block;
          margin: 0;
        }
      }
      .header iron-selector a [tab-header] {
        vertical-align: middle;
        line-height: 27px;
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
            <a name="overview" href="#overview"><iron-icon icon="timeline" title="Overview"></iron-icon><span tab-header>Overview</span></a>
            <a name="stores" href="#stores"><iron-icon icon="device:sd-storage" title="Storage"></iron-icon><span tab-header>Storage</span></a>
            <a name="pecLog" href="#pecLog"><iron-icon icon="swap-horiz" title="Execution Log"></iron-icon><span tab-header>Execution Log</span></a>
            <a name="strategyExplorer" href="#strategyExplorer"><iron-icon icon="settings-applications" title="Strategizer"></iron-icon><span tab-header>Strategizer</span></a>
            <a name="planning" href="#planning"><iron-icon icon="line-weight" title="Planner"></iron-icon><span tab-header>Planner</span></a>
            <a name="traces" href="#traces"><iron-icon icon="communication:clear-all" title="Tracing"></iron-icon><span tab-header>Tracing</span></a>
            <a name="recipeEditor" href="#recipeEditor"><iron-icon icon="image:edit" title="Editor"></iron-icon><span tab-header>Editor</span></a>
          </iron-selector>
        </div>
      </header>
      <iron-pages selected="[[routeData.page]]" attr-for-selected="name" selected-attribute="active" role="main" id="pages">
        <arcs-overview name="overview"></arcs-overview>
        <arcs-stores name="stores"></arcs-stores>
        <arcs-tracing name="traces"></arcs-tracing>
        <arcs-pec-log name="pecLog"></arcs-pec-log>
        <strategy-explorer name="strategyExplorer"></strategy-explorer>
        <arcs-planning name="planning"></arcs-planning>
        <arcs-recipe-editor name="recipeEditor"></arcs-recipe-editor>
      </iron-pages>
    </div>
`;
  }

  static get is() { return 'arcs-devtools-app'; }

  ready() {
    super.ready();
    if (!this.routeData.page) {
      this.set('routeData.page', 'overview');
    }
  }
}

window.customElements.define(ArcsDevtoolsApp.is, ArcsDevtoolsApp);
