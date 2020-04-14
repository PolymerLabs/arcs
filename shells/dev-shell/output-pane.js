/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import './store-panel.js';

const mainTemplate = `
  <style>
    #error {
      display: none;
      margin-top: 30px;
    }
  </style>
  <div id="arcs"></div>
  <error-panel id="error"></error-panel>`;

export class OutputPane extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = mainTemplate;

    this.arcs = shadowRoot.getElementById('arcs');
    this.error = shadowRoot.getElementById('error');
  }

  reset() {
    while (this.arcs.firstChild) {
      this.arcs.firstChild.disposeArc();
      this.arcs.removeChild(this.arcs.firstChild);
    }
    this.error.style.display = 'none';
    this.error.clear();
  }

  addArcPanel(arcId) {
    const arcPanel = document.createElement('arc-panel');
    this.arcs.appendChild(arcPanel);
    arcPanel.init(this, arcId);
    return arcPanel;
  }

  removeArcPanel(arcPanel) {
    this.arcs.removeChild(arcPanel);
  }

  showError(header, message = '') {
    this.error.style.display = 'block';
    this.error.show(header, message);
  }
}

const arcTemplate = `
  <style>
    .spacer {
      margin-top: 30px;
    }
    #arc-label {
      font-family: Arial;
      font-size: 13px;
      font-style: italic;
    }
    #kill {
      cursor: pointer;
      float: right;
      margin-right: 8px;
    }
    #slots:not([fullscreen]) {
      margin: 4px 0 12px 0;
      border: 1px solid;
      position: relative;
    }
    #slots[fullscreen] {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: white;
      min-height: 100vh;
      z-index: 1;
    }
    #slots #expand {
      top: 0;
      right: 2px;
      font-size: 16px;
      position: absolute;
      cursor: pointer;
    }
    #slots #expand::before {
      content: '↗';
    }
    #slots[fullscreen] #expand::before {
      content: '↙';
    }
    #arc-modal {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
      pointer-events: none;
    }
    .controls-container {
      display: inline-block;
      vertical-align: top;
    }
    .control {
      display: none;
      cursor: pointer;
      font-size: 18px;
      padding: 4px 2px;
      border-radius: 8px;
    }
    #stores-collapse-all {
      color: #777;
      font-size: 14px;
      letter-spacing: -3px;
      margin-left: 1px;
    }
    .active {
      background: #80d2ff;
    }
    .control-panel {
      display: none;
      max-width: calc(100% - 80px);
      overflow: auto;
      margin: 4px 0 0 8px;
    }
    #serial {
      border: 1px dashed;
    }
    #serial pre {
      font-size: 11px;
      margin: 4px 8px;
    }
  </style>
  <div class="spacer">
    <span id="arc-label"></span>
    <span id="kill">✘</span>
  </div>
  <div id="slots">
    <div id="arc-toproot" slotid="rootslotid-toproot"></div>
    <div id="arc-root" slotid="rootslotid-root"></div>
    <div id="arc-modal" slotid="rootslotid-modal"></div>
    <div id="expand"/></div>
  </div>
  <span class="controls-container">
    <span id="stores-control" class="control">🗄</span>
    <span id="serial-control" class="control">📄</span>
    <br>
    <span id="stores-collapse-all" class="control">⮝⮝</span>
  </span>
  <div id="stores" class="control-panel">
    <div style="font-size: 15px; font-style: italic; color: grey; margin-bottom: 10px">
      Modifying entities is temporarily disabled while the dev shell is migrated to the new storage stack
    </div>
  </div>
  <div id="serial" class="control-panel">
    <pre></pre>
  </div>`;

