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
//import {devtoolsStyles} from './devtools-css.js';

const main_t = Xen.Template.html`
<style>
  :host {
    display: flex;
    border: 1px solid #F8F8F8;
    border-radius: 4px;
    padding: 4px 8px;
  }
  #search {
    outline: 0;
    border: none;
    flex: 1;
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
</style>

<input placeholder="Filter" id="search" class="{{searchClass}}" value="{{text}}" on-input="onTextChange" title="Focus: ctrl+f, Clear: ctrl+esc, Regex: ctrl+x">
<span>
  <input type="checkbox" id="regex" value="{{isregex}}" on-change="onRegexChange">
  <label for="regex">Regex</label>
</span>

`;

export class FilterInput extends Xen.Async {
  static get observedAttributes() {
    return ['text', 'isregex'];
  }
  static get is() {
    return 'filter-input';
  }
  get template() {
    return main_t;
  }
  update({}, state) {
    this._debounce('search', () => this.search(state), 100);
  }
  search(state) {
    state.searchClass = '';
    if (!state.text) {
      state.filter = null;
    } else if (state.isregex) {
      // Test that the regex is valid. Note that we don't pass the compiled RegExp in the params
      // because different receivers may use different flags for their searches.
      try {
        new RegExp(state.text);
      } catch (error) {
        state.searchClass = 'invalidRegex';
        return;
      }
      state.filter = {phrase: null, regex: state.text};
    } else {
      state.filter = {phrase: state.text.toLowerCase(), regex: null};
    }
    console.log('search');
    this.fire('filter', state.filter);
  }
  onRegexChange({currentTarget: {checked}}) {
    this.state = {isregex: checked};
  }
  onTextChange({currentTarget: {value}}) {
    this._debounce('search', () => this.state = {text: value}, 100);
  }
}

window.customElements.define(FilterInput.is, FilterInput);
