/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/xen/xen-import.js';
import {devtoolsStyles} from './devtools-css.js';

// import '../../deps/@polymer/polymer/lib/elements/dom-if.js';
// import '../../deps/@polymer/polymer/lib/elements/dom-repeat.js';
// import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
// import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

/**
 * ..:: Read Before Modifying ::..
 *
 * ObjectExplorer is implemented to work well within an IronList,
 * which efficiently displays large collections by recycling DOM.
 *
 * The above constraint means that we CANNOT do following:
 *   - Call functions from the template.
 *     E.g. <span>{{_helperFunction(item)}}</span>
 *   - Store information on DOM elements.
 *     E.g. information about state of expansion needs to be in the data model.
 *
 * These constraints forced the implementation to use a helper data structure,
 * referenced by the 'data' property, which contains contents the displayed object
 * as well as additional metadata, such as which nodes are expanded in the UI.
 * It can be computed automatically if the 'object' property is provided, or it
 * can be provided directly.
 *
 * ..:: Read Before Using ::..
 *
 * There are 2 parallel APIs to the ObjectExplorer.
 *
 * 1) When using as a standalone custom element:
 *
 *   Pass the object to explore through an 'object' attribute:
 *     <object-explorer object="{{objectToExplore}}"></object-explorer>
 *
 *   Changes to the underlying object will not be picked up automatically,
 *   developer needs to call this.$.explorer.refresh() explicitly.
 *
 *   Trigger searching through a 'find' attribute:
 *     <object-explorer object="{{objectToExplore}}" find="{{searchParams}}">
 *     or:
 *     this.$.explorer.find = searchParams;
 *
 *   searchParams must be null or an object of the form {phrase, regex}, with
 *   exactly one of those fields set to a non-empty string.
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
 *   <iron-list items="{{items}}">
 *     <object-explorer data="{{item}}"></object-explorer>
 *   </iron-list>
 *
 *   To perform a search, we need to manually trigger search change in the underlying
 *   data model, as there is more data than ObjectExplorer DOM elements. We do it with
 *   ObjectExplorer.find(data, params) method.
 *
 *     this.items.forEach(item => ObjectExplorer.find(item, searchParams));
 *
 *   As the ObjectExplorer DOM elements have not been notified of the underlying data
 *   changes, we need to also notify them manually. We can do it by setting a 'find'
 *   attribute.
 *
 *     for (const explorer of this.shadowRoot.querySelectorAll('iron-list object-explorer')) {
 *       explorer.find = params;
 *     }
 *
 *   When in doubt, talk to piotrswigon@github / piotrs@google.
 */

const main_t = Xen.Template.html`
${devtoolsStyles}
<style>
  :host {
    display: block;
    /*
    align-items: flex-start;
    overflow: hidden;
    */
    line-height: 22px;
    font-family: monospace;
    font-size: 11px;
  }
  :host([folded]) {
    white-space: nowrap;
    display: inline-flex;
  }
  :host([expanded]:not([folded])) {
    flex-direction: column;
  }
  :host(object-explorer:not([inner])) {
    padding: 2px 4px;
  }
  :host([inner]:not([folded])) {
    padding-left: 10px;
  }
  :host([inner][found]:not([expanded]):not([folded])) {
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
  @keyframes flash {
    0% {
      background: rgba(255, 255, 0, 1.0);
    }
    100% {
      background: rgba(255, 255, 0, 0);
    }
  }
  :host([flash-trigger]) {
    animation-name: flash;
    animation-duration: 1.5s;
    animation-iteration-count: 1;
    animation-timing-function: cubic-bezier(.1, .75, .5, .9);
  }
  icon {
    font-size: 10px;
    margin-right: 2px;
  }
  [more]::after {
    padding-right: 4px;
    content: '⯈';
  }
  [more][expanded]::after {
    content: '•';
  }
</style>

<div class="header" expandable$={{expandable}} on-click="_handleExpand" inner$="{{inner}}">
  <slot></slot>
  <span more expanded$="{{canExpand}}"></span>
  <span key hidden="{{skipKey}}" unsafe-html="{{displayKey}}"></span>
  <span keySeparator hidden="{{notKey}}">:</span>
  <span meta hiddenX="{{expanded}}">{{meta}}</span>
</div>

<span hidden="{{notExpanded}}">{{begin}}</span>
<div hidden="{{notExpanded}}">
  <div prop folded$="{{notExpanded}}">{{props}}</div>
  <div>{{end}}</div>
</div>

  <!-- <div Xhidden="{{summary}}">{{summary}}</div> -->

<span hiddenX="{{object}}" type$="{{type}}" unsafe-html="{{displayValue}}"></span>
`;

