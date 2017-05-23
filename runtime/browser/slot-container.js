'use strict';

class SlotContainer extends HTMLElement {
  connectedCallback() {
    document.dispatchEvent(new CustomEvent('slot-container', {
      detail: {
        kind: 'connected',
        name: this.getAttribute('name'),
        node: this
      }
    }));
  }
}

customElements.define('slot-container', SlotContainer);