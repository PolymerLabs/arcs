import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ObjectExplorer extends PolymerElement {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        font-family: Menlo, monospace;
        font-size: 11px;
        overflow: hidden;
        display: flex;
        align-items: flex-start;
        line-height: 22px;
      }
      :host([folded]) {
        white-space: nowrap;
        display: inline-flex;
      }
      :host([expanded]:not([folded])) {
        flex-direction: column;
      }
      :host([inner]:not([folded])) {
        padding-left: 10px;
      }
      .header {
        display: inline-flex;
        align-items: center;
        white-space: nowrap;
      }
      .triangle {
        visibility: hidden;
      }
      [expandable] > .triangle {
        visibility: visible;
      }
      [expandable] {
        cursor: pointer;
      }
      [key] {
        color: var(--devtools-purple);
      }
      [keySeparator] {
        width: 2ch;
      }
      [meta]:not(:empty) {
        color: var(--dark-gray);
        margin-right: 1ch;
      }
      [asString]:not(:empty) {
        font-style: italic;
        margin-right: 1ch;
      }
      [prop] {
        max-width: 100%;
      }
      [prop][folded] {
        display: inline-flex;
      }
      [prop][folded]:not(:last-of-type)::after {
        content: ',';
        width: 2ch;
      }
      [string] {
        color: var(--devtools-red);
        word-break: break-all;
        width: initial;
      }
      :host(:not([folded])) [string] {
        white-space: pre-wrap;
      }
      [numberOrBool] {
        color: var(--devtools-blue);
      }
      [function] {
        font-style: italic;
      }
      [hidden] {
        display: none;
      }
    </style>
    <span class="header" expandable$=[[_expandable(folded)]] on-click="_handleExpand" inner$=[[inner]] hidden$=[[skipHeader]]>
      <slot></slot>
      <span class="triangle devtools-small-icon" expanded$="[[expanded]]" hidden$=[[folded]]></span>
      <template is="dom-if" if="[[!skipKey]]"><span key>[[key]]</span><span keySeparator>[[_separator(key)]]</span></template is="dom-if">
      <span meta>[[_describe(folded)]]</span>
      <span asString>[[_asString(data)]]</span>
    </span>
    <template is="dom-if" if="[[_isObject()]]">
      [[_begin(data, expanded, folded)]]<!--
   --><template is="dom-if" if="[[!folded]]"><!--
     --><template is="dom-repeat" items="[[_props(data)]]">
          <div prop folded$="[[!expanded]]">
            <object-explorer inner folded$="[[!expanded]]" key="[[item.key]]" data="[[item.value]]" skip-key="[[_skipKey(expanded)]]"></object-explorer>
          </div>
        </template><!--
   --></template is="dom-if"><!--
   --><template is="dom-if" if="[[folded]]">...</template><!--
 -->[[_end(data, expanded, folded)]]
    </template>
    <template is="dom-if" if="[[_isString()]]">
      <span string>"[[data]]"</span>
    </template>
    <template is="dom-if" if="[[_isNumberOrBoolean()]]">
      <span numberOrBool>[[data]]</span>
    </template>
    <template is="dom-if" if="[[_isFunction()]]">
      <span function>ƒ [[data.name]]()</span>
    </template>
    <template is="dom-if" if="[[_isNullOrUndefined()]]">
      <span>[[_toString()]]</span>
    </template>
`;
  }

  static get is() { return 'object-explorer'; }

  static get properties() {
    return {
      data: Object,
      key: String,
      expanded: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      },
      inner: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
      },
      folded: {
        type: Boolean,
        reflectToAttribute: true,
        value: false
      },
      skipKey: Boolean,
      skipHeader: Boolean
    };
  }

  _isObject() {
    return this.data && typeof this.data === 'object';
  }

  _isString() {
    return typeof this.data === 'string';
  }

  _isNumberOrBoolean() {
    return typeof this.data === 'number' || typeof this.data === 'boolean';
  }

  _isNullOrUndefined() {
    return this.data == null;
  }

  _isFunction() {
    return typeof this.data === 'function';
  }

  _expandable(folded) {
    return this._isObject() && !folded;
  }

  _skipKey(expanded) {
    return !expanded && this.data && Array.isArray(this.data);
  }

  _toString() {
    return String(this.data);
  }

  _asString(object) {
    if (object && object.hasOwnProperty('toString') && typeof object.toString === 'function') {
      return `'${object.toString()}'`;
    } else return '';
  }

  _props(data) {
    return Object.entries(data).map(([key, value]) => ({key, value}));
  }

  _describe(folded) {
    if (folded || !this._isObject()) return '';
    return Array.isArray(this.data)
        ? `Array(${this.data.length})`
        : this.data.constructor.name;
  }

  _begin(data, expanded, folded) {
    return expanded && !folded ? '' : (Array.isArray(data) ? '[' : '{');
  }

  _end(data, expanded, folded) {
    return expanded && !folded ? '' : (Array.isArray(data) ? ']' : '}');
  }

  _separator(key) {
    return key ? ': ' : '';
  }

  _handleExpand(e) {
    if (!this.data || !this._isObject() || this.folded) return;
    this.expanded = !this.expanded;
  }
}

window.customElements.define(ObjectExplorer.is, ObjectExplorer);
