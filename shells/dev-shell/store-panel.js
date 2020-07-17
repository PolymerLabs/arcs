/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {handleForActiveStore} from '../../build/runtime/storage/storage-ng.js';
import {CollectionHandle} from '../../build/runtime/storage/handle.js';
import {Entity} from '../../build/runtime/entity.js';

const storeTemplate = `
  <style>
    #save {
      display: inline-block;
      opacity: 0.4;
      margin-right: 6px;
    }
    #save.enabled {
      cursor: pointer;
      opacity: 1;
    }
    #header {
      min-width: 540px;
    }
    #store-label {
      display: inline;
      color: green;
      font-size: 12px;
      font-family: monospace;
    }
    .buttons {
      cursor: pointer;
      float: right;
    }
    #schema-btn {
      color: #555;
      margin-right: 6px;
      font-family: monospace;
      font-size: 14px;
      padding: 0 2px;
      border: 1px solid #777;
    }
    #collapse-btn {
      color: #777;
    }
    #spacer {
      margin: 10px 0 16px 0;
    }
    #container {
      display: flex;
    }
    #contents {
      flex: 1;
      font-size: 11px;
    }
    .fail {
      border: 1px solid red;
    }
    #schema {
      display: none;
      color: #555;
      font-size: 11px;
      margin: 0;
      padding: 4px 6px;
      border: 1px solid #a9a9a9;
    }
    .active {
      background: #80d2ff;
    }
    #error {
      color: red;
      font-style: italic;
      line-height: 1.5;
      margin: 4px 0 0 0;
    }
    @keyframes flash-bgnd {
      from { background: #f2e6ff; }
    }
    .flash {
      animation: flash-bgnd 0.8s ease-in;
    }
  </style>
  <div id="header">
    <span id="save">💾</span>
    <span id="store-label"></span>
    <span class="buttons">
      <span id="schema-btn">S</span>
      <span id="collapse-btn">⮝</span>
    </span>
  </div>
  <div id="spacer">
    <div id="container">
      <textarea id="contents" spellcheck="false" placeholder="<no data>"></textarea>
      <pre id="schema"></pre>
    </div>
    <pre id="error"></pre>
  </div>`;

