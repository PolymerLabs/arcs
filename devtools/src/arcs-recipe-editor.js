/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import '../deps/@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';
import '../deps/@vaadin/vaadin-split-layout/vaadin-split-layout.js';
import {MessengerMixin, recipeHtmlify} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsRecipeEditor extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
      }
      vaadin-split-layout {
        height: calc(100vh - 54px)
      }
      [mode] {
        padding: 0 8px;
        cursor: pointer;
      }
      .triangle {
        margin-left: 12px;
      }
      iron-dropdown {
        padding: 8px 0;
        min-width: 200px;
      }
      header [section][status] {
        margin-right: 8px;
      }
      [list] {
        /* Overrides attributes set by the iron-dropdown */
        max-width: 50vw !important;
        max-height: 70vh !important;
      }
      [entry] {
        line-height: 20px;
      }
      [entry][header] {
        color: var(--dark-gray);
        padding: 4px 12px;
      }
      [entry][selection] {
        cursor: pointer;
        padding: 4px 20px;
      }
      [entry][selection]:hover {
        color: #fff;
        background-color: var(--highlight-blue);
      }
      [editor] {
        height: calc(100vh - 54px);
        position: relative;
        overflow: scroll;
      }
      #underline {
        position: absolute;
        margin-top: -3px;
        margin-left: 4px;
        border-bottom: 3px dotted red;
        pointer-events: none;
        z-index: 1;
        font-family: Menlo, monospace;
      }
      iron-autogrow-textarea {
        width: 100%;
        border: 0;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
        --iron-autogrow-textarea: {
          width: 100%;
          min-height: calc(100vh - 57px);
          box-sizing: border-box;
          resize: none;
          border: 0;
          padding: 0 4px;
          font-family: Menlo, monospace;
          font-size: 12px;
          line-height: 18px;
          white-space: nowrap;
          background-image: linear-gradient(#fff 50%, #fafafa 50%);
          background-size: 100% 36px;
          outline: 0;
        }
      }
      [none] {
        font-style: italic;
        color: var(--dark-gray);
      }
      [none][padding] {
        padding: 8px;
      }
      [result] {
        margin: 8px;
        margin-left: 4px;
        border: 1px solid var(--mid-gray);
        box-shadow: var(--drop-shadow);
      }
      [derivation] {
        padding: 4px;
        font-family: Menlo, monospace;
        border-bottom: 1px solid var(--mid-gray);
      }
      [derivation] > div {
        margin: 8px 8px;
      }
      [result] pre {
        box-sizing: border-box;
        border: 0;
        padding: 0 4px;
        margin: 0;
        font-family: Menlo, monospace;
        font-size: 12px;
        line-height: 18px;
        background-image: linear-gradient(#ececec 50%, #f3f3f3 50%);
        background-size: 100% 36px;
        word-break: break-all;
        white-space: pre-wrap;
      }
      [result] pre [unresolved] {
        color: red;
      }
      [result] pre [comment] {
        color: blue;
      }
      [result] [error] {
        background: #fff0f0;
        overflow: auto;
      }
      [result] [error] pre {
        padding: 4px;
        color: red;
        background: transparent;
      }
      [suggestion] {
        background-color: white;
        border: 1px solid var(--mid-gray);
        margin: 8px;
        padding: 12px 12px 4px 36px;
        position: relative;
      }
      [suggestion] > iron-icon {
        position: absolute;
        color: var(--focus-blue);
        left: 8px;
        top: 8px;
      }
      [suggestion] [message] {
        margin-bottom: 8px;
      }
      [suggestionactionitem] {
        border: 1px solid var(--focus-blue);
        padding: 8px 12px;
        margin-bottom: 8px;
        border-radius: 9px;
        cursor: pointer;
        width: fit-content;
      }
      [suggestionactionitem]:not(:first-child) {
        border-color: var(--mid-gray);
        color: var(--mid-gray);
      }
      [suggestionactionitem]:hover {
        background-color: var(--light-focus-blue);
        border-color: var(--focus-blue);
        color: black;
      }
    </style>
    <header class="header">
      <div section>
        <div mode on-click="openResolutionDropdown">[[method.displayName]]<span class="triangle devtools-small-icon" expanded></span></div>
        <iron-dropdown class="dropdown" id="dropdown" horizontal-align="left" vertical-align="top" vertical-offset="25">
          <div slot="dropdown-content" list on-click="resolutionDropdownClicked">
            <div entry header>Multi-Strategy:</div>
            <template is="dom-repeat" items="[[multiMethods]]">
              <div entry selection resolution$="[[item.name]]">[[item.displayName]]</div>
            </template>
            <div entry header>Single Strategy:</div>
            <template is="dom-repeat" items="[[strategies]]">
              <div entry selection resolution$="[[item]]">[[item]]</div>
            </template>
          </div>
        </iron-dropdown>
        <div divider></div>
        <iron-icon title="Run" icon="av:play-arrow" on-click="runPlanner"></iron-icon>
        <iron-icon title="Run on change" icon="av:loop" on-click="runOnChange" active$="[[autoRun]]"></iron-icon>
        <div divider></div>
        <label title="Show strategy derivation of produced recipes" on-click="derivationSettingClicked">
          <input type="checkbox" id="derivation-checkbox">
          <label for="derivation-checkbox">Show derivation</label>
        </label>
      </div>
      <div section status>[[responseStatus(results)]]</div>
    </header>
    <vaadin-split-layout>
      <div style="flex: .5">
        <div editor>
          <div id="underline"></div>
          <iron-autogrow-textarea value="{{manifest}}" spellcheck="false"></iron-autogrow-textarea>
        </div>
      </div>
      <aside style="flex: .5">
        <template is="dom-if" if="[[!results.length]]">
          <div none padding>No results</div>
        </template>
        <template is="dom-repeat" items="[[results]]">
          <div result>
            <template is="dom-if" if="[[and(item.derivation, showDerivation)]]">
              <div derivation>
                Derivation:
                <template is="dom-repeat" items="[[item.derivation]]">
                  <div>[[item]]</div>
                </template>
                <template is="dom-if" if="[[!item.derivation.length]]">
                  <div none>Empty</div>
                </template>
              </div>
            </template>
            <pre inner-h-t-m-l="[[item.content]]"></pre>
            <template is="dom-repeat" items="[[item.errors]]">
              <div error>
                <pre>[[item.error]]</pre>
                <template is="dom-if" if="[[item.suggestion]]">
                  <div suggestion>
                    <iron-icon title="Suggestion" icon="image:assistant"></iron-icon>
                    <div message inner-h-t-m-l="[[item.suggestion.message]]"></div>
                    <div>
                      <template is="dom-repeat" items="[[item.suggestion.actionItems]]">
                        <div suggestionactionitem on-click="applySuggestion">[[item.text]]</div>
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </template>
      </aside>
    </vaadin-split-layout>`;
  }

  static get is() { return 'arcs-recipe-editor'; }

  static get properties() {
    return {
      manifest: {
        type: String,
        observer: 'manifestChanged',
        value: ''
      }
    };
  }

  constructor() {
    super();
    this.version = 0;
    this.autoRun = true;
    this.multiMethods = [{
      name: 'arc',
      displayName: 'Arc Resolution'
    }, {
      name: 'arc_coalesce',
      displayName: 'Arc Resolution + Coalescing'
    }];
    this.method = this.multiMethods[0];
  }

  onMessage(msg) {
    switch (msg.messageType) {
      case 'arc-selected':
        this.arcId = msg.messageBody.arcId;
        this.runPlanner();
        if (!this.strategies) {
          this.send({
            messageType: 'fetch-strategies',
            arcId: this.arcId
          });
        }
        break;
      case 'page-refresh':
        this.arcId = null;
        this.strategies = null;
        break;
      case 'fetch-strategies-result': {
        this.set('strategies', msg.messageBody.slice().sort());
        break;
      }
      case 'invoke-planner-result':
        if (this.version === msg.requestId) this.processResponse(msg.messageBody);
        break;
    }
  }

  manifestChanged() {
    this.$.underline.style.top = null;
    this.version++;
    if (this.autoRun) {
      if (this.autoRunTimeoutId) {
        clearTimeout(this.autoRunTimeoutId);
      }
      this.autoRunTimeoutId = setTimeout(() => this.runPlanner(), 100);
    }
  }

  runPlanner() {
    if (!this.arcId) return;
    this.send({
      messageType: 'invoke-planner',
      messageBody: {
        manifest: this.manifest,
        method: this.method.name
      },
      arcId: this.arcId,
      requestId: this.version
    });
  }

  processResponse(message) {
    if (message.error) {
      this.processError(message);
    } else {
      this.processSuccess(message);
    }
  }

  processSuccess({results}) {
    this.positionErrorUnderline(null);
    this.results = results.map(({recipe, derivation, errors}) => ({
      content: recipeHtmlify(recipe),
      derivation: derivation.sort(),
      errors,
      unresolvedCount: recipe.split('// unresolved ').length - 1 // Don't judge me.
    })).sort((a, b) => a.unresolvedCount - b.unresolvedCount);
  }

  processError({error, suggestion}) {
    this.positionErrorUnderline(error.location);
    this.results = [{
      content: '',
      errors: [{
        error: error.message,
        suggestion: this.processSuggestion(suggestion)
      }],
    }];
  }

  processSuggestion(suggestion) {
    if (!suggestion) return null;

    switch (suggestion.action) {
      case 'import': return {
        message: 'Import one of the manifests below:',
        actionItems: suggestion.fileNames.map(fileName => ({
          text: fileName,
          action: {
            type: 'import',
            path: fileName
          }
        }))
      };
      default:
        console.warn(`Unrecognized suggestion action: '${suggestion.action}'`);
        return;
    }
  }

  positionErrorUnderline(location) {
    if (!location) {
      this.$.underline.style.top = null;
      return;
    }

    const start = location.start;
    const end = location.end.line === start.line ? location.end
        : {line: start.line, column: this.manifest.split('\n')[start.line - 1].length + 1};

    this.$.underline.style.top = `${start.line * 18}px`;
    this.$.underline.style.left = `${start.column - 1}ch`;
    this.$.underline.style.width = `${Math.max(1, end.column - start.column)}ch`;
  }

  runOnChange() {
    if (this.autoRun = !this.autoRun) {
      this.runPlanner();
    }
 }

  openResolutionDropdown() {
    this.$.dropdown.open();
  }

  applySuggestion(e) {
    const action = e.model.item.action;
    switch (action.type) {
      case 'import': {
        const extraLineBreak = !this.manifest.startsWith('import ') && !this.manifest.startsWith('\n');
        this.manifest = `import '${action.path}'\n${extraLineBreak ? '\n' : ''}${this.manifest}`;
        break;
      }
    }
  }

  derivationSettingClicked(e) {
    this.showDerivation = this.shadowRoot.querySelector('#derivation-checkbox').checked;
  }

  resolutionDropdownClicked(e) {
    const resolutionAttr = e.path[0].getAttribute('resolution');
    if (resolutionAttr) {
      this.method = {
        name: resolutionAttr,
        displayName: e.path[0].innerText
      };
      this.$.dropdown.close();
      this.runPlanner();
    }
  }

  responseStatus(results) {
    if (!results || !results.length || results.every(r => !r.content)) return '';

    return `${results.length} result${results.length > 1 ? 's' : ''}`;
  }

  and(one, two) {
    return !!one && !!two;
  }
}

window.customElements.define(ArcsRecipeEditor.is, ArcsRecipeEditor);