class ArcPanel extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = arcTemplate;

    this.arcLabel = shadowRoot.getElementById('arc-label');
    this.arcToproot = shadowRoot.getElementById('arc-toproot');
    this.arcRoot = shadowRoot.getElementById('arc-root');
    this.arcModal = shadowRoot.getElementById('arc-modal');
    this.storesControl = shadowRoot.getElementById('stores-control');
    this.storesCollapseAll = shadowRoot.getElementById('stores-collapse-all');
    this.serialControl = shadowRoot.getElementById('serial-control');
    this.stores = shadowRoot.getElementById('stores');
    this.serial = shadowRoot.getElementById('serial');
    this.linkedArc = null;

    shadowRoot.getElementById('kill').addEventListener('click', this.kill.bind(this));
    this.storesControl.addEventListener('click', this.toggleStores.bind(this));
    this.storesCollapseAll.addEventListener('click', this.toggleAllCollapsed.bind(this));
    this.serialControl.addEventListener('click', this.toggleSerial.bind(this));

    const slots = shadowRoot.getElementById('slots');
    shadowRoot.getElementById('expand').addEventListener('click', () => {
      if (slots.hasAttribute('fullscreen')) {
        slots.removeAttribute('fullscreen');
      } else {
        slots.setAttribute('fullscreen', '');
      }
    });
  }

  init(host, arcId) {
    this.host = host;
    this.arcLabel.textContent = arcId.idTree[0];
  }

  attachArc(arc) {
    this.linkedArc = arc;
  }

  async arcInstantiated(description) {
    if (description) {
      this.arcLabel.textContent += ` - "${description.trim()}"`;
    }
    this.serialControl.style.display = 'inline-block';
    if (this.linkedArc._stores.length > 0) {
      this.storesControl.style.display = 'inline-block';
      for (const store of this.linkedArc._stores) {
        const storePanel = document.createElement('store-panel');
        this.stores.appendChild(storePanel);
        await storePanel.attach(await store.activate(), this.linkedArc);
      }
      this.storesCollapseAll.enabled = (this.linkedArc._stores.length > 1);
    }
  }

  toggleStores() {
    if (this.storesControl.classList.toggle('active')) {
      this.stores.style.display = 'inline-block';
      this.serial.style.display = 'none';
      this.serialControl.classList.remove('active');
    } else {
      this.stores.style.display = 'none';
    }
    if (this.storesCollapseAll.enabled) {
      this.storesCollapseAll.style.display = this.stores.style.display;
    }
  }

  toggleAllCollapsed() {
    let action;
    if (this.storesCollapseAll.textContent === '⮝⮝') {
      this.storesCollapseAll.textContent = '⮟⮟';
      action = 'hide';
    } else {
      this.storesCollapseAll.textContent = '⮝⮝';
      action = 'show';
    }
    for (const store of this.stores.children) {
      // TODO: remove 'if' when saving entities works
      if (store.collapse) store.collapse(action);
    }
  }

  async toggleSerial() {
    if (this.serialControl.classList.toggle('active')) {
      const text = await this.linkedArc.serialize();
      const cleaned = text.trim().replace(/ +\n/g, '\n').replace(/\n{2,}/g, '\n\n');
      this.serial.firstElementChild.textContent = cleaned;

      this.serial.style.display = 'inline-block';
      this.stores.style.display = 'none';
      this.storesControl.classList.remove('active');
    } else {
      this.serial.style.display = 'none';
    }
    if (this.storesCollapseAll.enabled) {
      this.storesCollapseAll.style.display = this.stores.style.display;
    }
  }

  showError(header, message = '') {
    const error = document.createElement('error-panel');
    this.arcRoot.appendChild(error);
    if (message.stack) {
      error.show(header, message.stack);
    } else {
      error.show(header, message);
    }
  }

  kill() {
    this.disposeArc();
    this.host.removeArcPanel(this);
  }

  disposeArc() {
    if (this.linkedArc) {
      this.linkedArc.dispose();
    }
  }
}

const errorTemplate = `
  <style>
    .container {
      color: red;
    }
    #header {
      font-family: Arial;
      font-style: italic;
      margin: 8px;
    }
    #message {
      overflow: auto;
      font-size: 12px;
      line-height: 1.5;
      margin: 0 0 8px 8px;
    }
  </style>
  <div class="container">
    <div id="header"></div>
    <pre id="message"></pre>
  </div>`;

class ErrorPanel extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = errorTemplate;

    this.header = shadowRoot.getElementById('header');
    this.message = shadowRoot.getElementById('message');
  }

  clear() {
    this.header.textContent = '';
    this.message.textContent = '';
  }

  show(header, message) {
    this.header.textContent = header;
    this.message.textContent = message;
  }
}

window.customElements.define('output-pane', OutputPane);
window.customElements.define('arc-panel', ArcPanel);
window.customElements.define('error-panel', ErrorPanel);
