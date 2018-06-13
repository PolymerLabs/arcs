import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import '../deps/@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../deps/@polymer/paper-item/paper-item.js';
import '../deps/@polymer/paper-fab/paper-fab.js';
import '../deps/@polymer/paper-input/paper-textarea.js';
import {MessageSenderMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsStrategyRunner extends MessageSenderMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        padding: 8px;
      }

      paper-fab {
        display: inline-block;
        margin-left: 8px;
      }

      paper-fab:not([disabled]) {
        background: var(--highlight-blue);
      }

      pre.error {
        color: red;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 120%;
      }

      .result {
        border: 1px solid var(--mid-gray);
        padding: 8px;
        margin-bottom: 8px;
      }

      .empty {
        font-style: italic;
      }
    </style>
    <paper-dropdown-menu class="strategy-selector" label="Strategy" horizontal-align="left">
      <paper-listbox slot="dropdown-content" selected="{{selectedStrategy}}" attr-for-selected="name">
        <template is="dom-repeat" items="[[strategies]]">
          <paper-item name="[[item]]">[[item]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
    <paper-fab id="runButton" mini="" disabled="" icon="av:play-arrow" on-tap="runPlanner"></paper-fab>
    <paper-textarea value="{{recipe}}"></paper-textarea>
    <template is="dom-if" if="[[error]]">
      <pre class="error">[[error]]</pre>
    </template>
    <template is="dom-repeat" items="[[results]]">
      <div class="result">
        <header>Result [[index]]</header>
        <pre>{{item.result}}</pre>
        <template is="dom-repeat" items="{{item.errors}}">
          <div><span>{{item.id}}</span><span>{{item.error}}</span></div>
        </template>
        <pre>{{item.normalized}}</pre>
      </div>
    </template>
    <template is="dom-if" if="[[isEmpty(results)]]">
      <div class="empty">[[selectedStrategy]] didn't return any results for this recipe.</div>
    </template>
`;
  }

  static get is() { return 'arcs-strategy-runner'; }

  static get properties() {
    return {
      arcId: String,
      recipe: String,
      strategies: Array,
      selectedStrategy: {
        type: String,
        observer: 'strategyChanged'
      },
      results: Array,
      error: String
    };
  }

  static get observers() {
    return ['checkReadyToRun(strategies.*, selectedStrategy, recipe)'];
  }

  onMessage(msg) {
    switch (msg.messageType) {
      case 'page-refresh':
        this.arcId = null;
        this.strategies = null;
        break;
      case 'arc-available':
        if (!this.arcId && !msg.messageBody.isSpeculative) {
          this.arcId = msg.messageBody.id;
          this.send({
            messageType: 'fetch-strategies',
            arcId: this.arcId
          });
        }
        break;
      case 'planner-strategies':
        this.set('strategies', msg.messageBody);
        break;
      case 'invoke-planner-result':
        this.error = msg.messageBody.error;
        this.results = msg.messageBody.results;
        break;
    }
  }

  runPlanner() {
    this.send({
      messageType: 'invoke-planner',
      messageBody: {
        recipe: this.recipe,
        strategy: this.selectedStrategy
      },
      arcId: this.arcId
    });
  }

  checkReadyToRun() {
    this.$.runButton.disabled = !(this.strategies && this.selectedStrategy && this.recipe);
  }

  strategyChanged() {
    this.error = undefined;
    this.results = undefined;
  }

  isEmpty(list) {
    return list !== undefined && list.length === 0;
  }
}

window.customElements.define(ArcsStrategyRunner.is, ArcsStrategyRunner);
