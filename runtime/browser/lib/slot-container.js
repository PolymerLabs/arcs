'use strict';

let SlotContainer;

if (global.document) {
  SlotContainer = class extends HTMLElement {
    static subscribe(cb) {
      document.addEventListener('slot-container', e => {
        cb(e.details);
      });
    }
    connectedCallback() {
      document.dispatchEvent(
        new CustomEvent('slot-container', {
          detail: {
            kind: 'connected',
            name: this.getAttribute('name'),
            node: this
          }
        })
      );
    }
  }
  customElements.define('slot-container', SlotContainer);
} else {
  SlotContainer = { subscribe: () => null };
}

module.exports = SlotContainer;
