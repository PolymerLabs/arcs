import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

/**
 * ..:: Read Before Modifying ::..
 * 
 * ObjectExplorer is implemented to work well within an IronList,
 * which efficiently displays large collections by recycling DOM.
 * 
 * The above constraint means that we CANNOT do following:
 *   - Call functions from the template.
 *     E.g. <span>[[_helperFunction(item)]]</span>
 *   - Store information on DOM elements.
 *     E.g. information about state of expansion needs to be in the data model.
 * 
 * ..:: Read Before Using ::..
 * 
 * There are 2 parallel APIs to the ObjectExplorer.
 * 
 * 1) When using as a standalone custom element:
 *   
 *   Pass the object to explore through an 'object' attribute:
 *     <object-explorer object="[[objectToExplore]]"></object-explorer>
 * 
 *   Trigger searching through a 'find' attribute:
 *     <object-explorer object="[[objectToExplore]]" find="[[searchPhrase]]">
 *     or:
 *     this.$.explorer.find = searchPhrase;
 * 
 * 2) When using inside an IronList:
 * 
 *   There is more data in your list than actual DOM elements, so you need to
 *   prepare the underlying ObjectExplorer data structure yourself. You co do it
 *   with a ObjectExplorer.prepareData static method and pass the result into
 *   a 'data' attribute of the object-explorer.
 * 
 *   this.items = objects.map(obj => ObjectExplorer.prepareData(obj));
 * 
 *   <iron-list items="[[items]]">
 *     <object-explorer data="[[item]]"></object-explorer>
 *   </iron-list>
 * 
 *   To perform a search, we need to manually trigger search change in the underlying
 *   data model, as there is more data than ObjectExplorer DOM elements. We do it with
 *   ObjectExplorer.find(data, phrase) method.
 *     
 *     this.items.forEach(item => ObjectExplorer.find(item, searchPhrase));
 * 
 *   As the ObjectExplorer DOM elements have not been notified of the underlying data
 *   changes, we need to also notify them manually. We can do it by setting a 'find'
 *   attribute.
 * 
 *     for (const explorer of this.shadowRoot.querySelectorAll('iron-list object-explorer')) {
 *       explorer.find = phrase;
 *     }
 * 
 *   When in doubt, talk to piotrswigon@github / piotrs@google.
 */
