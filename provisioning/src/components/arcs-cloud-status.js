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

// These are the shared styles needed by this element.
import {SharedStyles} from './shared-styles.js';
import './arcs-cloud-console-items';
import '@polymer/paper-button/paper-button.js';

class ArcsCloudStatus extends PageViewElement {
    constructor(props) {
        super(props);
        this.key = null;
        this.url = null;
        this.init();
        document.addEventListener("storage", async (ev) => {

            this.key = localStorage.getItem('deviceKey');
            if (this.key) {
                this.key = this.key.toLowerCase();
                try {
                    const nodeStatus = await fetch('https://skarabrae.org/find/' + fingerprint, {
                        mode: "cors",
                        credentials: "omit"
                    }).then(resp => resp.json());
                    this.url = nodeStatus.url;
                }
                catch (e) {
                    this.print("Problem with your node for " + fingerprint + " : "+ e);
                }
            }
        });
    }


    async init() {
        if (this.inited) {
            return;
        }
        const keyStore = window.Arcs.KeyManager.getStorage();
        let fingerprint = localStorage.getItem('deviceKey');
        let key;
        if (fingerprint) {
            fingerprint = fingerprint.toLowerCase();
            key = await keyStore.find(fingerprint);
            this.key = fingerprint;
            try {
                const nodeStatus = await
                    fetch('https://skarabrae.org/find/' + fingerprint, {
                        mode: "cors",
                        credentials: "omit"
                    }).then(resp => resp.json());
                this.url = nodeStatus.url;
            }
            catch (e) {
                this.print("Problem with your node for " + fingerprint + " : "+ e);
            }
        }

        // if (key) {
        //     const a = document.getElementById("url");
        //     a.href = '/find/' + fingerprint;
        //     a.innerText = window.location.protocol + '//' + window.location.hostname + ':' + window.location.port +
        //         '/find/' + fingerprint;
        // } else {
        //     document.getElementById('setup').style.display = 'block';
        // }
        this.inited = true;
    }

    print(str) {
        this.shadowRoot.querySelector('#con').append(str);
    }

    delay(ms) {
        return new Promise((resolve, reject) => setTimeout(() => resolve(), ms));
    }

    async keyGen() {
        console.log('keygen called');
        this.generating = true;
        this.print("Generating Key...");
        const keyGenerator = window.Arcs.KeyManager.getGenerator();
        const keyStore = window.Arcs.KeyManager.getStorage();
        const deviceKey = await
            keyGenerator.generateDeviceKey();
        const storageKey = await
            keyGenerator.generateWrappedStorageKey(deviceKey);
        const rawStorageKey = await storageKey.unwrap(deviceKey.privateKey()).then(x => x.export());

        const pemKey = await
            fetch('gcp.pem').then(resp => resp.text());
        const gcpPublicKey = await
            keyGenerator.importKey(pemKey);
        const devfingerprint = await
            deviceKey.fingerprint();
        const rewrappedKey = await
            storageKey.rewrap(deviceKey.privateKey(), gcpPublicKey);
        await keyStore.write(devfingerprint, deviceKey);
        localStorage.setItem('deviceKey', devfingerprint);

        this.print("Key " + devfingerprint + " generated.");
        this.print("Setting up cloud...");
        if (true) {
            localStorage.setItem('storageKey', rawStorageKey);
        }
        const status = await fetch('https://skarabrae.org/deploy/' + devfingerprint + '/' +
            encodeURIComponent(storageKey.export()) + '/' + encodeURIComponent(rewrappedKey.export()),
            {
                mode: "cors",
                credentials: "omit"
            }).then((e) => { console.log('finished deploy'); return e; });
        this.print("Cloud setup, checking deployment status...");
        let nodeStatus;
        do {
            try {
                nodeStatus = await
                    fetch('https://skarabrae.org/find/' + devfingerprint, {
                        mode: "cors",
                        credentials: "omit"
                    }).then(resp => resp.json());
            }
            catch (e) {
                nodeStatus = {status: 'pending'};
            }
            let status = nodeStatus.status;
            if (status == 'attached' && nodeStatus.url == 'pending') {
                status = 'waiting for IP address';
            }
            this.print("Deployment Status ..." + status);
            await
                this.delay(2000);
        } while (nodeStatus.status == 'pending' || nodeStatus.url == 'pending');

        if (nodeStatus.status == 'attached') {
            this.print("Personal Cloud DB available at: " + nodeStatus.url);
            localStorage.setItem('storageKey', rawStorageKey);

        } else {
            this.print("There was a problem setting up your Personal Cloud DB: " + nodeStatus.status);
        }
    }

    async lock() {
        this.oldurl = this.url;
        this.url = null;
        const fingerprint = localStorage.getItem('deviceKey');

        await fetch('https://skarabrae.org/lock/' + fingerprint,
            {
                mode: "cors",
                credentials: "omit"
            });
    }

    async unlock() {
        this.url = this.oldurl;
        const fingerprint = localStorage.getItem('deviceKey');
        const nodeStatus = await
            fetch('https://skarabrae.org/find/' + fingerprint, {
                mode: "cors",
                credentials: "omit"
            }).then(resp => resp.json());
        const keyGenerator = window.Arcs.KeyManager.getGenerator();
        const keyStore = window.Arcs.KeyManager.getStorage();

        const pemKey = await
            fetch('gcp.pem').then(resp => resp.text());
        const gcpPublicKey = await
            keyGenerator.importKey(pemKey);
        const deviceKey = await keyStore.find(fingerprint);

        const wrappedKey = await keyGenerator.importWrappedKey(nodeStatus.key, deviceKey.publicKey());
        const rewrappedKey = await
            wrappedKey.rewrap(deviceKey.privateKey(), gcpPublicKey);

        await fetch('https://skarabrae.org/unlock/' + fingerprint + '/' + encodeURIComponent(rewrappedKey.export()), {
            mode: "cors",
            credentials: "omit"
        });
    }

    render() {

        return html`
      ${SharedStyles}
      <section ?hidden="${this.key == null}">
        <h2>Cloud Status</h2>
        <center><p ?hidden="${this.url != null}">Locked <paper-button raised @click="${() => this.unlock()}">Unlock</paper-button></p>
        <p ?hidden="${this.url == null}">Unlocked <paper-button raised @click="${() => this.lock()}">Lock</paper-button></p>
        </center>
      </section>
      <section id="setup" ?hidden="${this.key != null}">
        <h2>Arcs Personal Cloud</h2>
        <p>You haven't yet set up this device with an Arcs Personal Cloud. If you have enrolled another
        device already, please launch the Arcs Shell and select <b>Settings -> Connect Another Device</b> and 
        then click <b>Scan QR code</b></p>
        <p>
         Otherwise, click <paper-button raised @click="${() => this.keyGen()}">Here</paper-button> to start the process of creating your own, personal, secure cloud, just
         for you.</p>
      </section>
      <section id="status" ?hidden="${this.url == null}">
         <p>You currently have an <b>Arcs Personal Cloud</b> running at <a href="http://${this.url}">http://${this.url}</a></p>
      </section>
      <section id="generating">
        <arcs-cloud-console-items id="con"></arcs-cloud-console-items>
      </section>
    `;
    }

    static get properties() {
        return {
            key: {
                type: String,
            },
            url: {
                type: String,
            }
        }
    }

}

window
    .customElements
    .define(
        'arcs-cloud-status'
        ,
        ArcsCloudStatus
    )
;