const prop_t = Xen.Template.html`
  <object-explorer inner data="{{data}}" find="{{find}}" skip-key="{{skipInnerKey}}" folded$="{{notExpanded}}" on-expand="_innerExpand"></object-explorer>
`;

export class ObjectExplorer extends Xen.Async {
  /*static*/ get template() {
    return main_t;
  }

  static get observedAttributes() { return ['object', 'data', 'folded']; }
  static get is() { return 'object-explorer'; }

  update({object, data}, state, oldInputs) {
    if (data && data !== oldInputs.data) {
      if (state.data) {
        data.expanded = data.expandable && state.data.expanded;
      }
      state.data = data;
      this._onFindChanged();
    } else if (object && object !== oldInputs.object) {
      const data = ObjectExplorer.prepareData(object);
      ObjectExplorer._inheritExpansion(state.data, data);
      state.data = data;
      this._onFindChanged();
    }
  }

  render(props, state) {
    const model = {...state.data};
    model.notExpanded = !model.expanded;
    model.notKey = !model.key;
    // if we cannot be flattened, we should not have expansion buttons
    model.canExpand = Boolean(!model.expandable || model.expanded);
    if (model.props) {
      if (model.expanded) {
        model.props = {
          template: prop_t,
          models: model.props.map(p => ({data: p}))
        };
      } else {
        model.props = null;
      }
    }
    //console.log(model);
    return model;
  }

  // Prepares the 'data' property from the JS object to be displayed.
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
          expanded: key !== 'location', //true, //false,
          expandable: entries.length > 0,
          isArray,
          meta: isArray ? `Array(${ref.length})` : ref.constructor.name,
          summary: isArray ? `Array(${entries.length})` : `{${entries.length > 0 ? '…' : ''}}`,
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

  /**
   * Modifies the given 'data' object to reflect search query in the 'params' argument.
   *
   * @param data the structure to modify
   * @param params query for searching through the 'data' object. Must be null or an object of the
   *          form {phrase, regex}, with exactly one of those fields set to a non-empty string.
   */
  static find(data, params) {
    const localParams = {phrase: null, regex: null, compiledRegex: null};
    if (params) {
      if (params.phrase) {
        localParams.phrase = params.phrase;
      } else {
        localParams.regex = params.regex;
        localParams.compiledRegex = new RegExp(params.regex, 'gi');
      }
    }
    return this._findInternal(data, localParams);
  }

  static _findInternal(data, params) {
    // As _onFindChanged is called on object explorer in the order
    // from leafs to the root, this allows to skip O(n^2).
    if (data.foundPhrase === params.phrase && data.foundRegex === params.regex) {
      return data.found;
    }

    const [displayKey, foundInKey] = this._highlight(data.key, params);
    data.displayKey = displayKey;

    if (data.type === 'object') {
      let foundInside = false;
      for (const inner of data.props) {
        foundInside = this._findInternal(inner, params) || foundInside;
      }
      data.found = foundInKey || foundInside;
    } else {
      const [displayValue, foundInValue] = this._highlight(String(data.value), params);
      data.displayValue = displayValue;
      data.found = foundInKey || foundInValue;
    }
    data.foundPhrase = params.phrase;
    data.foundRegex = params.regex;

    return data.found;
  }

  // Calculates the properties of the 'data' object which depend
  // on whether the object-explorer is expanded.
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

  // TODO: this gets called *many* times when the page first loads and then when the search params
  // change, due to the param bindings being shared with multiple panels. This may end up causing
  // performance issues.
  static _highlight(value, params) {
    if (!params.phrase && !params.regex) {
      return [this._escape(value), false];
    }
    const parts = [];
    let i = 0;
    if (params.phrase) {
      const lcValue = value.toLowerCase();
      while (i < value.length) {
        const pi = lcValue.indexOf(params.phrase, i);
        parts.push(this._escape(value.substring(i, pi !== -1 ? pi : value.length)));
        if (pi === -1) break;
        i = pi + params.phrase.length;
        parts.push(`<span highlight>${this._escape(value.substring(pi, i))}</span>`);
      }
    } else {
      params.compiledRegex.lastIndex = 0;
      let m;
      while (m = params.compiledRegex.exec(value)) {
        // Some patterns can return empty matches: 'abXXc'.match(/X*/g) returns ['', '', 'XX', '', ''].
        // Using exec() with such patterns will loop infinitely on an empty match at index 0 unless we
        // manually skip them.
        if (m[0].length === 0) {
          params.compiledRegex.lastIndex++;
        } else {
          parts.push(this._escape(value.substring(i, m.index)));
          i = m.index + Math.max(m[0].length, 1);
          parts.push(`<span highlight>${this._escape(value.substring(m.index, i))}</span>`);
        }
      }
      if (i < value.length) {
        parts.push(this._escape(value.substring(i)));
      }
    }
    return [parts.join(''), i > 0];
  }

