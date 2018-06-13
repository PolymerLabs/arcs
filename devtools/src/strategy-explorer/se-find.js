/*
Copyright (c) 2017 Google Inc. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt
Code distributed by Google as part of this project is also
subject to an additional IP rights grant found at
http://polymer.github.io/PATENTS.txt
*/

import {IronA11yKeysBehavior} from '../../deps/@polymer/iron-a11y-keys-behavior/iron-a11y-keys-behavior.js';
import '../../deps/@polymer/paper-input/paper-input.js';
import '../../deps/@polymer/polymer/polymer-legacy.js';
import '../arcs-shared.js';
import './se-shared.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';
import {mixinBehaviors} from '../../deps/@polymer/polymer/lib/legacy/class.js';
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';

class SeFind extends mixinBehaviors([IronA11yKeysBehavior], PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles se-shared-styles">
      :host {
        display: block;
      }
      paper-input {
        --paper-input-container: {
          padding: 0;
        };
      }
    </style>
    <paper-input id="input" no-label-float="" on-input="onChange">
      <iron-icon icon="search" slot="suffix" title="Focus: ctrl+f, Clear: ctrl+esc"></iron-icon>
    </paper-input>
`;
  }

  static get is() { return 'se-find'; }

  static get properties() {
    return {
      phrase: String,
      keyEventTarget: {
        type: Object,
        value: function() {
          return document.body;
        }
      },
    };
  }

  get keyBindings() {
    return {
      'ctrl+f': '_focus',
      // CTRL to avoid clashing with devtools toolbar showing/hiding, which I cannot supress.
      'ctrl+esc': '_clear'
    };
  }

  onChange() {
    this.phrase = this.$.input.value;
    this.dispatchEvent(new CustomEvent('find-phrase', {detail: this.phrase}));
  }

  _focus() {
    this.$.input.focus();
  }

  _clear(e) {
    this.$.input.value = '';
    this.onChange();
    this.$.input.blur();
  }
}

window.customElements.define(SeFind.is, SeFind);
