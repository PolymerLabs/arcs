/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../../deps/@polymer/polymer/polymer-element.js';
import {html} from '../../deps/@polymer/polymer/lib/utils/html-tag.js';

class Overview extends PolymerElement {
  static get template() {
    return html`
      <div>Coming Soon :)</div>
    `;
  }

  static get is() { return 'devtools-overview'; }
}

window.customElements.define(Overview.is, Overview);
