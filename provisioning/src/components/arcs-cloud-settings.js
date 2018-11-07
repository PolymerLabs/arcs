/**
 @license
 Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 Code distributed by Google as part of the polymer project is also
 subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {html} from '@polymer/lit-element';
import {PageViewElement} from './page-view-element.js';
import {connect} from 'pwa-helpers/connect-mixin.js';

// These are the shared styles needed by this element.
import {SharedStyles} from './shared-styles.js';
import '@cromwellian/granite-qrcode-generator';
import '@cromwellian/granite-qrcode-scanner';

class ArcsCloudSettings extends PageViewElement {

    constructor() {
        super();
        this.key = localStorage.getItem('storageKey');
        if (this.key) {
            this.key = this.key.toUpperCase();
        }
        this.fingerprint = localStorage.getItem('deviceKey');
        if (this.fingerprint) {
            this.fingerprint = this.fingerprint.toUpperCase();
        }
        document.addEventListener("storage", (ev) => {

            this.key = localStorage.getItem('storageKey');
            this.fingerprint = localStorage.getItem('deviceKey');
            if (this.key) {
                this.key = this.key.toUpperCase();
            }
            if (this.fingerprint) {
                this.fingerprint = this.fingerprint.toUpperCase();
            }
        });
    }

    _onQrcodeDecoded(evt) {
        const url = evt.detail;
        let BLESS = 'BLESS/';
        const bless = url.indexOf(BLESS);
        if (bless != -1) {
            const parts = url.substring(bless + BLESS.length).split('/');
            this.fingerprint = parts[0];
            this.key = parts[1];
            localStorage.setItem('deviceKey', this.fingerprint);
            localStorage.setItem('storageKey', this.key);
            console.log("Got key");
        }
    }


    render() {
        return html`

      ${SharedStyles}
      <section ?hidden="${this.key == null}">
        <h2>Your QR Code</h2>
        <center>
         <granite-qrcode-generator data="https://skarabrae.org/bless/${this.fingerprint}/${this.key}"
           mode="alphanumeric" auto></granite-qrcode-generator>
           </center>
         </section>
         <section ?hidden="${this.key != null}"> 
           <p>You currently don't have a personal cloud. Please set one up in <b>Personal Cloud</b> or
          scan the QR code from another device that has a personal cloud.</p>
          </section>

      <section ?hidden="${this.key != null}">
        <h2>Scan a QR Code of another device</h2>     
              <granite-qrcode-scanner @qrcode-decoded="${evt => this._onQrcodeDecoded(evt)}" debug></granite-qrcode-scanner>
      </section> 
    `;
    }




    static get properties() {
        return {
            key: {
                type: String,
            }
        }
    }
}

window.customElements.define('arcs-cloud-settings', ArcsCloudSettings);
