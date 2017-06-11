'use strict';

class ModelSelect extends HTMLElement {
  connectedCallback() {
    this.style.display = 'inline-block';
    this._requireSelect();
  }
  _requireSelect() {
    return this.select = this.select || this.appendChild(document.createElement('select'));
  }
  set options(options) {
    let select = this._requireSelect();
    select.textContent = '';
    options && options.forEach(o =>
      select.appendChild(
        Object.assign(document.createElement("option"), {
          value: o.value || o,
          text: o.text || o.value || o
        })
      )
    );
  }
}

customElements.define('model-select', ModelSelect);

module.exports = ModelSelect;