  // Attempts to mirror from 'prevData' to 'newData' which nodes are expanded in the UI.
  static _inheritExpansion(prevData, newData) {
    if (!prevData ||
        prevData.type !== 'object' ||
        newData.type !== 'object' ||
        !newData.expandable ||
        prevData.isArray !== newData.isArray) return;

    if (prevData.expanded) {
      newData.expanded = true;
      Object.assign(newData, this._expandedDependentProps(newData));
    }

    // Iteration over keys works well for objects, but is not ideal for arrays.
    // E.g. if an element [2] is expanded and we insert a new element at index 0,
    //      the element [3] should get expanded, but we still expand [2].
    // Some more clever algorithm could be implemented here.
    for (let i = 0; i < newData.props.length; i++) {
      ObjectExplorer._inheritExpansion(
          prevData.props.find(p => p.key === newData.props[i].key),
          newData.props[i]);
    }
  }

  // static get properties() {
  //   return {
  //     // Drives what the UI shows and holds both
  //     // the displayed object and various display-related metadata.
  //     data: Object,
  //     // Used to provide the object to be displayed, setting it re-calculates 'data'.
  //     object: {
  //       type: Object,
  //       observer: '_objectProvided'
  //     },
  //     // Function that re-calculates 'data' from the provided 'object',
  //     // if the innards of the 'object' has changed but reference stayed the same.
  //     refresh: {
  //       type: Object,
  //       value: function() {
  //         return () => {
  //           this._objectProvided(this.object);
  //         };
  //       }
  //     },
  //     // 'data.expanded' is reflected to DOM attribute for CSS styling.
  //     expanded: {
  //       type: Boolean,
  //       reflectToAttribute: true,
  //       computed: '_id(data.expanded)'
  //     },
  //     // 'data.expandable' is reflected to DOM attribute for CSS styling.
  //     expandable: {
  //       type: Boolean,
  //       reflectToAttribute: true,
  //       computed: '_id(data.expandable)'
  //     },
  //     // Set in DOM by the parent object-explorer to true for CSS styling.
  //     inner: {
  //       type: Boolean,
  //       reflectToAttribute: true,
  //       value: false,
  //     },
  //     // Set in DOM by the parent object-explorer to true if this instance
  //     // is a key-value pair in a collapsed (horizontal line) display.
  //     folded: {
  //       type: Boolean,
  //       reflectToAttribute: true,
  //       value: false
  //     },
  //     // Set for collapsed (horizontal line) Arrays to skip integer indexes.
  //     skipKey: Boolean,
  //     // Set to trigger searching inside explored object.
  //     find: {
  //       type: String,
  //       reflectToAttribute: true,
  //       value: null,
  //       observer: '_onFindChanged'
  //     },
  //     // 'data.found' is reflected to DOM attribute for CSS styling.
  //     // E.g. highlighting object where search query was found,
  //     //      or hiding ones where it was not found.
  //     found: {
  //       type: Boolean,
  //       reflectToAttribute: true,
  //       computed: '_id(data.found)'
  //     },
  //     // Function that triggers a brief flash to point users attention.
  //     // E.g. to notify of an object that has changed.
  //     flash: {
  //       type: Object,
  //       value: function() {
  //         return () => {
  //           this.removeAttribute('flash-trigger');
  //           // #Hackery. This triggers the DOM reflow, flushing the attribute removal to DOM tree,
  //           // which ensures that the CSS animation gets restarted once we re-add the attribute.
  //           void this.offsetWidth;
  //           this.setAttribute('flash-trigger', '');
  //         };
  //       }
  //     },
  //   };
  // }

  // _id(value) {
  //   return value;
  // }

  // _switchExpanded(newExpanded) {
  //   this.set(`data.expanded`, newExpanded);
  //   const props = Object.entries(ObjectExplorer._expandedDependentProps(this.data));
  //   for (const [key, value] of props) {
  //     this.set(`data.${key}`, value);
  //   }
  // }

  _handleExpand() {
    const data = this.state.data || {};
    if (data.expandable) {
      const expanded = !data.expanded;
      this.state = {data: {...data, expanded}};
      //if (this.folded) newExpand = true;
      // TODO: Can we get around the need for a double event?
      // this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
      // this._switchExpanded(newExpand);
      // this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
    }
  }

  // _innerExpand() {
  //   this._switchExpanded(true);
  //   this.dispatchEvent(new CustomEvent('expand', {detail: this.data}));
  // }

  _onFindChanged() {
    // if (!this.data) return;
    // ObjectExplorer.find(this.data, this.find);
    // this.notifyPath('data.displayKey');
    // this.notifyPath('data.displayValue');
    // this.notifyPath('data.found');
  }
}

window.customElements.define(ObjectExplorer.is, ObjectExplorer);
