/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {IronA11yKeysBehavior} from '../../deps/@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js';
import {mixinBehaviors} from '../../deps/@polymer/polymer/lib/legacy/class.js';
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

export class FilterInput extends mixinBehaviors([IronA11yKeysBehavior], PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: block;
      }
      #search {
        outline: 0;
        border: 1px solid white;
        padding: 2px;
        margin-left: 3px;
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
      span {
        display: inline-block;
      }
    </style>
    <input placeholder="Filter" id="search" value="{{searchTextInput::input}}" title="Focus: ctrl+f, Clear: ctrl+esc, Regex: ctrl+x">
    <span>
      <input type="checkbox" id="regex" checked="{{searchRegexInput::change}}">
      <label for="regex">Regex</label>
    </span>
    `;
  }

  static get properties() {
    return {
      searchTextInput: String,
      searchRegexInput: Boolean,
      filter: {
        type: Object,
        value: null,
        notify: true
      },
      keyEventTarget: {
        type: Object,
        value: function() {
          return document.body;
        }
      }
    };
  }

  get keyBindings() {
    return {
      'ctrl+f': '_focus',
      // CTRL to avoid clashing with devtools toolbar showing/hiding, which I cannot supress.
      'ctrl+esc': '_clear',
      'ctrl+x': '_regex'
    };
  } 

  static get observers() {
    return ['_onSearchChanged(searchTextInput, searchRegexInput)'];
  }


  // TODO: you can't enter '?' in the search field; it displays the console prefs page instead :-/
  // See https://bugs.chromium.org/p/chromium/issues/detail?id=923338
  _onSearchChanged(text, isRegex) {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.$.search.classList.remove('invalidRegex');
      if (!text) {
        this.filter = null;
      } else if (isRegex) {
        // Test that the regex is valid. Note that we don't pass the compiled RegExp in the params
        // because different receivers may use different flags for their searches.
        try {
          new RegExp(text);
        } catch (error) {
          this.$.search.classList.add('invalidRegex');
          return;
        }
        this.filter = {phrase: null, regex: text};
      } else {
        this.filter = {phrase: text.toLowerCase(), regex: null};
      }
    }, 100);
  }

  _focus() {
    this.$.search.focus();
  }

  _clear() {
    this.$.search.value = '';
    this.searchTextInput = null;
    this.$.search.blur();
  }

  _regex() {
    this.$.regex.checked = !this.$.regex.checked;
    this.searchRegexInput = this.$.regex.checked;
  }

  static get is() { return 'filter-input'; }
}

window.customElements.define(FilterInput.is, FilterInput);
