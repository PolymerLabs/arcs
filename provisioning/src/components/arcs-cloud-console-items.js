/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {html, LitElement} from '@polymer/lit-element';

import '@polymer/paper-item/paper-item.js';

// These are the shared styles needed by this element.
import { SharedStyles } from './shared-styles.js';

class ArcsCloudConsoleItems extends LitElement {

  append(item) {
    const span = document.createElement("paper-item");
    span.innerText = item;
    this.shadowRoot.getElementById("console-items").appendChild(span);
  }

  render() {
    return html`
      ${SharedStyles}
      <section>
        <h2>Cloud Console</h2>
        <div role="listbox" id="console-items">
        </div>
      </section> 
    `;
  }


}

window.customElements.define('arcs-cloud-console-items', ArcsCloudConsoleItems);