export class StorePanel extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = storeTemplate;

    this.header = shadowRoot.getElementById('header');
    this.saveBtn = shadowRoot.getElementById('save');
    this.storeLabel = shadowRoot.getElementById('store-label');
    this.schemaBtn = shadowRoot.getElementById('schema-btn');
    this.collapseBtn = shadowRoot.getElementById('collapse-btn');
    this.container = shadowRoot.getElementById('container');
    this.contents = shadowRoot.getElementById('contents');
    this.schema = shadowRoot.getElementById('schema');
    this.error = shadowRoot.getElementById('error');
    this.store = null;
    this.handle = null;
    this.updateCallback = null;
    this.data = null;

    this.saveBtn.addEventListener('click', this.save.bind(this));
    this.schemaBtn.addEventListener('click', this.toggleSchema.bind(this));
    this.collapseBtn.addEventListener('click', () => this.collapse('toggle'));
    this.header.addEventListener('animationend', () => this.header.classList.remove('flash'));
    this.contents.addEventListener('animationend', () => this.contents.classList.remove('flash'));
    this.contents.addEventListener('input', () => this.saveBtn.classList.add('enabled'));
    this.contents.addEventListener('keypress', this.interceptCtrlEnter.bind(this));
  }

  async attach(store, arc) {
    this.store = store;
    this.handle = await handleForActiveStore(store, arc);
    this.storeLabel.textContent = store.storageKey;
    const schema = store.type.getEntitySchema();
    this.schema.textContent = schema ? schema.toManifestString() : '// Unknown schema';
    this.updateCallback = () => this.update(false);
    this.store.on(this.updateCallback);
  }

  interceptCtrlEnter(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
      this.save();
      event.preventDefault();
    }
  }

  toggleSchema() {
    if (this.schemaBtn.classList.toggle('active')) {
      this.schema.style.display = 'block';
    } else {
      this.schema.style.display = '';
    }
  }

  collapse(action) {
    if (action === 'toggle') {
      action = (this.collapseBtn.textContent === '⮟') ? 'show' : 'hide';
    }
    if (action === 'show') {
      this.collapseBtn.textContent = '⮝';
      this.container.style.display = '';
      this.error.style.display = '';
    } else {
      this.collapseBtn.textContent = '⮟';
      this.container.style.display = 'none';
      this.error.style.display = 'none';
    }
  }

  async update(local) {
    let items;
    if (this.handle instanceof CollectionHandle) {
      items = [...await this.handle.fetchAll()];
    } else {
      const item = await this.handle.fetch();
      items = item ? [item] : [];
    }
    this.data = {};
    if (items.length > 0) {
      items.forEach(e => this.data[Entity.id(e)] = Entity.toLiteral(e));
      // Strip enclosing brackets and remove indent before displaying.
      const json = JSON.stringify(this.data, null, 2).slice(4, -1).replace(/\n {2}/g, '\n');
      this.contents.value = json;
      this.contents.rows = Math.min((json.match(/\n/g) || []).length + 1, 20);
    } else {
      this.contents.value = '';
      this.contents.rows = 2;
    }
    this.error.textContent = '';
    this.contents.classList.remove('fail');
    if (!local) {
      if (this.container.style.display === 'none') {
        this.header.classList.add('flash');
      } else {
        this.contents.classList.add('flash');
      }
    }
  }

  async save() {
    if (!this.saveBtn.classList.contains('enabled')) {
      return;
    }
    this.store.off(this.updateCallback);
    const ok = await this.writeToStore(this.contents.value.trim());
    this.store.on(this.updateCallback);
    if (ok) {
      this.saveBtn.classList.remove('enabled');
      this.update(true);
    }
  }

  async writeToStore(value) {
    if (this.handle instanceof CollectionHandle) {
      // Collections; we need to manually determine the update ops
      const json = (value.length > 0) ? this.parse(value) : [];
      if (json === null) {
        return false;
      }
      const curIds = new Set([...Object.keys(this.data)]);
      for (const [id, data] of Object.entries(json)) {
        let entity = null;
        if (curIds.delete(id)) {
          if (JSON.stringify(this.data[id]) !== JSON.stringify(data)) {
            // Existing entity data has been changed.
            entity = this.makeEntity(id, data);
            await this.handle.remove(entity);
          }
        } else {
          // A new entity has been added.
          entity = this.makeEntity(id, data);
        }
        if (entity) {
          await this.handle.add(entity, [String(Math.random()).slice(2)]);
        }
      }
      for (const id of curIds.values()) {
        await this.handle.remove(this.makeEntity(id, {}));
      }
    } else {
      // Singletons
      if (value.length === 0) {
        await this.handle.clear();
      } else {
        const json = this.parse(value);
        if (json === null) {
          return false;
        }
        const [id, data] = Object.entries(json)[0];
        await this.handle.set(this.makeEntity(id, data));
      }
    }
    return true;
  }

  // TODO: use entity mutation when implemented
  makeEntity(id, data) {
    const entity = new this.handle.entityClass(data);
    Entity.identify(entity, id, null);
    return entity;
  }

  parse(value) {
    try {
      // Restore enclosing brackets that were stripped for display.
      value = '{' + value + '}';
      return JSON.parse(value);
    } catch (err) {
      let msg = err.message.replace(/\n/g, '\\n');
      const match = msg.match(/at position ([0-9]+)/);
      if (match) {
        const i = Number(match[1]);
        const p = value.lastIndexOf('\n', i - 1) + 1;
        let q = value.indexOf('\n', i);
        if (q == -1) {
          q = value.length;
        }
        const num = value.slice(0, i).match(/\n/g).length + 1;
        const line = value.slice(p, q);
        const spacer = ' '.repeat(Math.max(i - p, -1000));
        msg = msg.replace(match[0], `in line ${num}`) + `:\n${line}\n${spacer}^`;
      }
      this.error.textContent = msg;
      this.contents.classList.add('fail');
      return null;
    }
  }

  dispose() {
    if (this.updateCallback) {
      this.store.off(this.updateCallback);
    }
  }
}

window.customElements.define('store-panel', StorePanel);