export class ObjectExplorer extends PolymerElement {
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
      :host([inner][found-inside]:not([expanded]):not([folded])) {
        padding-left: 0;
        border-left: 10px solid yellow;
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
      [type=string] {
        color: var(--devtools-red);
        word-break: break-all;
        width: initial;
      }
      [type=string]::before {
        content: '"';
      }
      [type=string]::after {
        content: '"';
      }
      :host(:not([folded])) [type=string] {
        white-space: pre-wrap;
      }
      [type=number], [type=boolean] {
        color: var(--devtools-blue);
      }
      [type=null], [type=undefined] {
        color: var(--dark-gray);
      }
      [type=function] {
        font-style: italic;
      }
      [type=function]::before {
        content: 'ƒ ';
        color: var(--devtools-blue);
      }
      [hidden] {
        display: none;
      }
      [highlight] {
        background-color: yellow;
        border-radius: 5px;
        padding: 3px 0;
        box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, .2);
      }
    </style>
    <span class="header" expandable$=[[data.expandable]] on-click="_handleExpand" inner$=[[inner]]>
      <slot></slot>
      <span class="triangle devtools-small-icon" expanded$="[[data.expanded]]" hidden$=[[folded]]></span>
      <template is="dom-if" if="[[!skipKey]]"><span key inner-h-t-m-l="[[data.displayKey]]"></span><span keySeparator hidden="[[!data.key]]">:</span></template is="dom-if">
      <template is="dom-if" if="[[!folded]]"><span meta>[[data.meta]]</span></template>
    </span>
    <template is="dom-if" if="[[data.object]]">
      <template is="dom-if" if="[[!folded]]"><!--
     -->[[data.begin]]<!--
     --><template is="dom-repeat" items="[[data.props]]">
          <div prop folded$="[[!data.expanded]]">
            <object-explorer inner data="[[item]]" find="[[find]]" skip-key="[[data.skipInnerKey]]" folded$="[[!data.expanded]]" on-expand="_innerExpand"></object-explorer>
          </div>
        </template><!--
   -->[[data.end]]<!--
   --></template is="dom-if"><!--
   --><template is="dom-if" if="[[folded]]">[[data.folded]]</template>
    </template>
    <template is="dom-if" if="[[!data.object]]">
      <span type$="[[data.type]]" inner-h-t-m-l="[[data.displayValue]]"></span>
    </template>
`;
  }

  static get is() { return 'object-explorer'; }

  static prepareData(ref, key = '') {
    const data = {
      type: ref === null ? 'null' : typeof ref,
      key,
      displayKey: this._escape(key)
    };
    switch (data.type) {
      case 'object': {
        const isArray = Array.isArray(ref);
        const entries = Object.entries(ref);
        Object.assign(data, {
          object: true,
          expanded: false,
          expandable: entries.length > 0,
          isArray,
          meta: isArray ? `Array(${ref.length})` : ref.constructor.name,
          folded: isArray ? `Array(${entries.length})` : `{${entries.length > 0 ? '…' : ''}}`,
          props: entries.map(([key, value]) => this.prepareData(value, key)),  
        });
        Object.assign(data, this._expandedDependentProps(data));
        break;
      }
      default:
        Object.assign(data, {
          meta: '',
          value: ref,
          displayValue: this._escape(ref)
        });
        break;
    }
    return data;
  }

  static find(data, phrase) {
    // As _onFindChanged is called on object explorer in the order
    // from leafs to the root, this allows to skip O(n^2).
    if (data.findPhrase === phrase) return data.found;

    const [displayKey, foundInKey] = this._highlight(phrase, data.key);
    data.displayKey = displayKey;

    if (data.type === 'object') {
      let foundInside = false;
      for (const inner of data.props) {
        foundInside = this.find(inner, phrase) || foundInside;
      }
      data.foundInside = foundInside;
      data.found = foundInKey || foundInside; 
    } else {
      const [displayValue, foundInValue] = this._highlight(phrase, String(data.value));
      data.displayValue = displayValue;
      data.found = foundInKey || foundInValue; 
    }
    data.findPhrase = phrase;

    return data.found;
  }

  static _expandedDependentProps(data) {
    return {
      begin: data.expanded ? '' : (data.isArray ? '[' : '{'),
      end: data.expanded ? '' : (data.isArray ? ']' : '}'),
      skipInnerKey: data.isArray && !data.expanded
    };
  }

  // Turns HTML strings into escaped ones, so that we can add
  // HTML for highlighting and put the string as innerHTML.
  static _escape(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[\u00A0-\u9999<>\\&]/gim, i => ('&#' + i.charCodeAt(0) + ';'));
  }

  static _highlight(phrase, value) {
    if (!phrase) {
      return [this._escape(value), false];
    }
    const lcPhrase = phrase.toLowerCase();
    const lcValue = value.toLowerCase();

    const parts = [];
    let i = 0;
    let found = false;
    while (i < value.length) {
      const pi = lcValue.indexOf(lcPhrase, i);
      parts.push(this._escape(value.substring(i, pi !== -1 ? pi : value.length)));
      if (pi === -1) break;
      parts.push(`<span highlight>${this._escape(value.substring(pi, pi + phrase.length))}</span>`);
      found = true;
      i = pi + phrase.length;
    }

    return [parts.join(''), found];
  }

  static get properties() {
    return {
      data: Object,
      object: {
        type: Object,
        observer: '_objectProvided'
      },
      expanded: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_id(data.expanded)'
      },
      expandable: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_id(data.expandable)'
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
      find: {
        type: String,
        reflectToAttribute: true,
        value: null,
        observer: '_onFindChanged'
      },
      foundInside: {
        type: Boolean,
        reflectToAttribute: true,
        computed: '_id(data.foundInside)'
      },
    };
  }

  _id(value) {
    return value;
  }

  _objectProvided(object) {
    this.set('data', ObjectExplorer.prepareData(object));
  }

  _switchExpanded(newExpanded) {
    this.set(`data.expanded`, newExpanded);
    const props = Object.entries(ObjectExplorer._expandedDependentProps(this.data));
    for (const [key, value] of props) {
      this.set(`data.${key}`, value);
    }
  }

  _handleExpand() {
    if (!this.data || !this.data.expandable) return;
    let newExpand = !this.data.expanded;
    if (this.folded) newExpand = true;
    // TODO: Can we get around the need for a double event?
    this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
    this._switchExpanded(newExpand);
    this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
  }

  _innerExpand() {
    this._switchExpanded(true);
    this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
  }

  _onFindChanged(find) {
    if (!this.data) return;
    ObjectExplorer.find(this.data, find);
    this.notifyPath('data.displayKey');
    this.notifyPath('data.displayValue');
    this.notifyPath('data.foundInside');
  }
}

window.customElements.define(ObjectExplorer.is, ObjectExplorer);
