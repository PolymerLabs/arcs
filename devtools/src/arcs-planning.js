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
      .refresh {
        -webkit-mask-position: -165px 0px;
        cursor: pointer;
        transition: transform .5s;
        vertical-align: middle;
      }
      [hash]:not(:empty) {
        color: var(--devtools-purple);
        display: inline-block;
        margin-right: 1ch;
        min-width: 50px;
      }
      [particles]:not(:empty) {
        color: var(--devtools-blue);
        display: inline-block;
        margin-right: 1ch;
      }
      [description]:not(:empty) {
        color: var(--dark-gray);
        display: inline-block;
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
      .visible-suggestion {
        background-color: lightgreen;
      }
      [prevDate] {
        display: inline-block;
        min-width: 100px;
      }
      [prevTrigger] {
        display: inline-block;
        min-width: 100px;
      }
      [prevLength] {
        display: inline-block;
        min-width: 200px;
      }
      .inactive {
        background-color: lightgrey;
      }
      .cancelled {
        background: repeating-linear-gradient(45deg, white, white 5px, lightgrey 5px, lightgrey 10px);
      }
    </style>
    <div class="title">
      Latest planning
      <span class="devtools-icon refresh" on-click="_forceReplan"></span>
    </div>
    <div>
      <span class="subtitle">Total suggestions</span>
      <span>{{lastPlanning.suggestions.length}}</span>
    </div>
    <div>
      <span class="subtitle">Last updated</span>
      <span>{{lastPlanning.formattedUpdated}}</span>
    </div>
    <div>
      <span class="subtitle">Trigger</span>
      <span>[[_formatTrigger(lastPlanning.metadata)]]</span>
    </div>

    <div class="content">
      <template is="dom-repeat" items="{{lastPlanning.suggestions}}">
        <object-explorer object="{{item}}">
          <div class$="[[_getClass(item.isVisible)]]">
            <span hash>[[item.hash]]</span>
            <span description>[[item.descriptionText]]</span>
            <span particles>[[item.particleNames]]</span>
          </div>
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
          <div class$="[[_getPrevClass(item.cancelled, item.inactive)]]">
            <span prevDate>[[item.formattedUpdated]]</span>
            <span prevLength>Produced [[_getLength(item.suggestions)]] suggestions</span>
            <span prevTrigger>[[_formatTrigger(item.metadata)]]</span>
        </div>
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
  }

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'suggestions-changed':
          if (this.lastPlanning.updated === msg.messageBody.lastUpdated &&
              this.lastPlanning.suggestions.length === msg.messageBody.suggestions.length &&
              this.lastPlanning.suggestions.every(last => msg.messageBody.suggestions.some(
                  s => s.hash === last.hash && s.descriptionText === last.descriptionText))) {
            // The update contains an already seen planning result.
            if ((!this.lastPlanning.metadata || !this.lastPlanning.metadata.trigger) &&
                msg.messageBody.metadata && msg.messageBody.metadata.trigger) {
              // The metadata might be missing, if the update from PlanConsumer came before the
              // one in PlanProducer. This issue will be resolved once metadata is stored
              // alongside the suggestion.
              const combinedMetadata = Object.assign({}, this.lastPlanning.metadata, msg.messageBody.metadata);
              this.set(`lastPlanning.metadata`, combinedMetadata);
              this.set(`planningSessions.0.metadata`, combinedMetadata);
            }
            // Skip message, if the same planning info was reloaded.
            break;
          }
          if (this.lastPlanning.updated === msg.messageBody.lastUpdated) {
            console.warn('Unsupported duplicate update with the same timestamp.');
          }
          if (this.lastPlanning.updated) {
            this.splice('planningSessions', 0, 0, {
              updated: this.lastPlanning.updated,
              formattedUpdated: this.lastPlanning.formattedUpdated,
              suggestions: msg.messageBody.suggestions,
              metadata: msg.messageBody.metadata || {}
            });
          }
          this.lastPlanning = {
            updated: msg.messageBody.lastUpdated,
            formattedUpdated: formatTime(msg.messageBody.lastUpdated, 3),
            suggestions: msg.messageBody.suggestions.map(s => Object.assign(s, {
              particleNames: this._planParticleNamesToString(s),
              descriptionText: this._formatDescriptionText(s.descriptionByModality.text),
              isVisible: s.isVisible
            })),
            metadata: msg.messageBody.metadata || {}
          };
          break;
        case 'visible-suggestions-changed':
          for (const index in this.lastPlanning.suggestions) {
            this.set(`lastPlanning.suggestions.${index}.isVisible`,
                msg.messageBody.visibleSuggestionHashes.some(
                    hash => hash === this.lastPlanning.suggestions[index].hash));
          }
          break;
        case 'planning-attempt': {
          const updated = new Date().getTime();
          this.splice('planningSessions', 0, 0, {
            updated,
            formattedUpdated: formatTime(updated, 3),
            suggestions: msg.messageBody.suggestions,
            metadata: msg.messageBody.metadata || {},
            inactive: true,
            cancelled: !msg.messageBody.suggestions,
          });
          break;
        }
        case 'arc-selected':
          this._reset();
          this.arcId = msg.messageBody.arcId;
          break;
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
    return `[${Object.keys(countByName).map(name => `${name}${countByName[name] > 1 ? ` * ${countByName[name]}`: ''}`).join(', ')}]`;
  }

  _formatTrigger(metadata) {
    if (!metadata) {
      return '';
    }
    switch (metadata.trigger) {
      case 'search':
        return `${metadata.trigger} (${metadata.search})`;
      case 'plan-instantiated':
        return `instantiated [${metadata.particleNames}]`;
      default:
        return metadata.trigger ? `${metadata.trigger}`: 'unknown';
    }
  }

  _forceReplan(e) {
    this.send({
      messageType: 'force-replan',
      arcId: this.arcId
    });
    if (e) e.cancelBubble = true;
  }

  _reset() {
    this.lastPlanning = {suggestions: []};
    this.planningSessions = [];
  }

  _getClass(isVisible) {
    return isVisible ? 'visible-suggestion' : '';
  }

  _getPrevClass(cancelled, inactive) {
    return cancelled ? 'cancelled' : inactive ? 'inactive' : '';
  }

  _getLength(suggestions) {
    return suggestions ? suggestions.length : 'n/a';
  }
}

window.customElements.define(ArcsPlanning.is, ArcsPlanning);
