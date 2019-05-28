const storeTemplate = `
  <style>
    #save {
      display: inline-block;
      opacity: 0.4;
      margin: 0 6px 0 0;
    }
    #save.enabled {
      cursor: pointer;
      opacity: 1;
    }
    #header {
      display: inline;
      color: green;
      font-size: 12px;
      font-family: monospace;
    }
    #display {
      font-size: 11px;
      width: 99%;
      min-width: 600px;
      margin-top: 10px;
    }
    .fail {
      border: 1px solid red;
    }
    #error {
      color: red;
      font-style: italic;
      line-height: 1.5;
      margin: 4px 0 16px 0;
    }
    @keyframes flash-bgnd {
      from { background: #f2e6ff; }
    }
    .flash {
      animation: flash-bgnd 0.8s ease-in;
    }
  </style>
  <div>
    <span id="save">💾</span>
    <span id="header"></span>
  </div>
  <textarea id="display" spellcheck="false" placeholder="<no data>"></textarea>
  <pre id="error"></pre>`;

export class StorePanel extends HTMLElement {
  connectedCallback() {
    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = storeTemplate;

    this.saveBtn = shadowRoot.getElementById('save');
    this.header = shadowRoot.getElementById('header');
    this.display = shadowRoot.getElementById('display');
    this.error = shadowRoot.getElementById('error');
    this.store = null;
    this.updateCallback = null;

    this.display.addEventListener('input', () => this.saveBtn.classList.add('enabled'));
    this.display.addEventListener('animationend', () => this.display.classList.remove('flash'));
    this.saveBtn.addEventListener('click', this.save.bind(this));
  }

  async attach(store) {
    this.store = store;
    this.header.textContent = store.name || store.id;
    await this.update(true);
    this.updateCallback = () => this.update(false);
    store.on('change', this.updateCallback, this);
  }

  async update(local) {
    if (this.store.toList) {
      this.data = await this.store.toList();
      if (this.data && this.data.length === 0) {
        this.data = null;
      }
    } else {
      this.data = await this.store.get();
    }
    if (this.data !== null) {
      const json = JSON.stringify(this.data, null, 2);
      this.display.value = json;
      this.display.rows = Math.min(json.match(/\n/g).length + 1, 20);
    } else {
      this.display.value = '';
      this.display.rows = 2;
    }
    this.error.textContent = '';
    this.display.classList.remove('fail');
    if (!local) {
      this.display.classList.add('flash');
    }
  }

  async save() {
    if (!this.saveBtn.classList.contains('enabled')) {
      return;
    }
    this.saveBtn.classList.remove('enabled');
    this.store.off('change', this.updateCallback);
    const ok = await this.writeToStore(this.display.value.trim());
    this.store.on('change', this.updateCallback, this);
    if (ok) {
      this.update(true);
    }
  }

  async writeToStore(value) {
    if (this.store.toList) {
      // Collections; we need to manually determine what to add and remove
      const json = (value.length > 0) ? this.parse(value) : [];
      if (json === null) {
        return false;
      }
      const delIds = new Set(this.data && this.data.map(e => e.id));
      for (const item of json) {
        if (!delIds.delete(item.id)) {
          await this.store.store(item, [String(Math.random()).slice(2)]);
        }
      }
      for (const id of delIds.values()) {
        await this.store.remove(id);
      }
    } else {
      // Singletons
      if (value.length === 0) {
        await this.store.clear();
      } else {
        const json = this.parse(value);
        if (json === null) {
          return false;
        }
        await this.store.set(json);
      }
    }
    return true;
  }

  parse(value) {
    try {
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
      this.display.classList.add('fail');
      return null;
    }
  }

  dispose() {
    if (this.updateCallback) {
      this.store.off('change', this.updateCallback);
    }
  }
}

window.customElements.define('store-panel', StorePanel);
