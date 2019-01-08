import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {formatTime, MessengerMixin} from './arcs-shared.js';
import './object-explorer.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsPlanning extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
        line-height: 24px;
        height: calc(100vh - 27px);
        overflow-y: scroll;
      }
      .title {
        background-color: var(--light-gray);
        border-bottom: 1px solid var(--mid-gray);
        padding: 4px;
        vertical-align: middle;
      }
      .subtitle {
        font-weight: bold;
        width: 150px;
        display: inline-block;
      }
      .content {
        background-color: white;
        border-bottom: 1px solid var(--mid-gray);
        display: flex;
        flex-direction: column;
      }
      object-explorer {
        margin: 2px 4px;
      }
      .empty {
        text-align: center;
        font-style: italic;
        color: var(--mid-gray);
        white-space: nowrap;
      }
      [hash]:not(:empty) {
        color: var(--devtools-purple);
        margin-right: 1ch;
        min-width: 50px;
      }
      [particles]:not(:empty) {
        color: var(--devtools-blue);
        margin-right: 1ch;
      }
      [description]:not(:empty) {
        color: var(--dark-gray);
        font-style: italic;
        font-size: 10px;
        margin-right: 1ch;
        width: 220px;
      }
      [date]:not(:empty) {
        color: var(--devtools-purple);
        margin-right: 1ch;
        min-width: 60px;
      }
    </style>
    <div class="title">Latest planning</div>
    <div>
      <span class="subtitle">Total suggestions</span>
      <span>{{lastPlanning.suggestions.length}}</span>
    </div>
    <div>
      <span class="subtitle">Last updated</span>
      <span>{{lastPlanning.formattedUpdated}}</span>
    </div>

    <div class="content">
      <template is="dom-repeat" items="{{lastPlanning.suggestions}}">
        <object-explorer object="{{item}}">
          <span hash>[[item.hash]]</span>
          <span description>[[item.descriptionText]]</span>
          <span particles>[[item.particleNames]]</span>
        </object-explorer>
      </template>
      <template is="dom-if" if="{{!lastPlanning.suggestions.length}}">
        <div class="empty">No suggestions in last planning</div>
      </template>
    </div>

    <div class="title">Previous replannings</div>
    <div class="content">
      <template is="dom-repeat" items="{{planningSessions}}">
        <object-explorer object="{{item}}">
          <span date>[[item.formattedUpdated]]</span>
          <span name>[[item.suggestions.length]]</span>
        </object-explorer>
      </template>
      <template is="dom-if" if="{{!planningSessions.length}}">
        <div class="empty">No planning sessions</div>
      </template>
    </div>

    </template>`;
  }

  static get is() { return 'arcs-planning'; }

  constructor() {
    super();
    this._reset();

    // TODO(mmandlis): mark which suggestions are visible.
    // TODO(mmandlis): display metadata of replanning attempts that didn't update the suggestions.
    // TODO(mmandlis): add indication and display what triggered the replanning.
    // TODO(mmandlis): going back to launcher arc, should show `null` arcs suggestions.
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'suggestions-changed':
          if (this.lastPlanning.updated === msg.messageBody.lastUpdated) {
            // Skip message, if the same planning info was reloaded.
            break;
          }
          if (this.lastPlanning.updated) {
            this.push('planningSessions', {
              updated: this.lastPlanning.updated,
              formattedUpdated: this.lastPlanning.formattedUpdated,
              suggestionsLength: msg.messageBody.suggestions.length
            });
          }
          this.lastPlanning = {
            updated: msg.messageBody.lastUpdated,
            formattedUpdated: formatTime(msg.messageBody.lastUpdated, 3),
            suggestions: msg.messageBody.suggestions.map(s => Object.assign(s, {
              particleNames: this._planParticleNamesToString(s.plan),
              descriptionText: this._formatDescriptionText(s.descriptionByModality.text)
            }))
          };
          break;
        case 'arc-selected':
        case 'page-refresh':
          this._reset();
          break;
      }
    }
  }
  _formatDescriptionText(text) {
    if (text.length <= 30) {
      return text;
    }
    return `${text.substring(0, 30)}...`;
  }
  _planParticleNamesToString(plan) {
    const countByName = plan.particles.reduce((acc, particle) => {
      if (!acc[particle.name]) {
         acc[particle.name] = 0;
      }
      ++acc[particle.name];
      return acc;},
    {});
    return Object.keys(countByName).map(name => `${name}${countByName[name] > 1 ? ` * ${countByName[name]}`: ''}`).join(', ');
  }

  _reset() {
    this.lastPlanning = {suggestions: []};
    this.planningSessions = [];
  }
}

window.customElements.define(ArcsPlanning.is, ArcsPlanning);
