/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
import Icons from '../../components/icons.css.js';
import '../../components/dancing-dots.js';
import '../../components/x-toast.js';
import '../../components/speech-input.js';

const html = Xen.Template.html;
const template = html`
<style>
  ${Icons}
  :host {
    display: block;
  }
  x-toast {
    background-color: white;
    /*border: 1px solid silver;*/
    border-bottom: 0;
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    box-shadow: 0px 0px 6px 2px rgba(102,102,102,0.15);
  }
  [search] {
    display: flex;
    align-items: center;
    padding: 0 8px 8px 8px;
    border-bottom: 1px dotted silver;
  }
  [search] input {
    flex: 1;
    font-size: 1.2em;
    padding: 7px;
    margin: 0 8px;
    border: none;
    outline: none;
  }
</style>

<x-toast app-footer open="{{open}}" on-toggle="_onToggle" suggestion-container>
  <dancing-dots slot="toast-header" disabled="{{dotsDisabled}}" active="{{dotsActive}}"></dancing-dots>
  <div search>
    <icon on-click="_onSearchClick" id="search-button">search</icon>
    <input placeholder="Search" value="{{searchText}}" on-keypress="_onKeypress" on-input="_onSearchChange" on-blur="_onSearchCommit">
    <!-- <icon on-click="_onSearchClick">add</icon> -->
    <speech-input on-result="_onSpeechInput" on-end="_onSpeechEnd"></speech-input>
  </div>
  <slot></slot>
</x-toast>
`;

<<<<<<< HEAD
const log = Xen.logFactory('ArcFooter', '#673AB7');

class ArcFooter extends Xen.Base {
=======
const log = Xen.Base.logFactory('ArcFooter', '#673AB7');

class ArcFooter extends Xen.Debug(Xen.Base, log) {
>>>>>>> plumbing footer open state through the app
  static get observedAttributes() {
    return ['dots', 'open', 'search'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      html: ''
    };
  }
  _didMount() {
    // TODO(sjmiles): this is a hack, repair asap. App should receive this event and
    // communicate the new state to footer.
    document.addEventListener('plan-choose', e => this._onPlanSelected(e, e.detail));
  }
  _willReceiveProps(props, state) {
    if (props.search && props.search !== state.search) {
      this._commitSearch(props.search);
    }
  }
  _render(props, state) {
    return {
      dotsDisabled: props.dots == 'disabled',
      dotsActive: props.dots == 'active',
      searchText: state.search || '',
      open: Boolean(props.open)
    };
  }
  _didRender(props, state, oldProps) {
    if (props.open && !oldProps.open) {
      this.host.querySelector('input').focus();
    }
  }
  _onToggle() {
    this._fire('open', !this._props.open);
    //this._setState({open: !this._state.open});
    // TODO(sjmiles): breaks the idiom
    //this.host.querySelector('input').focus();
  }
  _onPlanSelected(e, suggestion) {
    this._fire('suggest', suggestion.plan);
    this._commitSearch('');
    //this._setState({open: false});
    this._fire('open', false);
  }
  // four user actions can affect search
  // 1: clicking the search icon (sets search to '*')
  _onSearchClick() {
    this._commitSearch(this._state.search === '*' ? '' : '*');
  }
  // 2. typing in the search box (w/debouncing)
  _onSearchChange(e) {
    // TODO(sjmiles): backend search is a bit slow to do while typing, perhaps we use simple-mode
    // text search to provide immediate results?
    const search = e.target.value;
    // throttle re-planning until typing has stopped
    let delay = 500;
    // unless one of these is true
    //if (!search || search == '*' || search[search.length - 1] == ' ') {
    //  delay = 1;
    //}
    this._searchDebounce = ArcsUtils.debounce(this._searchDebounce, () => this._commitSearch(search), delay);
  }
  // 3. committing the search input (enter-key or blurring)
  _onKeypress(e) {
    if (e.key === 'Enter') {
      this._commitSearch(e.target.value || '*');
    }
  }
  // 4. using speech input
  _onSpeechInput(e, transcript) {
    this._setState({search: transcript});
  }
  _onSpeechEnd(e, transcript) {
    this._commitSearch(transcript);
  }
  _onSearchCommit(e) {
    this._commitSearch(e.target.value);
  }
  _commitSearch(search) {
    search = search || '';
    // TODO(sjmiles): removed this check so speech-input can update the search box, is it harmful?
    //if (this._state.search !== search) {
      this._setState({search});
      this._fire('search', {search});
      this._fire('open', true);
    //}
  }
}
customElements.define('arc-footer', ArcFooter);
