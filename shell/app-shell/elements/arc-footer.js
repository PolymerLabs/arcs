/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import ArcsUtils from "../lib/arcs-utils.js";
import Xen from '../../components/xen/xen.js';
import "../../components/dancing-dots.js";
import "../../components/x-toast.js";

const template = Xen.Template.createTemplate(
  `<style>
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
    i {
      font-family: 'Material Icons';
      font-size: 32px;
      font-style: normal;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
      vertical-align: middle;
      cursor: pointer;
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
  <x-toast app-footer open="{{toastOpen}}" suggestion-container>
    <dancing-dots slot="toast-header" disabled="{{dotsDisabled}}" active="{{dotsActive}}"></dancing-dots>
    <div search>
      <i class="material-icons" on-click="_onSearchClick" id="search-button">search</i>
      <input placeholder="Search" value="{{searchText}}" on-keypress="_onKeypress" on-input="_onSearchChange" on-blur="_onSearchCommit">
      <i class="material-icons" on-click="_onSearchClick">add</i>
    </div>
    <slot></slot>
  </x-toast>`
);

class ArcFooter extends Xen.Base {
  static get observedAttributes() { return ['dots', 'open', 'search']; }
  get template() { return template; }
  _getInitialState() {
    return {
      open: false,
      html: ''
    };
  }
  _didMount() {
    // TODO(sjmiles): this is a hack, repair asap. App should receive this event and
    // communicate the new state to footer.
    document.addEventListener('plan-choose', e => this._onPlanSelected(e, e.detail));
  }
  _willReceiveProps(props, state) {
    // TODO(seefeld):
    //  This is a hack to open the footer only if the actual contents of the suggestions changed.
    //  Should happen upstream instead.
    let html = this.firstElementChild.innerHTML;
    if (!state.open && html !== state.html) {
      //ArcFooter.log('opening: old, new: [${state.oldInnerHTML}] !== [${html}]');
      this._setState({open: true, html});
    }
  }
  _render(props, state) {
    return {
      dotsDisabled: props.dots == 'disabled',
      dotsActive: props.dots == 'active',
      searchText: state.search || '',
      toastOpen: state.open // == undefined ? true : state.open
    };
  }
  _onPlanSelected(e, suggestion) {
    this._fire('suggest', suggestion);
    this._commitSearch('');
    this._setState({open: false});
  }
  // three user actions can affect search
  // 1: clicking the search icon (sets search to '*')
  _onSearchClick() {
    this._commitSearch('*');
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
  _onSearchCommit(e) {
    this._commitSearch(e.target.value);
  }
  _commitSearch(search) {
    search = search || '';
    this._setState({search, open: true});
    this._fire('search', {search});
  }
}
ArcFooter.log = Xen.Base.logFactory('ArcFooter', '#673AB7');
customElements.define('arc-footer', ArcFooter);
